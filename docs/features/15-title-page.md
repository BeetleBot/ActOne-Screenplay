# Title Page Editor

The Title Page Editor modal allows editing the screenplay's title page metadata without manually formatting Fountain title page syntax.

## Opening

- **Command Palette** → "Edit Title Page"
- **Export Modal** → click "Edit Title Page"

## Fields

| Field | Fountain Key | Description |
|-------|-------------|-------------|
| Title | `Title:` | Screenplay title |
| Credit | `Credit:` | Writing credit (e.g., "Written by") |
| Author | `Author:` | Screenwriter name(s) |
| Source | `Source:` | Source material attribution |
| Draft Date | `Draft Date:` | Version date |
| Contact | `Contact:` | Author contact information |
| Notes | `Notes:` | Additional title page notes |

## Behavior

- Existing title page data is parsed from the Fountain document and pre-filled
- Changes are written back to the Fountain text as proper title page key:value pairs
- If no title page exists, one is created at the top of the document

## PDF Export

The title page is rendered as a separate page in PDF export with:
- Title centered and bold (uppercase)
- Credit, Author, Source centered below
- Draft Date and Contact bottom-aligned
- Title page is excluded from page numbering
