# Todo

## Improvements

* \[x] Fix the selection.
* \[x] Improve the typewriter mode.
* \[x] Figure our a consistent UI philosophy for writing app.
* \[x] Rework/improve the Timeline feature.
* \[x] Add more export options (PDF, etc.)
* \[x] Fix keyboard scrolling in Navigator
* \[x] Underline shortcut works for just one letter.
* \[x] When command palette opens, editor scrolls to the top visually (restores on close). Need to prevent the visual scroll entirely.
* \[x] Implement Marker's features.
* \[x] Find a way to include all Indian languages(Figure out the fonts) for the editor and export options.
* \[x] Make sure that the pagination is right.
* \[x] Hide fountain markup.
* \[x] Figure out how Production Breakdown modal displays the data. I want more structured and scene wise list. Like a Excel data. With an option to export it to CSV.
* \[x] Fix the small orphan issues in the pdf output.
* \[x] And I want quick tagging context menu. Like when I select a word or sentence and Hold ctrl + right click, then the app should show me tagging options only.

* [ ]  Fix the Welcome Screen Title Bar

## Multi-Window Tour Infrastructure

### Design
- Tauri event-based communication between windows:
  - `tour:announce` — main window tells modal "tour starting"
  - `tour:step` — main window sends current step to modal
  - `tour:step-done` — modal reports back that user completed the action
  - `tour:cancel` / `tour:complete` — cleanup signals
- New `TourStep.window?: string` field to mark which window a step belongs to
- Global `CrossWindowTourCard` component mounted in `main.tsx` so it renders in every Tauri window
- Hook `useTourCoordinator` (main window) — manages tour state, dispatches events via Tauri's event system
- Hook `useTourListener` (modal windows) — listens for tour events, renders the card
- Steps that open a modal (Theme Manager, Settings, X-Ray, Export, Production Breakdown) get `window: "modal-name"`, trigger the modal open, then wait for the user to interact in that window

### Todo
- [ ] Implement `useTourCoordinator` hook
- [ ] Implement `useTourListener` hook
- [ ] Create `CrossWindowTourCard` component
- [ ] Mount `CrossWindowTourCard` in `main.tsx`
- [ ] Add `window` field to `TourStep` interface
- [ ] Wire Tauri `listen`/`emit` for cross-window events
- [ ] Add close-window detection for modal tour steps (offer Retry/Skip)
- [ ] Test with Theme Manager, Settings, X-Ray, Export modals

## Features to Implement

* \[x] Import Strucutre.
* \[x] Add zoom-in / zoom-out feature for editor.
* \[x] Rewrite the whole theming stuff. Remove all hardcoded colors, add a lot of themes.
* \[x] Search / Replace / Replace All
* \[ ] Index cards or some sort of planning board
* \[ ] screenplay Preview feature.
* \[x] Markers and tags.
* \[x] X-Ray or Analysis stuffs.
* \[ ] AI integration(For Translations, Rephrasing and Better words)
* \[ ] Cloud integration(Google Drive, Dropbox, etc.,)
* \[x] Add a seperate title page customisation modal, with Image support, if possible.
* \[ ] Build separate .actone-to-.zip unpacker app
