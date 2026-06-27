# Microsoft Store License Verification Integration

This guide details how to verify Microsoft Store application and add-on (IAP) licenses in your Tauri backend.

## 1. Rust Configuration (`src-tauri/Cargo.toml`)

Enable the Microsoft `windows` crate with `Services_Store` and `Foundation` features:

```toml
[dependencies]
windows = { version = "0.58", features = ["Services_Store", "Foundation"] }
```

## 2. Tauri Command Implementation (`src-tauri/src/lib.rs` / `main.rs`)

Create the Rust command to fetch the license asynchronously using the Windows Runtime (WinRT) APIs:

```rust
use windows::Services::Store::StoreContext;

#[tauri::command]
async fn check_microsoft_store_license() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let context = StoreContext::GetDefault().map_err(|e| e.to_string())?;
        let app_license = context.GetAppLicenseAsync()
            .map_err(|e| e.to_string())?
            .await
            .map_err(|e| e.to_string())?;

        let is_active = app_license.IsActive().map_err(|e| e.to_string())?;
        Ok(is_active)
    }

    #[cfg(not(target_os = "windows"))]
    {
        Ok(true)
    }
}
```

Register the command in your builder:

```rust
tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        check_microsoft_store_license
    ])
```

## 3. Frontend invocation (`src/App.tsx` or startup logic)

Check the license when the application boots:

```typescript
import { invoke } from "@tauri-apps/api/core";

async function verifyLicense() {
  try {
    const isLicenseActive = await invoke<boolean>("check_microsoft_store_license");
    if (isLicenseActive) {
      console.log("App license is valid.");
    } else {
      console.warn("No active license found.");
    }
  } catch (error) {
    console.error("Failed to query Microsoft Store license:", error);
  }
}
```
