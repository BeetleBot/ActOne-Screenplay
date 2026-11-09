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


#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_deserialize_ollama_tags() {
        let json = r#"{
            "models": [
                {"name": "llama3:latest"},
                {"name": "mistral:7b"},
                {"name": "gemma2:latest"}
            ]
        }"#;

        let parsed: OllamaTagsResponse = serde_json::from_str(json).unwrap();
        let models: Vec<String> = parsed
            .models
            .unwrap_or_default()
            .into_iter()
            .map(|m| m.name.trim_end_matches(":latest").to_string())
            .collect();

        assert_eq!(models, vec!["llama3", "mistral:7b", "gemma2"]);
    }

    #[test]
    fn test_deserialize_empty_or_null_models() {
        let json = r#"{"models": null}"#;
        let parsed: OllamaTagsResponse = serde_json::from_str(json).unwrap();
        assert!(parsed.models.is_none());

        let empty_json = r#"{"models": []}"#;
        let parsed_empty: OllamaTagsResponse = serde_json::from_str(empty_json).unwrap();
        assert_eq!(parsed_empty.models.unwrap().len(), 0);
    }
}
