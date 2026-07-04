# Licensing Commands

## `check_microsoft_store_license`

Windows-only Microsoft Store license verification.

```typescript
invoke<boolean>("check_microsoft_store_license");
```

**Returns:**
- **Windows:** `true` if active license found, `false` otherwise
- **Other platforms:** Always returns `true`

**Implementation:** Uses `windows::Services::Store::StoreContext` WinRT API to query `GetAppLicenseAsync()`.

**Startup validation:** On Windows release builds, this command is called during app initialization. If the license is invalid, an error dialog is shown and the app exits with code 1.
