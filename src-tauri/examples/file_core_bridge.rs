//! Test-only process bridge for bidirectional browser/native compatibility checks.
use actone_lib::actone;
use base64::{Engine, engine::general_purpose::STANDARD};
use serde_json::{Value, json};
use std::io::{self, BufRead};

fn execute(request: Value) -> Result<Value, String> {
    match request["op"].as_str().unwrap_or("") {
        "unpack" => {
            let bytes = STANDARD
                .decode(request["bytes"].as_str().ok_or("missing bytes")?)
                .map_err(|e| e.to_string())?;
            serde_json::to_value(actone::unpack(&bytes, request["name"].as_str())?)
                .map_err(|e| e.to_string())
        }
        "strip" => Ok(json!(actone_lib::file_formats::strip_fountain(
            request["text"].as_str().ok_or("missing text")?,
            &serde_json::from_value(request["options"].clone()).map_err(|e| e.to_string())?,
        ))),
        "import" => Ok(json!(actone_lib::file_formats::import_script(
            request["name"].as_str().ok_or("missing name")?,
            &STANDARD
                .decode(request["bytes"].as_str().ok_or("missing bytes")?)
                .map_err(|e| e.to_string())?,
        )?)),
        "pack" => {
            let scripts: Vec<actone::ScriptInfo> =
                serde_json::from_value(request["scripts"].clone()).map_err(|e| e.to_string())?;
            Ok(json!(STANDARD.encode(actone::pack(
                &scripts,
                request["settings"].as_object().ok_or("missing settings")?
            )?)))
        }
        _ => Err("unknown operation".into()),
    }
}
fn main() {
    for line in io::stdin().lock().lines() {
        let result = line
            .map_err(|e| e.to_string())
            .and_then(|s| serde_json::from_str(&s).map_err(|e| e.to_string()))
            .and_then(execute);
        println!(
            "{}",
            match result {
                Ok(v) => json!({"ok":v}),
                Err(e) => json!({"error":e}),
            }
        );
    }
}
