# Freemium & Microsoft Store Integration Plan

This plan details the technical steps to transform ActOne into a freemium application using a "Durable" Microsoft Store Add-on.

## 1. Product ID
Yes, the Product ID can be anything you choose when creating the Durable Add-on in the Microsoft Partner Center (e.g., `LifetimePro` or `ActOnePremium`). You will just need to let the code know what this ID is so we can check for it.

## 2. Free vs Premium Features
The app will be free to download. Free users will have access to:
- Core writing editor
- Notepad
- Markers
- Zen mode
- Title Page
- PDF Export (with watermark)
- Themes: Only "Studio Light" and "Midnight" are free.

All other advanced features will be locked behind the one-time "Lifetime Access" purchase.

### Locked Features
These will be shown with a lock icon (🔒) and a tooltip indicating it is a "Premium feature". Clicking them will open a Premium Paywall modal instead of opening the feature.
- **Activity Bar Tabs**: 
  - Scripts (Freemium only allows 1 script per bundle, so the pane is locked)
  - Characters
  - Statistics
  - Tasks (Todo)
  - Sprint
  - Parking
- **Modals & Tools**: 
  - Structure Modal
  - Production Breakdown (Tags)
  - Theme Manager
- **Exports**: 
  - Export to FDX
  - Export to Fountain

## 3. Watermarking (PDF Exports)
For users without the premium add-on, PDF exports will include:
- The text **"Created with ACTOne free version"** at the bottom of every page.
- The **ActOne logo** stamped in the middle of every page at **0.4 (40%) opacity**.

## 4. Implementation Steps

### Tauri Backend (Rust)
1. **License Checking**: Change the existing `check_microsoft_store_license` to instead look inside `AppLicense.AddOnLicenses()` to see if the user owns the chosen Product ID.
2. **Purchase Trigger**: Create a new `purchase_premium_features` Tauri command. This will use the WinRT `StoreContext.RequestPurchaseAsync` API to popup the native Windows Store purchase dialog natively in the app.
3. **PDF Export**: Modify `export_pdf` and `generate_pdf_bytes` to accept an `is_premium` boolean. Update the `krilla` PDF generation code to overlay the watermark text and embed the logo image with 0.4 opacity if `is_premium` is false.

### React Frontend
1. **Context (`LicenseContext.tsx`)**: Create a new context that checks the license status on app startup and provides an `isPremium` boolean and a `purchasePremium()` function to the rest of the application.
2. **App Entry (`App.tsx`)**: Remove the old code that forcefully closes the app on base-license failure. Wrap the app in the new `<LicenseProvider>`.
3. **Welcome Screen (`WelcomeScreen.tsx`)**: Read the `isPremium` status and display a "FREE" or "PREMIUM" badge/tag next to the app logo.
4. **Sidebar UI (`ActivityBar.tsx`)**: Render a 🔒 icon on locked tabs. Show a tooltip "Premium Feature". Intercept clicks to open the paywall modal instead of navigating to the tab.
5. **Theme UI (`ActivityBar.tsx`)**: Filter the quick-settings theme dropdown to only show "Studio Light" and "Midnight" for free users. Add a lock icon next to the "Manage Themes..." button.
6. **Export Modal (`ExportModal.tsx`)**: Disable Fountain/FDX formats with a "(Premium)" label. Add a prominent "Unlock Premium" button directly in the modal for easy upgrading.
7. **Paywall Modal (`PremiumPaywallModal.tsx`)**: Create a reusable, beautiful modal explaining the benefits of Lifetime Access. It will have a large "Unlock Now" button that calls the Rust purchase command.
