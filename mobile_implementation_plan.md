# Mobile Implementation Plan: ActOne (Android)

This document outlines the strategy for adding Android support to the ActOne screenplay editor using Tauri v2.

## 1. Architectural Strategy
We will use a **Single Codebase, Multi-Target** approach.
- **Shared Logic:** The Fountain parser, state management (React Context), and CodeMirror editor core will remain shared.
- **Platform Segregation:**
    - **Backend (Rust):** Use `#[cfg(desktop)]` and `#[cfg(mobile)]` to handle platform-specific APIs (especially File I/O).
    - **Frontend (React):** Introduce a responsive layout system that switches between `DesktopView` and `MobileView` based on screen size or platform detection.

## 2. Environment Setup
### Prerequisites
- [ ] **Android Studio:** Installed with SDK Platform 35 and NDK.
- [ ] **Environment Variables:** `ANDROID_HOME` and `NDK_HOME` must be set.
- [ ] **Rust Targets:**
  ```bash
  rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android
  ```

## 3. Implementation Phases

### Phase 1: Android Initialization
- [ ] Run `npx tauri android init`.
- [ ] Update `src-tauri/tauri.conf.json` with Android-specific bundle identifiers and permissions.
- [ ] Verify the initial "Hello World" build on an Android emulator.

### Phase 2: Backend Refactoring (`src-tauri/`)
- [ ] **Platform-Conditional Commands:** Wrap all `rfd` (file dialog) calls in `#[cfg(desktop)]`.
- [ ] **Mobile File Handling:** Implement Android-compatible file picking. Since `rfd` isn't available, we will likely use:
    - `tauri-plugin-fs` for file system access.
    - `tauri-plugin-dialog` for mobile-native alerts.
- [ ] **PDF Export:** Modify `export_pdf` to use a system-native save location on Android rather than a desktop file picker.

### Phase 3: Frontend Adaptation (`src/`)
- [ ] **Layout Refactoring:**
    - Move current `MainLayout.tsx` content to `DesktopLayout.tsx`.
    - Create `MobileLayout.tsx` using a "Mobile First" approach (Drawer for navigation, Bottom toolbar for editor actions).
- [ ] **Editor Optimization:**
    - Ensure CodeMirror 6 is configured for touch responsiveness.
    - Add a mobile-specific "Quick Action Bar" above the virtual keyboard for common Fountain symbols (`@`, `.`, `INT.`, `EXT.`).
- [ ] **Platform Detection Hook:**
  ```typescript
  // src/hooks/usePlatform.ts
  export const isMobile = () => /* logic using @tauri-apps/api/os */;
  ```

### Phase 4: Feature Parity & UI/UX
- [ ] **Navigation:** Replace the permanent sidebar with a Swipeable Drawer (`@mui/material/Drawer`).
- [ ] **Modals:** Ensure `SettingsModal`, `ExportModal`, etc., are full-screen or responsive on small screens.
- [ ] **Themes:** Optimize MUI theme for touch targets (larger buttons, more spacing).

## 4. Specific Challenges for ActOne
1. **File System Access:** Android's Scoped Storage is stricter than desktop. We may need to use the `tauri-plugin-fs` carefully or implement a custom document picker.
2. **Keyboard Management:** CodeMirror needs to handle the "resize" event when the virtual keyboard appears to prevent the UI from being cut off.
3. **Fonts:** System fonts on Android (Roboto/Noto) differ from Desktop. Ensure `Courier Prime` is properly bundled and loaded in the Android assets.

## 5. Timeline (Estimated)
| Task | Effort |
| :--- | :--- |
| Initialization & Basic Build | 0.5 Day |
| Backend Refactoring (Platform Guards) | 1 Day |
| Frontend Mobile Layout & Navigation | 2 Days |
| Mobile File System Integration | 1 Day |
| Testing & Bug Fixing | 1 Day |

---
**Next Action:** Refactor `src-tauri/src/lib.rs` to allow compilation for Android.
