use std::sync::Mutex;
static ACCESS: Mutex<()> = Mutex::new(());
const SERVICE: &str = "ink.iyal.actone.urai";
fn entry(id: &str) -> Result<keyring::Entry, String> {
    if id.is_empty() || id.len() > 100 || !id.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
    {
        return Err("Invalid credential identifier.".into());
    }
    keyring::Entry::new(SERVICE, id).map_err(|_| "Native credential storage is unavailable.".into())
}
#[tauri::command]
pub async fn urai_store_secret(id: String, secret: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move||{let _guard=ACCESS.lock().map_err(|_|"Credential store busy.")?;entry(&id)?.set_password(&secret).map_err(|_|"Cannot save the API key in your system credential store. Unlock the credential store and try again.".into())}).await.map_err(|_|"Credential operation failed.")?
}
#[tauri::command]
pub async fn urai_read_secret(id: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = ACCESS.lock().map_err(|_| "Credential store busy.")?;
        entry(&id)?.get_password().map_err(|_| {
            "Cannot read the saved API key. Unlock the credential store or enter the key again."
                .into()
        })
    })
    .await
    .map_err(|_| "Credential operation failed.")?
}

#[cfg(test)]
mod native_store_tests {
    #[test]
    #[ignore = "requires an unlocked native credential store"]
    fn temporary_credential_round_trip() {
        let id = format!(
            "regression-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        );
        let entry = keyring::Entry::new("ink.iyal.actone.urai.regression", &id).unwrap();
        entry
            .set_password("temporary-test-value")
            .expect("native store must be unlocked");
        let value = entry.get_password();
        let deleted = entry.delete_credential();
        assert_eq!(value.unwrap(), "temporary-test-value");
        deleted.unwrap();
    }
}
