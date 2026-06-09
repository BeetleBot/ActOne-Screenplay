# Screenplay Export and Page Layout Logic

This document provides a detailed technical breakdown of the page geometry, margins, element indentations, and layout algorithms used during screenplay compilation in ActOne. It details the math behind page scaling (US Letter vs. A4), element positioning, dual dialogue execution, and notes potential rendering defects identified during layout verification.

---

## 1. Page Sizing & Margin Geometry

The PDF compiler coordinates page dimensions in **points** (where $72\text{ pt} = 1\text{ inch}$).

### Dimensions
*   **US Letter:** $612.0\text{ pt} \times 792.0\text{ pt}$ ($8.5" \times 11.0"$)
*   **A4:** $595.0\text{ pt} \times 842.0\text{ pt}$ ($8.27" \times 11.69"$)

### Margin Computations
To maintain consistent line-breaking and pagination boundaries regardless of the target paper size, ActOne enforces a constant printable content width of **$432.0\text{ pt}$** ($6.0"$, or exactly $60\text{ characters}$ of a monospaced $10\text{-pitch}$ font).

This is achieved by dynamically scaling the right margin:
1.  **Top Margin:** Fixed at $72.0\text{ pt}$ ($1.0"$).
2.  **Bottom Margin:** Fixed at $72.0\text{ pt}$ ($1.0"$).
3.  **Left Margin:** Fixed at $108.0\text{ pt}$ ($1.5"$).
4.  **Right Margin:** Calculated as $W_{\text{page}} - 540.0\text{ pt}$.
    *   **US Letter:** $612.0 - 540.0 = 72.0\text{ pt}$ ($1.0"$).
    *   **A4:** $595.0 - 540.0 = 55.0\text{ pt}$ ($0.76"$).

This margin shift absorbs the narrower width of A4 paper, ensuring the text container width is exactly $432.0\text{ pt}$ for both sizes.

---

## 2. Element Indentation & Wrapping Analysis

Element margins in the PDF generator are configured as absolute offsets from the left page edge ($X = 0$).

### Comparison Table

| Element | Reference App (Letter) | Reference App (A4) | ActOne PDF Engine | Width (ActOne) |
| :--- | :--- | :--- | :--- | :--- |
| **Action / Heading** | $108.0\text{ pt}$ ($1.5"$) | $108.0\text{ pt}$ ($1.5"$) | **$108.0\text{ pt}$** | $432.0\text{ pt}$ ($6.0"$) |
| **Dialogue** | $180.0\text{ pt}$ ($2.5"$) | $180.0\text{ pt}$ ($2.5"$) | **$180.0\text{ pt}$** | $252.0\text{ pt}$ ($3.5"$) |
| **Parenthetical** | $218.75\text{ pt}$ ($3.04"$) | $218.75\text{ pt}$ ($3.04"$) | **$223.2\text{ pt}$** ($3.1"$) | $172.8\text{ pt}$ ($2.4"$) |
| **Character Cue** | $240.5\text{ pt}$ ($3.34"$) | $240.5\text{ pt}$ ($3.34"$) | **$266.4\text{ pt}$** ($3.7"$) | $144.0\text{ pt}$ ($2.0"$) |

### Identified Layout Defect: Character & Parenthetical Wrapping
*   **The Problem:** The compiler restricts the **Character Cue width to $144.0\text{ pt}$ ($2.0"$, or $20\text{ characters}$)**. Standard screenplay templates allocate up to $4.0"$ ($40\text{ characters}$) for the character block. Because of this restriction, character names with long parenthetical tags (e.g. `SUPERINTENDENT (CONT'D)` or `SHARANYA (V.O.)`) will wrap onto a second line, breaking professional layout compliance.
*   **The Resolution:** 
    *   Expand Character Cue width to $288.0\text{ pt}$ ($4.0"$) by adjusting the right margin constraint in the compiler to `page_width - 554.4`.
    *   Expand Parenthetical width from $2.4"$ to $2.8"$ by adjusting the right margin constraint to `page_width - 424.8`.

---

## 3. Dual Dialogue Layout Implementation

Dual dialogue permits two characters to speak simultaneously.

### 1. Representation & Parsing (Editor Frontend)
*   **Syntax:** Denoted in raw text by appending a caret (`^`) directly after the second character's name:
    ```fountain
    SHARANYA
    Hello.

    VIKRAM ^
    Hi.
    ```
*   **Editor Behavior:** The parser tags these elements as `dualDialogueCharacter`, `dualDialogueParenthetical`, and `dualDialogue`. However, in the CodeMirror editor interface, they are rendered sequentially. This matches industry standards, as side-by-side editing inside a text editor introduces navigation and line-wrap bugs.

### 2. Compilation and Rendering (PDF Exporter)
The Rust compilation engine formats the dual dialogue elements side-by-side on the page by splitting the horizontal print width into two columns:

*   **Left Column Margins:**
    *   `left_margin`: $144.0\text{ pt}$ ($2.0"$).
    *   `right_margin` (width limit): $288.0\text{ pt}$ ($4.0"$).
*   **Right Column Margins:**
    *   `left_margin`: $\frac{W_{\text{page}}}{2} + 36.0\text{ pt}$.
    *   `right_margin` (width limit): Page right margin.

### The Rendering Pipeline
1.  **Vertical Baseline Save:** Before rendering, the engine records the current vertical coordinates ($Y_{\text{start}}$).
2.  **Left Column Pass:** Renders the left dialogue block using the Left Column Margins. The engine measures the height of the left block and records the ending vertical position ($Y_{\text{left}}$).
3.  **Baseline Reset:** The engine resets the vertical coordinator back to $Y_{\text{start}}$.
4.  **Right Column Pass:** Renders the right dialogue block using the Right Column Margins, measuring the ending vertical position ($Y_{\text{right}}$).
5.  **Page Flow Advance:** The compiler sets the new vertical layout coordinator to $\max(Y_{\text{left}}, Y_{\text{right}})$, ensuring subsequent elements (such as action lines) start cleanly below the taller column.
6.  **Pagination Splitting:** If either column overflows the bottom margin of the page, the block split mechanism triggers, splitting the dialogue across pages and prepending character cues on the next page.
