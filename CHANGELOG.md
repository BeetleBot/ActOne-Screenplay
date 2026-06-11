# Changelog

## [0.1.5] - 2026-06-11

### Changed
- Parenthetical autocomplete suggestions no longer include parentheses in the suggestion list; stored as bare text (e.g. `smiles` instead of `(smiles)`). The `(` and `)` are preserved in the document via auto-match and the completion range logic.
- Removed "Language" group from parenthetical suggestions (in French, in Spanish, etc.).
- Autocomplete dropdown styling: reduced border-radius, added backdrop blur, tighter padding, accent-colored matched text, reduced item spacing with border-radius on hover.
- Editor context menu styling: denser layout, reduced border-radius and shadow.
- Editor Enter key now skips over a trailing `)` on parenthetical lines instead of breaking.

### Fixed
- Parenthetical completions now correctly replace only the text between `(` and `)`, keeping both parentheses intact.
