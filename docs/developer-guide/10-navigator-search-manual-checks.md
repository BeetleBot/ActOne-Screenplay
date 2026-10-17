# Navigator and Search manual verification

Use a duplicate script for destructive checks. Repeat the important checks with a small document and a 200–300-page document. The generated benchmark scripts are under `node_modules/.cache/actone-benchmark/fixtures/` after running the benchmark.

## Scene Navigator

- [ ] Click scenes at the beginning, middle and end. Each click must jump to the correct scene.
- [ ] Move the editor cursor between scenes. The correct card must become selected and scroll into view, including a scene that was offscreen.
- [ ] Scroll the Navigator quickly in both directions. There must be no persistent blank gaps, overlapping cards or missing entries.
- [ ] Collapse and expand sections and subsections. Only the appropriate children should hide/reappear.
- [ ] Collapse a section, then insert/delete lines earlier in the script. Its collapsed state must survive and navigation must remain accurate.
- [ ] Use duplicate scene and section names. Each must remain independently selectable; collapsing one must not affect the other.
- [ ] Rename, add and delete headings. Entries and scene numbers must update correctly.
- [ ] Show short, long and multiple synopses. Text must wrap without overlapping adjacent cards; clicking a synopsis must jump to its source line.
- [ ] Show/hide storylines and synopses. Existing labels and visibility controls must work.
- [ ] Scroll away from the editor's active scene, then toggle synopses repeatedly. The Navigator must not pull back to the active scene or oscillate while wrapped summaries are measured.
- [ ] Filter by scene color and storyline. Counts and displayed scenes must be correct; clearing filters must restore the outline.
- [ ] Search the outline, then clear its search. Matching headings must appear and the full outline must return.
- [ ] Type and clear an outline query rapidly with long synopses visible. Input must remain responsive, and filtering must not trigger repeated automatic scrolling.
- [ ] Try Small, Normal and Large fonts and resize the sidebar. Cards must remain readable and correctly spaced.
- [ ] Focus Navigator and use Up/Down, Left/Right and Enter. Navigation, section expansion/collapse and editor jumps must work for mounted and offscreen entries.
- [ ] Right-click a scene different from the editor's current scene and select Copy Scene. Paste into a plain-text editor: it must be the right-clicked scene, retaining original Fountain formatting and stopping before the next scene, section or subsection.
- [ ] Repeat Copy Scene after inserting lines above the scene, and with Navigator filters active.
- [ ] Drag scenes upward and downward. Verify heading, dialogue, actions and formatting move together. Undo must restore the original text.
- [ ] Reorder scenes after scrolling deep into the Navigator, with synopses both shown and hidden. Releasing the mouse must preserve the viewport without jumping to the top; the editor cursor/selection must remain with its original text, including when another scene moves past it.
- [ ] Drag while filtered and drag near the Navigator's scrolling edges. The intended scene must move to the intended position, without moving an unrelated scene.
- [ ] Open a prose/Markdown script. Its Table of Contents must still display headings and jump to the correct locations.
- [ ] Switch files and scripts. Navigator must show the active document and must not jump to a location in the previous document.

## Search

- [ ] Search a word occurring throughout the script. Check the full match count, including matches far offscreen.
- [ ] Scroll the editor while Search remains open. Visible matches must be highlighted as they come into view.
- [ ] Use next/previous and Enter/Shift+Enter. Every occurrence must be reachable and navigation must wrap at either end.
- [ ] Put the same word twice on one line. Clicking the second result must select the second occurrence, not the first.
- [ ] Verify line numbers, previews and scene context in result rows.
- [ ] Test Match Case and Whole Word with words such as `Raj`, `raj`, `rail` and `railing`.
- [ ] Search accented/non-English text used by your scripts. Counts and selected text must remain accurate.
- [ ] If using escaped multiline queries, search `first\nsecond` against those words on adjacent lines. Verify both highlighting and navigation.
- [ ] Type, delete, paste and insert/remove newlines while Search is open. Counts must converge to the current document. A brief Updating results message is expected.
- [ ] Rapidly change the query several times. An older search must never overwrite the latest query's results.
- [ ] Clear the query and try an absent word. Old highlights must disappear and the empty/no-results state must be correct.
- [ ] Search a common word with hundreds of results. Scroll deeply and navigate to the final match; the list must not develop persistent gaps or overlaps.
- [ ] Close Search using the close button and Escape, then reopen it. Highlights must clear on close and query persistence must still work.
- [ ] Switch files/scripts with Search open. Results and replacements must operate on the active document.

## Replace, undo and integrity

- [ ] Replace the currently selected occurrence. Only that occurrence must change.
- [ ] Check several results and replace selected. Only the checked occurrences must change.
- [ ] Check results, then edit text before or inside them. Checks must not silently transfer to unrelated occurrences.
- [ ] Replace All and confirm. All intended matches must change. Undo must restore the replacement in one operation.
- [ ] Cancel Replace All. Nothing must change.
- [ ] If possible, change the document/query while Replace All confirmation is open, then confirm. Outdated offsets must be rejected; review the refreshed results before retrying.
- [ ] Undo and redo typing, replacements and reordering. The text must remain correct and both panels must catch up.
- [ ] Make edits, save immediately and reopen. There must be no missing, duplicated or unsaved text.
- [ ] Type normally in a 200–300-page script with Navigator and Search open together. Check responsiveness, cursor movement, scrolling, file switching and correct scene selection.

Record failures with the document size, exact steps, expected result and actual result. Check Windows and Linux desktop builds where available; browser benchmark success alone does not verify native spellcheck or pagination.
