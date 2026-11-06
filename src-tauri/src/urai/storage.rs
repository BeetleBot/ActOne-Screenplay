use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{io::ErrorKind, path::Path, sync::Mutex};
use tauri::Manager;

static SESSION_WRITES: Mutex<()> = Mutex::new(());

fn read_snapshot(path: &Path) -> Result<Option<(Value, String)>, String> {
    let bytes = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.to_string()),
    };
    let revision = format!("{:x}", Sha256::digest(&bytes));
    let data = serde_json::from_slice(&bytes).map_err(|_| "Invalid conversation file.")?;
    Ok(Some((data, revision)))
}
pub(super) fn location(
    window: &tauri::WebviewWindow,
    key: &str,
) -> Result<std::path::PathBuf, String> {
    if key.is_empty() || key.len() > 8192 {
        return Err("Invalid conversation identity.".into());
    }
    let hash = format!("{:x}", Sha256::digest(key.as_bytes()));
    let dir = window
        .app_handle()
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("urai-conversations");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(format!("{hash}.json")))
}
#[tauri::command]
pub fn urai_load_sessions(
    window: tauri::WebviewWindow,
    key: String,
) -> Result<Option<Value>, String> {
    let path = location(&window, &key)?;
    let Some((data, revision)) = read_snapshot(&path)? else {
        return Ok(None);
    };
    if data["key"] != key {
        return Err("Conversation identity mismatch.".into());
    }
    Ok(Some(
        json!({"sessions": data["sessions"], "revision": revision}),
    ))
}
#[tauri::command]
pub fn urai_save_sessions(
    window: tauri::WebviewWindow,
    key: String,
    sessions: Value,
    expected_revision: Option<String>,
) -> Result<String, String> {
    if !sessions.is_array() {
        return Err("Invalid conversations.".into());
    }
    let text = serde_json::to_string(&json!({"key":key,"sessions":sessions}))
        .map_err(|e| e.to_string())?;
    if text.len() > 16 * 1024 * 1024 {
        return Err(
            "Conversation storage limit reached. Export or clear older conversations.".into(),
        );
    }
    commit_snapshot(
        &location(&window, &key)?,
        text,
        expected_revision.as_deref(),
    )
}

fn commit_snapshot(
    path: &Path,
    text: String,
    expected_revision: Option<&str>,
) -> Result<String, String> {
    let _guard = SESSION_WRITES
        .lock()
        .map_err(|_| "Conversation storage is unavailable.")?;
    let current = read_snapshot(path)?;
    if current.as_ref().map(|(_, revision)| revision.as_str()) != expected_revision {
        return Err("Conversation history changed in another window. Reopen UrAI to load the latest history.".into());
    }
    let revision = format!("{:x}", Sha256::digest(text.as_bytes()));
    super::super::write_file_atomically(path, text)?;
    Ok(revision)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stale_window_cannot_overwrite_committed_history() {
        let path =
            std::env::temp_dir().join(format!("actone-urai-storage-{}.json", std::process::id()));
        let first = commit_snapshot(&path, r#"{"sessions":[]}"#.into(), None).unwrap();
        let next =
            commit_snapshot(&path, r#"{"sessions":[{"id":"new"}]}"#.into(), Some(&first)).unwrap();
        assert!(commit_snapshot(&path, r#"{"sessions":[]}"#.into(), Some(&first)).is_err());
        let (saved, revision) = read_snapshot(&path).unwrap().unwrap();
        assert_eq!(revision, next);
        assert_eq!(saved["sessions"][0]["id"], "new");
        std::fs::remove_file(path).unwrap();
    }
}
