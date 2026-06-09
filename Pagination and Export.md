# Screenplay Pagination and Export Formatting Rules

This document outlines the standard industry pagination and layout constraints for screenplay exporting. These rules dictate how elements (scene headings, action, dialogue, transitions) should behave when crossing page boundaries to avoid formatting issues like widows and orphans.

---

## 1. Scene Headings, Shots, and Sections (Orphan Headings)

*   **Grouping Constraint:** A scene heading, shot, or section element is intrinsically bound to the content that follows it. They should never be paginated in isolation.
*   **The Bottom-of-Page Rule:** A scene heading must never be the last element at the bottom of a page.
*   **The Lookahead Splitting Rule:** 
    *   When paginating a scene heading and the subsequent block (e.g., an action or dialogue block), the system must group them into a single layout block group.
    *   If only the scene heading fits in the remaining space of the current page, the system must inspect the following block to see if it can be split.
    *   **The Minimum 2-Line Rule:** The portion of the subsequent block remaining on the page after the scene heading must be at least **2 lines** of text (excluding margins). If the subsequent block cannot provide at least 2 lines of text on the current page, the *entire group* (the scene heading and the subsequent block) must be rolled over to the next page.

---

## 2. Dialogue Blocks

Dialogue blocks are composed of a Character Cue, optional Parentheticals, and Dialogue lines.

*   **Character Cue Retention:** A Character Cue must never stand alone at the bottom of a page. It must be accompanied by at least one line of dialogue or parenthetical.
*   **Dialogue Splitting (MORE / CONT'D):** If a dialogue block must be split across pages:
    *   A `(MORE)` indicator is automatically appended to the bottom of the current page.
    *   The Character Cue is reprinted at the top of the next page with a `(cont'd)` suffix (e.g., `CHARACTERNAME (cont'd)`).
*   **Parentheticals:** 
    *   Parentheticals are valid split points, but they cannot start a new page unless they are pulled over alongside the Character Cue. 
    *   A parenthetical directly following a Character Cue cannot be separated from it; they must both remain on the same page.
*   **Sentence-Based Splitting:** When long paragraphs of dialogue are split across pages, the pagination engine should attempt to split the text at sentence boundaries (detecting `.`, `?`, `!`, etc.) rather than cutting mid-sentence. If a single sentence is too long to fit on a page, it falls back to word-level or character-level splitting.

---

## 3. Dual Dialogue

*   **Alignment Constraint:** Dual dialogue (two characters speaking simultaneously side-by-side) must remain aligned vertically on the page.
*   **Splitting Constraint:** If the remaining space on the page is insufficient to show at least a portion of both columns, or if splitting results in one column being entirely pushed to the next page, the entire dual dialogue block must be moved to the next page.

---

## 4. Transitions

*   **Spacing and Roll:** Transitions (e.g., `CUT TO:`) are single-line elements.
*   **Page Boundary Rule:** If the remaining space on a page is less than the transition line height plus its required top margin, the transition must be pushed to the next page. Because transitions conclude a scene, they do not "swallow" the following block and do not force subsequent headings to roll with them.

---

## 5. Paragraph Splitting (Action, Synopses, Sections)

*   **Dynamic Layout calculation:** Multi-line paragraphs (like Action) can be split dynamically across pages based on the available line budget.
*   **Orphan Line Prevention:** To avoid leaving a single line of an action paragraph alone at the bottom of a page, the pagination logic must verify if the remaining space is sufficient for at least two lines. If splitting leaves only one line, the entire paragraph should be pushed to the next page.

---

## 6. Title Page Isolation

*   **Flow Separation:** The title page (containing Title, Author, Contact Info, etc.) is processed independently of the main screenplay body.
*   **Pagination Reset:** Standard page numbering (Page 1) and margin-based line budgeting start strictly on the page following the title page. Title page content must never flow into the main screenplay text layout.
