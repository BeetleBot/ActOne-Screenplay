# Linux verification list

Use disposable copies of projects. Record the distribution, desktop environment,
X11 or Wayland session, WebKitGTK version, app version, and package format.
Test both the AppImage and Flatpak; portal permissions must be tested in Flatpak.

## Automated checks

- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml --locked`
- [ ] Build and launch the Linux package.

Windows validation of these changes: typecheck and production build passed.
The frontend suite passed 992 tests with one failing startup loading-screen
assertion in `src/main.test.tsx`. That assertion concerns concurrent startup UI
changes and remains unresolved; do not treat the full suite as passing.
Windows tests cannot validate WebKitGTK or Flatpak portal behavior.

## Project filenames and saving

- [ ] Create `Movie.actone` and `movie.actone` in the same directory, with different content. Open both through the file dialog: each must have its own project tab and content.
- [ ] Repeat using command-line paths and recent files.
- [ ] Reopen the exact same path: select its existing tab without duplicating it.
- [ ] Open `Movie.ACTONE`, edit it, save, close, and reopen. The changes must be in `Movie.ACTONE`; no lowercase-extension copy should appear.
- [ ] Use Save As with a mixed-case extension. Confirm the exact selected filename is used, including when overwriting an existing file after confirmation.
- [ ] Repeat with spaces and non-ASCII characters in directory and project names.
- [ ] Open an existing project, switch scripts, save, and reopen. Verify every script and its settings remain intact.
- [ ] Open a legacy project copy and verify automatic migration writes to the original path.

## PDF preview

- [ ] Open Export and verify the first PDF preview renders without JavaScript errors.
- [ ] Test both a Fountain screenplay and a Markdown prose document.
- [ ] Change font, paper size, and watermarks; confirm preview refreshes.
- [ ] Zoom and scroll a multipage preview; confirm every page renders.
- [ ] Close and reopen Export repeatedly; confirm the latest document appears.
- [ ] Export the PDF and open it externally; compare its pages with the preview.
- [ ] Repeat on the oldest WebKitGTK version intended to be supported. The legacy PDF.js renderer and matching worker improve compatibility but still require native verification.

## Flatpak folder access

Use a fresh test account or a clean permission state so previous portal grants
do not conceal missing access. Record any manually granted Flatpak permissions.
Do not delete real projects or reset production app data.

- [ ] Open and save a project in Documents. Confirm normal saving and snapshots work.
- [ ] Open a project outside Documents, such as Downloads or an external drive. If sibling-file access is unavailable, confirm the app asks to select the project folder.
- [ ] Select the actual containing folder. Edit, save, close, and reopen; verify content and the original filename.
- [ ] Cancel folder selection: no project content may be written, upgraded, or overwritten. Confirm the app remains usable.
- [ ] Choose a different folder containing a same-named project: access must be rejected without modifying either file.
- [ ] Save As outside Documents. Grant the destination folder and verify the displayed project path matches the actual saved destination.
- [ ] If the selected destination folder already contains a conflicting file, confirm the app refuses an unconfirmed overwrite.
- [ ] Create manual and automatic snapshots after granting access. Verify the sibling `.snapshots` directory, list snapshots, and restore a copy.
- [ ] Restart the app and reopen from Recent Files. Verify folder grants persist or the access prompt returns safely.
- [ ] Test a read-only folder: saving must report failure and retain unsaved edits.
- [ ] Check that temporary `.actone-access-*` probe files are removed.

The directory-access implementation has not yet been verified on Linux. In
particular, verify that the portal grants writable directory access and that
device/inode identity checks recognize the original file through portal paths.

## Desktop regression checks

- [ ] Test window dragging, resizing, maximizing, and closing under X11 and Wayland.
- [ ] Check file dialogs, clipboard copy/paste, external links, and opening exported files.
- [ ] Verify canceling dialogs does not close the app or lose unsaved edits.

## Results

For each failure, record the checklist item, environment/package, reproduction
steps, expected and actual behavior, and relevant console or Rust errors.
