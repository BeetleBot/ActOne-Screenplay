use super::types::{Message, ProviderConfig};
use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::sync::LazyLock;
use std::time::Duration;

static CLIENT: LazyLock<reqwest::Client> = LazyLock::new(|| {
    reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(15))
        .timeout(Duration::from_secs(600))
        .build()
        .expect("HTTP client")
});

#[derive(Clone, Serialize, Deserialize, Default, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Completion {
    pub text: String,
    pub input_tokens: Option<u64>,
    pub output_tokens: Option<u64>,
    pub finish_reason: String,
}

pub fn request_body(
    config: &ProviderConfig,
    messages: &[Message],
    temperature: Option<f64>,
    output: usize,
    schema: Option<Value>,
) -> Result<(String, Value), String> {
    if config.model.trim().is_empty() {
        return Err("Choose an AI model.".into());
    }
    if config.provider != "ollama" && config.provider != "openai-compatible" {
        return Err("AI is disabled.".into());
    }
    let mut url =
        reqwest::Url::parse(config.endpoint.trim()).map_err(|_| "Invalid AI endpoint.")?;
    if !matches!(url.scheme(), "http" | "https")
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err("Use an HTTP or HTTPS endpoint without credentials in the URL.".into());
    }
    let base = config.endpoint.trim().trim_end_matches('/');
    if config.provider == "ollama" {
        let mut body = json!({"model":config.model,"messages":messages,"stream":true,"options":{"num_predict":output,"num_ctx":config.context_tokens}});
        if let Some(temp) = temperature {
            body["options"]["temperature"] = json!(temp);
        }
        if let Some(schema) = schema {
            body["format"] = schema;
        }
        return Ok((format!("{base}/api/chat"), body));
    }
    let endpoint = if base.ends_with("/chat/completions") {
        base.to_string()
    } else {
        format!("{base}/chat/completions")
    };
    url = reqwest::Url::parse(&endpoint).map_err(|_| "Invalid endpoint.")?;
    let official = url.host_str() == Some("api.openai.com");
    let mut body = json!({"model":config.model,"messages":messages,"stream":true});
    if official {
        body["max_completion_tokens"] = json!(output);
        body["stream_options"] = json!({"include_usage":true});
    } else {
        body["max_tokens"] = json!(output);
    }
    let reasoning = config.model.starts_with('o')
        || config.model.starts_with("gpt-5")
        || config.model.starts_with("gpt-6");
    if !reasoning {
        if let Some(temp) = temperature {
            body["temperature"] = json!(temp);
        }
    }
    if official {
        if let Some(schema) = schema {
            body["response_format"] = json!({"type":"json_schema","json_schema":{"name":"urai_result","strict":true,"schema":schema}});
        }
    }
    Ok((endpoint, body))
}

#[derive(Default)]
pub struct Decoder {
    buffer: Vec<u8>,
    pub result: Completion,
    done: bool,
}
impl Decoder {
    pub fn push(
        &mut self,
        bytes: &[u8],
        local: bool,
        emit: &mut impl FnMut(&str),
    ) -> Result<(), String> {
        self.buffer.extend_from_slice(bytes);
        if self.buffer.len() > 8 * 1024 * 1024 {
            return Err("AI response exceeded the stream buffer limit.".into());
        }
        while let Some(pos) = self.buffer.iter().position(|b| *b == b'\n') {
            let line: Vec<u8> = self.buffer.drain(..=pos).collect();
            self.line(&line, local, emit)?;
        }
        Ok(())
    }
    fn line(
        &mut self,
        bytes: &[u8],
        local: bool,
        emit: &mut impl FnMut(&str),
    ) -> Result<(), String> {
        let line = std::str::from_utf8(bytes)
            .map_err(|_| "Invalid UTF-8 in AI response.")?
            .trim();
        if line.is_empty() {
            return Ok(());
        }
        let payload = if local {
            line
        } else if let Some(data) = line.strip_prefix("data:") {
            data.trim()
        } else {
            return Ok(());
        };
        if payload == "[DONE]" {
            self.done = true;
            return Ok(());
        }
        let event: Value =
            serde_json::from_str(payload).map_err(|_| "Invalid JSON in AI response.")?;
        if let Some(error) = event.get("error") {
            return Err(error
                .get("message")
                .and_then(Value::as_str)
                .or(error.as_str())
                .unwrap_or("AI stream error.")
                .to_string());
        }
        let content = if local {
            event.pointer("/message/content")
        } else {
            event.pointer("/choices/0/delta/content")
        };
        if let Some(text) = content.and_then(Value::as_str) {
            self.result.text.push_str(text);
            emit(text);
        }
        if self.result.text.len() > 4 * 1024 * 1024 {
            return Err("AI output exceeded the size limit.".into());
        }
        if local {
            if event["done"] == true {
                self.done = true;
                self.result.finish_reason =
                    event["done_reason"].as_str().unwrap_or("stop").to_string();
            }
            self.result.input_tokens = event["prompt_eval_count"]
                .as_u64()
                .or(self.result.input_tokens);
            self.result.output_tokens = event["eval_count"].as_u64().or(self.result.output_tokens);
        } else {
            if event
                .pointer("/choices/0/delta/refusal")
                .and_then(Value::as_str)
                .is_some()
            {
                return Err(
                    "The model declined this request. Try a different instruction or model.".into(),
                );
            }
            if let Some(reason) = event
                .pointer("/choices/0/finish_reason")
                .and_then(Value::as_str)
            {
                self.result.finish_reason = reason.into();
                self.done = true;
            }
            self.result.input_tokens = event
                .pointer("/usage/prompt_tokens")
                .and_then(Value::as_u64)
                .or(self.result.input_tokens);
            self.result.output_tokens = event
                .pointer("/usage/completion_tokens")
                .and_then(Value::as_u64)
                .or(self.result.output_tokens);
        }
        Ok(())
    }
    pub fn finish(
        mut self,
        local: bool,
        emit: &mut impl FnMut(&str),
    ) -> Result<Completion, String> {
        if !self.buffer.is_empty() {
            let rest = std::mem::take(&mut self.buffer);
            self.line(&rest, local, emit)?;
        }
        if !self.done {
            return Err("AI connection ended before the response completed. Your source text has not been changed.".into());
        }
        if matches!(self.result.finish_reason.as_str(), "length" | "max_tokens") {
            return Err("AI output reached its token limit. Try a smaller selection.".into());
        }
        if self.result.text.trim().is_empty() {
            return Err("The model returned no text.".into());
        }
        Ok(self.result)
    }
}

pub async fn complete(
    config: &ProviderConfig,
    messages: &[Message],
    temperature: Option<f64>,
    output: usize,
    schema: Option<Value>,
    mut emit: impl FnMut(&str),
) -> Result<Completion, String> {
    let (url, body) = request_body(config, messages, temperature, output, schema)?;
    let mut request = CLIENT.post(url).json(&body);
    if config.provider != "ollama" && !config.api_key.is_empty() {
        request = request.bearer_auth(&config.api_key);
    }
    let response = request
        .send()
        .await
        .map_err(|_| "Cannot reach the AI provider. Check the endpoint and connection.")?;
    if !response.status().is_success() {
        let status = response.status().as_u16();
        if status == 429 {
            let seconds = response
                .headers()
                .get("retry-after")
                .and_then(|v| v.to_str().ok())
                .and_then(|v| v.parse::<u64>().ok())
                .unwrap_or(10)
                .min(120);
            return Err(format!("RATE_LIMIT:{seconds}"));
        }
        return Err(match status {
            401 | 403 => "AI credentials were rejected. Check your API key.".into(),
            404 => "AI model or endpoint was not found.".into(),
            _ => format!(
                "AI provider returned HTTP {status}. Check the model and supported settings."
            ),
        });
    }
    let mut decoder = Decoder::default();
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        decoder.push(
            &chunk.map_err(|_| "AI connection was interrupted.")?,
            config.provider == "ollama",
            &mut emit,
        )?;
    }
    decoder.finish(config.provider == "ollama", &mut emit)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn split_utf8_and_usage() {
        let wire = "{\"message\":{\"content\":\"வணக்கம்\"}}\n{\"done\":true,\"done_reason\":\"stop\",\"eval_count\":7}\n";
        for split in 0..wire.len() {
            let mut d = Decoder::default();
            d.push(&wire.as_bytes()[..split], true, &mut |_| {})
                .unwrap();
            d.push(&wire.as_bytes()[split..], true, &mut |_| {})
                .unwrap();
            let r = d.finish(true, &mut |_| {}).unwrap();
            assert_eq!(r.text, "வணக்கம்");
            assert_eq!(r.output_tokens, Some(7));
        }
    }
    #[test]
    fn partial_and_truncated_are_errors() {
        for wire in [
            "data: {\"choices\":[{\"delta\":{\"content\":\"partial\"}}]}\n",
            "data: {\"choices\":[{\"delta\":{\"content\":\"partial\"},\"finish_reason\":\"length\"}]}\n",
        ] {
            let mut d = Decoder::default();
            d.push(wire.as_bytes(), false, &mut |_| {}).unwrap();
            assert!(d.finish(false, &mut |_| {}).is_err());
        }
    }
    #[test]
    fn sse_complete() {
        let mut d = Decoder::default();
        d.push(b"data: {\"choices\":[{\"delta\":{\"content\":\"ok\"},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n",false,&mut |_|{}).unwrap();
        assert_eq!(d.finish(false, &mut |_| {}).unwrap().text, "ok");
    }
    #[test]
    fn endpoints_and_options() {
        let c = ProviderConfig {
            provider: "openai-compatible".into(),
            endpoint: "https://api.openai.com/v1".into(),
            model: "gpt-5".into(),
            api_key: "".into(),
            context_tokens: 8192,
        };
        let (url, b) = request_body(&c, &[], Some(0.3), 1024, None).unwrap();
        assert!(url.ends_with("/v1/chat/completions"));
        assert!(b.get("temperature").is_none());
        assert_eq!(b["max_completion_tokens"], 1024);
    }
}
#[cfg(test)]
mod transport_tests {
    use super::*;
    use std::io::{Read, Write};
    fn server(status: u16, body: &str) -> (ProviderConfig, std::thread::JoinHandle<String>) {
        let listener = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
        let endpoint = format!("http://{}", listener.local_addr().unwrap());
        let body = body.to_string();
        let task = std::thread::spawn(move || {
            let (mut socket, _) = listener.accept().unwrap();
            socket
                .set_read_timeout(Some(std::time::Duration::from_secs(3)))
                .unwrap();
            let mut bytes = Vec::new();
            let mut chunk = [0u8; 4096];
            loop {
                let n = socket.read(&mut chunk).unwrap();
                if n == 0 {
                    break;
                }
                bytes.extend_from_slice(&chunk[..n]);
                if let Some(pos) = bytes.windows(4).position(|w| w == b"\r\n\r\n") {
                    let headers = String::from_utf8_lossy(&bytes[..pos]);
                    let length = headers
                        .lines()
                        .find_map(|l| {
                            l.to_lowercase()
                                .strip_prefix("content-length:")
                                .and_then(|v| v.trim().parse::<usize>().ok())
                        })
                        .unwrap_or(0);
                    if bytes.len() >= pos + 4 + length {
                        break;
                    }
                }
            }
            write!(socket,"HTTP/1.1 {status} OK\r\nContent-Type: text/event-stream\r\nContent-Length: {}\r\nConnection: close\r\n\r\n",body.len()).unwrap();
            socket.write_all(body.as_bytes()).unwrap();
            String::from_utf8(bytes).unwrap()
        });
        (
            ProviderConfig {
                provider: "openai-compatible".into(),
                endpoint,
                model: "test".into(),
                api_key: "test-only-key".into(),
                context_tokens: 8192,
            },
            task,
        )
    }
    #[tokio::test]
    async fn real_http_stream_and_payload() {
        let (c, server) = server(
            200,
            "data: {\"choices\":[{\"delta\":{\"content\":\"வணக்கம்\"},\"finish_reason\":\"stop\"}]}\n\ndata: [DONE]\n\n",
        );
        let mut emitted = String::new();
        let result = complete(
            &c,
            &[Message {
                role: "user".into(),
                content: "Hello".into(),
            }],
            Some(0.1),
            256,
            None,
            |s| emitted.push_str(s),
        )
        .await
        .unwrap();
        assert_eq!(result.text, "வணக்கம்");
        assert_eq!(emitted, result.text);
        let wire = server.join().unwrap();
        assert!(wire.starts_with("POST /chat/completions "));
        assert!(wire.contains("test-only-key"));
        assert!(wire.contains("Hello"));
    }
    #[tokio::test]
    async fn http_errors_never_expose_response_secrets() {
        let (c, server) = server(401, "secret provider diagnostics test-only-key");
        let error = complete(&c, &[], None, 256, None, |_| {})
            .await
            .err()
            .unwrap();
        assert!(!error.contains("test-only-key"));
        assert!(error.contains("credentials"));
        server.join().unwrap();
    }
}
