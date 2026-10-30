use serde::Deserialize;

#[derive(Deserialize)]
struct OllamaTagsResponse {
    models: Option<Vec<OllamaModel>>,
}
#[derive(Deserialize)]
struct OllamaModel {
    name: String,
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
