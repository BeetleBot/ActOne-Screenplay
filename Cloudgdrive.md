# Google Drive Sync — Implementation Plan

## Architecture Decision

**Recommended approach: Tauri HTTP plugin + frontend OAuth flow**

```
User → Tauri Webview (React) → tauri-plugin-http → Google Drive API
                                        ↓
                              OAuth via system browser (tauri-plugin-opener)
                              Tokens stored in localStorage (encrypted via Rust)
```

---

### Phase 1: Enable HTTP & Update CSP

1. **Add `tauri-plugin-http` to `src-tauri/Cargo.toml`**
2. **Register plugin in `src-tauri/src/lib.rs`**
3. **Update CSP in `tauri.conf.json`** to allow `connect-src https://*.googleapis.com https://accounts.google.com`
4. **Add HTTP permissions to `capabilities/default.json`**

---

### Phase 2: OAuth Authentication

5. **Create `src/utils/gdrive.ts`** — all GDrive API calls
   - `getAuthUrl()` — builds Google OAuth URL (PKCE flow)
   - `exchangeCodeForToken(code)` — POST to Google token endpoint
   - `refreshToken()` — refresh access token
   - `isTokenValid()` — check expiry
   - Token storage: `localStorage` under `actone-gdrive-tokens`
   - Use `@tauri-apps/plugin-http` `fetch()` for all HTTP calls

6. **OAuth flow in `GDriveContext`**:
   - User clicks "Connect to Google Drive" in Settings
   - App opens system browser via `tauri-plugin-opener` `openUrl()` to Google auth URL
   - Google redirects to a localhost callback (or uses a custom scheme like `actone://oauth/callback`)
   - App captures the authorization code (via Tauri deep-link plugin or polling a local server)
   - Exchange code for tokens, store them

---

### Phase 3: GDrive API Layer

7. **Implement GDrive API calls in `gdrive.ts`**:
   - `listFiles(query?)` — GET `/drive/v3/files` with filters for `.fountain`/`.txt`/`.actone`
   - `getFile(fileId)` — GET `/drive/v3/files/{id}?alt=media`
   - `createFile(name, content, parentId?)` — POST `/drive/v3/files` with multipart upload
   - `updateFile(fileId, content)` — PATCH `/drive/v3/files/{id}` with media
   - `deleteFile(fileId)` — DELETE `/drive/v3/files/{id}`
   - `exportFile(fileId, mimeType)` — For Google Docs format export

8. **Handle token refresh transparently** — wrap all API calls in an interceptor that refreshes the token if 401 is received.

---

### Phase 4: GDrive Context & UI

9. **Create `src/context/GDriveContext.tsx`**:
   - State: `isConnected`, `userInfo`, `isSyncing`, `lastSyncTime`, `connectedFileIds` (maps local fileId ↔ gdrive fileId)
   - Actions: `connect()`, `disconnect()`, `openFromDrive()`, `saveToDrive()`, `syncToDrive()`
   - **Auto-save integration**: Hook into existing auto-save timer — when a file has a linked GDrive fileId, save to Drive alongside local save
   - **Conflict detection**: Compare `modifiedTime` from Drive meta with local `lastSavedTime`

10. **Register `GDriveProvider` in `AppProviders.tsx`** (inserted before FileProvider)

---

### Phase 5: Integrate into File Operations

11. **Modify `FileContext.tsx`**:
    - In `openFile()`: Add a "Google Drive" option in the file source selection
    - In `saveFile()`: If file has a linked `gdriveFileId`, also call `updateFile()` after local save
    - In `saveFileAs()`: Add "Save to Google Drive" as a destination option
    - Add `gdriveFileId` and `gdriveMeta` fields to `ScreenplayFile` interface
    - Add auto-sync to the existing auto-save timer

12. **Update `SettingsModal.tsx`**:
    - Add "Google Drive" settings section
    - "Connect to Google Drive" button → triggers OAuth
    - "Disconnect" button → clears tokens
    - Show connected account email
    - Auto-sync toggle

13. **New component: `GDriveFileBrowser.tsx`**:
    - Shows Drive files filtered by Fountain/actone types
    - Search/filter bar
    - "Open", "Delete", "Info" actions per file
    - Breadcrumb for folder navigation
    - Can be shown as a modal (similar to ExportModal) or as a sidebar panel

---

### Phase 6: Auto-Save & Sync

14. **Auto-sync mechanism**:
    - Extend the existing auto-save timer in `FileContext`
    - When a file has `gdriveFileId`, after local save, also fire a GDrive `updateFile` call
    - Debounce rapid saves (2s window)
    - Show a small sync indicator in StatusBar

15. **Sync status indicator** in `StatusBar.tsx`:
    - Icon: cloud (synced), cloud-upload (syncing), cloud-off (disconnected), cloud-error (sync failed)
    - Click to show sync details / retry

---

### Phase 7: Edge Cases & Polish

16. **Offline support**: Cache last-synced content; queue changes when offline; flush when back online
17. **Conflict resolution**: If file was modified externally, show diff dialog
18. **Error handling**: Retry with exponential backoff, notification on failure
19. **Security**: Encrypt tokens at rest using a Rust command (derive key from device ID)
20. **Loading states**: Skeleton loaders throughout Drive browser

---

### Files to Create

| File | Purpose |
|---|---|
| `src/utils/gdrive.ts` | GDrive API client, OAuth, token management |
| `src/context/GDriveContext.tsx` | React context for Drive state & actions |
| `src/components/GDriveFileBrowser.tsx` | Drive file picker modal |
| `src/components/GDriveSettings.tsx` | Settings panel for Drive connection |

### Files to Modify

| File | Changes |
|---|---|
| `src-tauri/Cargo.toml` | Add `tauri-plugin-http` |
| `src-tauri/src/lib.rs` | Register HTTP plugin, add encrypt/decrypt commands |
| `src-tauri/tauri.conf.json` | Update CSP for Google APIs |
| `src-tauri/capabilities/default.json` | Add HTTP permissions |
| `src/context/AppProviders.tsx` | Add GDriveProvider |
| `src/context/FileContext.tsx` | Add gdriveFileId to ScreenplayFile, hook auto-save |
| `src/components/SettingsModal.tsx` | Add Drive settings tab/section |
| `src/components/StatusBar.tsx` | Add sync status indicator |
| `package.json` | No new deps needed (fetch works via plugin) |

---

### Key Design Decisions

1. **Why not Rust backend with reqwest?** The OAuth flow and token management are inherently UI-driven. Keeping it in the frontend matches existing patterns (localStorage, file operations) and avoids duplicating the API layer in Rust.

2. **Why PKCE + system browser for OAuth?** This is the most secure approach for desktop apps. No client secret needed. The system browser has the user's Google session cookies.

3. **Why `tauri-plugin-http` over native `fetch`?** Because the CSP blocks all external connections. The plugin bypasses the webview CSP restrictions by proxying through the Rust backend.

4. **Why store gdriveFileId on ScreenplayFile?** This creates a 1:1 mapping between local tabs and remote files, making auto-sync trivial.

---

### Effort Estimate

| Phase | Estimated Time | Dependencies |
|---|---|---|
| Phase 1: HTTP plugin + CSP | 30 min | None |
| Phase 2: OAuth | 3-4 hours | Phase 1 |
| Phase 3: API layer | 2-3 hours | Phase 2 |
| Phase 4: Context + UI | 3-4 hours | Phase 3 |
| Phase 5: File ops integration | 4-5 hours | Phase 4 |
| Phase 6: Auto-save | 2-3 hours | Phase 5 |
| Phase 7: Polish | 3-4 hours | Phase 6 |
| **Total** | **~22 hours** | |

---

### Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Google OAuth redirect URI for desktop apps | Use `http://localhost:PORT/callback` with a temporary local server, or Tauri deep-link plugin with custom scheme |
| Token storage security | Encrypt tokens via Rust command using machine-specific key |
| Large file uploads | Use resumable upload for files >5MB |
| Rate limits | Cache file list (5 min TTL), batch operations |
| User revokes app access | Detect 403 errors, show re-connect prompt |
