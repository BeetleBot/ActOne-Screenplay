use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::sync::LazyLock;
use std::sync::Mutex;
use tauri::Emitter;

static CANCELLED_SESSIONS: LazyLock<Mutex<HashSet<String>>> =
    LazyLock::new(|| Mutex::new(HashSet::new()));

// ── Response types for parsing Ollama JSON ──────────────────────────────────

#[derive(Deserialize)]
struct OllamaTagsResponse {
    models: Option<Vec<OllamaModel>>,
}

#[derive(Deserialize)]
struct OllamaModel {
    name: String,
}

#[derive(Deserialize)]
struct OllamaChatLine {
    message: Option<OllamaMessageContent>,
    error: Option<String>,
}

#[derive(Deserialize)]
struct OllamaMessageContent {
    content: Option<String>,
}

// ── Event payload sent to the frontend during streaming ─────────────────────

#[derive(Clone, Serialize)]
struct OllamaChatChunk {
    session_id: String,
    delta: String,
}

// ── Message type received from the frontend ─────────────────────────────────

#[derive(Deserialize, Serialize)]
pub struct ChatMessage {
    role: String,
    content: String,
}

// ── Commands ────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn cancel_ollama_chat(session_id: String) {
    if let Ok(mut cancelled) = CANCELLED_SESSIONS.lock() {
        cancelled.insert(session_id);
    }
}

pub fn cancel_all_sessions() {
    if let Ok(mut cancelled) = CANCELLED_SESSIONS.lock() {
        // Mark cancellation flag globally for any active streams
        cancelled.insert("*".to_string());
    }
}

/// Health-check: GET {url}/ — returns true if Ollama is reachable.
#[tauri::command]
pub async fn ollama_check(url: String) -> bool {
    let target = format!("{}/", url.trim_end_matches('/'));
    match reqwest::Client::new()
        .get(&target)
        .timeout(std::time::Duration::from_millis(1500))
        .send()
        .await
    {
        Ok(resp) => resp.status().is_success(),
        Err(_) => false,
    }
}

/// List models: GET {url}/api/tags — returns model names with `:latest` stripped.
#[tauri::command]
pub async fn ollama_list_models(url: String) -> Result<Vec<String>, String> {
    let target = format!("{}/api/tags", url.trim_end_matches('/'));
    let resp = reqwest::Client::new()
        .get(&target)
        .timeout(std::time::Duration::from_secs(3))
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !resp.status().is_success() {
        return Err(format!("HTTP {}", resp.status()));
    }

    let data: OllamaTagsResponse = resp.json().await.map_err(|e| e.to_string())?;
    let models = data
        .models
        .unwrap_or_default()
        .into_iter()
        .map(|m| m.name.trim_end_matches(":latest").to_string())
        .collect();
    Ok(models)
}

/// Streaming chat: POST {url}/api/chat.
/// Emits `ollama-chat-chunk` events with `{ session_id, delta }` for each token.
/// Returns the full concatenated response text when the stream ends.
#[tauri::command]
pub async fn ollama_chat(
    app: tauri::AppHandle,
    session_id: String,
    url: String,
    model: String,
    messages: Vec<ChatMessage>,
    temperature: Option<f64>,
) -> Result<String, String> {
    if let Ok(mut cancelled) = CANCELLED_SESSIONS.lock() {
        cancelled.remove(&session_id);
    }

    let target = format!("{}/api/chat", url.trim_end_matches('/'));

    let mut body = serde_json::json!({
        "model": model,
        "messages": messages,
        "stream": true,
    });
    if let Some(temp) = temperature {
        body["options"] = serde_json::json!({ "temperature": temp });
    }

    let resp = reqwest::Client::new()
        .post(&target)
        .header("Content-Type", "application/json")
        .body(serde_json::to_string(&body).map_err(|e| e.to_string())?)
        .send()
        .await
        .map_err(|e| format!("Ollama request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let err = resp.text().await.unwrap_or_else(|_| "Unknown error".into());
        return Err(format!("Ollama error ({}): {}", status, err));
    }

    let mut full_text = String::new();
    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();

    while let Some(chunk) = stream.next().await {
        if let Ok(cancelled) = CANCELLED_SESSIONS.lock()
            && (cancelled.contains(&session_id) || cancelled.contains("*")) {
                return Err("Aborted".to_string());
            }
        let bytes = chunk.map_err(|e| format!("Stream error: {}", e))?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));

        // Process every complete line (newline-delimited JSON)
        while let Some(pos) = buffer.find('\n') {
            let line = buffer[..pos].to_string();
            buffer = buffer[pos + 1..].to_string();

            let trimmed = line.trim();
            if trimmed.is_empty() {
                continue;
            }

            if let Ok(parsed) = serde_json::from_str::<OllamaChatLine>(trimmed) {
                if let Some(err) = parsed.error {
                    return Err(format!("Ollama error: {}", err));
                }
                if let Some(msg) = parsed.message
                    && let Some(ref content) = msg.content
                        && !content.is_empty() {
                            full_text.push_str(content);
                            let _ = app.emit(
                                "ollama-chat-chunk",
                                OllamaChatChunk {
                                    session_id: session_id.clone(),
                                    delta: content.clone(),
                                },
                            );
                        }
            }
        }
    }

    // Flush anything left in the buffer
    let trimmed = buffer.trim();
    if !trimmed.is_empty()
        && let Ok(parsed) = serde_json::from_str::<OllamaChatLine>(trimmed) {
            if let Some(err) = parsed.error {
                return Err(format!("Ollama error: {}", err));
            }
            if let Some(msg) = parsed.message
                && let Some(ref content) = msg.content
                    && !content.is_empty() {
                        full_text.push_str(content);
                        let _ = app.emit(
                            "ollama-chat-chunk",
                            OllamaChatChunk {
                                session_id: session_id.clone(),
                                delta: content.clone(),
                            },
                        );
                    }
        }

    Ok(full_text)
}
