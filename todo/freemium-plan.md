# Freemium & Microsoft Store Integration Plan

This plan details the technical steps to transform ActOne into a freemium application using a "Durable" Microsoft Store Add-on.

## 1. Product ID

Create a Durable add-on in Microsoft Partner Center with Store ID `ActOnePremium` (or similar). This ID will be used in the code to check license status and trigger purchases.

## 2. Free vs Premium Features

### Free Tier
- Core Fountain editor + syntax highlighting
- Fountain Export
- PDF Export (with forced watermark)
- Notepad
- Markers
- Zen Mode
- Title Page
- Search & Replace
- Outline sidebar
- **1 free theme**: "Classic Adaptive" (adaptive light/dark, follows system preference)
- **1 free ambient sound**: "Light Rain"
- Tutorials: Basic UI, Theming, Basic Fountain Syntax
- Settings: General tab + Editor tab (except "Hide the Tags" toggle locked)

### Premium Tier (locked behind one-time "Lifetime Access" purchase)
- **Sidebar tabs**: Scripts, Tasks (Todo), Sprint, Parking, Snapshots
- **Modals & Windows**: Production Breakdown (Tags), Theme Manager, Structure Import, X-Ray (Statistics/Characters)
- **Exports**: FDX, Fade In
- **Ambient sounds**: Coffee Shop, Wind in Trees, Ocean Waves
- **All other themes**: Catppuccin, Pitch, Pastel, Custom themes
- **Settings**: Snapshots tab entirely, "Hide the Tags" toggle in Editor tab
- **Tutorials**: Advanced Syntax, Tagging Pt.1

## 3. Watermarking (PDF Exports)

For users without the premium add-on, PDF exports will include:
- The text **"Created with ActOne free version"** at the bottom of every page.
- The **ActOne logo** stamped in the middle of every page at **0.4 (40%) opacity**.
- User watermark settings are ignored when `isPremium` is false; the forced watermark is always applied.

## 4. Implementation Steps

### Step 1 — Rust Backend: License Commands

**File: `src-tauri/src/lib.rs`**

1. **Rename `check_microsoft_store_license` → `check_premium_status`**:
   - On Windows (non-debug): Query `StoreContext.GetAppLicenseAsync()`, then look inside `AppLicense.AddOnLicenses` for the `ActOnePremium` add-on ID. Check `IsActive` on the add-on license.
   - Return `bool: isPremium`.
   - Non-Windows / debug builds: return `true`.

2. **Add `purchase_premium` command**:
   - On Windows (non-debug): Call `StoreContext.RequestPurchaseAsync("ActOnePremium")`. Return success/failure.
   - Non-Windows / debug builds: return `Ok(true)` (no-op).

3. **Remove kill-switch from `setup()`**:
   - Delete the block (~lines 648-674) that calls `std::process::exit(1)` on license failure. The app should no longer close itself — it degrades gracefully to free mode.

4. **Modify `export_pdf` and `generate_pdf_bytes`**:
   - Add `is_premium: bool` parameter.
   - When `false`: ignore user watermark settings. Force overlay "Created with ActOne free version" footer text + ActOne logo center image at 40% opacity.
   - When `true`: use user watermark settings as before.

5. **Register new commands** in `invoke_handler`.

### Step 2 — React Frontend: License Context

**New file: `src/context/LicenseContext.tsx`**

- Fetches `check_premium_status` on mount (via Tauri invoke).
- Exposes `{ isPremium: boolean, purchasePremium: () => Promise<void>, loading: boolean }`.
- `purchasePremium()` calls the Rust `purchase_premium` command, then re-checks status.
- Outside Tauri (dev/test), `isPremium` defaults to `true`.

**Edit: `src/context/AppProviders.tsx`**

- Import `LicenseProvider` and wrap the component tree.

### Step 3 — React Frontend: Remove Kill-Switch

**Edit: `src/App.tsx`**

- Delete lines 240-268 (the `useEffect` that verifies base license and closes the app).

### Step 4 — React Frontend: Premium Paywall Modal

**New file: `src/components/PremiumPaywallModal.tsx`**

- Clean, branded modal listing premium features.
- "Unlock Now" button → calls `purchasePremium()` → shows loading spinner, then success/error.
- "Restore Purchase" secondary button.
- "Maybe Later" dismiss button.
- Uses the custom modal context or a standard MUI Dialog.

### Step 5 — React Frontend: Activity Bar Locking

**Edit: `src/components/layout/ActivityBar.tsx`**

- Import `useLicense` from LicenseContext.
- Define premium tab IDs: `["scripts", "todo", "sprint", "parking", "snapshots"]`.
- When `!isPremium`:
  - Render a lock icon overlay on premium tab buttons.
  - Tooltip shows "Premium Feature" instead of the tab name.
  - Clicking opens `PremiumPaywallModal` instead of navigating to the tab.

### Step 6 — React Frontend: Theme Gating

**Edit: `src/components/layout/ActivityBar.tsx`**

- When `!isPremium`:
  - Show **only** the CLASSIC category, and within that, **only** the adaptive swatch (not Classic Light or Classic Dark).
  - Hide Catppuccin, Pitch, Pastel, and Custom categories entirely.
  - Lock the "Open Theme Manager" button → opens paywall modal.

### Step 7 — React Frontend: Export Modal Locking

**Edit: `src/components/ExportModal.tsx`**

- Import `useLicense`.
- FDX and Fade In format options: show with lock icon + "(Premium)" label.
- Disable selection for these formats. Show tooltip "Upgrade to unlock FDX/Fade In export".
- Add a prominent "Unlock Premium" button in the modal's footer area.

### Step 8 — React Frontend: Settings Window Gating

**Edit: `src/components/SettingsWindow.tsx`**

- Import `useLicense`.
- **Snapshots tab**: If `!isPremium`, show a lock overlay with "Upgrade to enable Snapshots" message instead of the settings content.
- **Editor tab → "Hide the Tags" toggle**: Disable with lock icon when `!isPremium`.

### Step 9 — React Frontend: Tutorials Gating

**Edit: `src/components/TutorialsWindow.tsx`**

- Import `useLicense`.
- Hide "Advanced Syntax" and "Tagging Pt.1" tutorial cards when `!isPremium`.
- Show them with a lock overlay and "Premium Feature" message instead.

### Step 10 — React Frontend: Welcome Screen Badge

**Edit: `src/components/WelcomeScreen.tsx`**

- Import `useLicense`.
- When `!isPremium`, show a "FREE" badge next to the app logo.
- Premium users see a "PREMIUM" badge.

### Step 11 — React Frontend: Ambient Sound Gating

**Edit: `src/components/AmbientPanel.tsx`**

- Import `useLicense`.
- "Light Rain" is always playable (free).
- Coffee Shop, Wind in Trees, Ocean Waves: show with lock icon. Clicking → opens paywall modal.

### Step 12 — React Frontend: X-Ray / Statistics / Characters Gating

**Edit: `src/components/XrayWindow.tsx` and trigger points**

- Gate the entire X-Ray window behind premium. If `!isPremium`, show a paywall overlay inside the window instead of the analysis content.
- **StatusBar.tsx**: The X-Ray button/icon shows with a lock when `!isPremium`. Clicking opens paywall.
- **CommandPalette.tsx**: The "Open X-Ray Analysis..." action shows as locked when `!isPremium`.
- **ModalManager.tsx**: Gate `openXrayWindow` callback.

### Step 13 — React Frontend: Premium Modal Gating

**Edit: trigger points for these modals:**

- **Production Breakdown** (`onOpenBreakdownModal` in `ActivityBar.tsx`): Check `isPremium` → open paywall if not premium.
- **Theme Manager** (`onOpenThemeManagerModal` in `ActivityBar.tsx`): Already gated in Step 6.
- **Structure Import** (`onOpenStructureModal` in `CommandPalette.tsx` and `ModalManager.tsx`): Check `isPremium` → open paywall if not premium.

### Step 14 — Microsoft Partner Center

1. Create a **Durable add-on** named "ActOne Premium" with Store ID `ActOnePremium`.
2. Set price (e.g., $14.99 USD one-time purchase).
3. In the app submission, configure the base app as "Free" and the add-on as the monetization.
4. Submit both the add-on and the app update for certification together.

## 5. UI Patterns for Locked Features

All locked features follow a consistent pattern:
1. **Visual indicator**: Lock icon (🔒) displayed on the UI element.
2. **Tooltip**: "Premium Feature" on hover.
3. **Intercept action**: Clicking opens `PremiumPaywallModal` instead of the feature.
4. **Paywall modal**: Lists premium features, shows "Unlock Now" button, can be dismissed.
