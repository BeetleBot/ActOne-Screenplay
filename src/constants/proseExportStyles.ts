export interface ProseExportStyle {
  id: string;
  name: string;
  font: string;
  description: string;
}

export const PROSE_EXPORT_STYLES: readonly ProseExportStyle[] = [
  { id: "classic", name: "Classic", font: "Literata", description: "Balanced spacing and centered main headings for stories and essays." },
  { id: "manuscript", name: "Manuscript", font: "Courier Prime", description: "Double-spaced text, indented paragraphs, and compact tables for reviewing drafts." },
  { id: "treatment", name: "Treatment", font: "Source Serif 4", description: "Left-aligned headings and roomy tables for treatments and synopses." },
  { id: "modern", name: "Modern", font: "Inter", description: "A wider text area, compact paragraphs, and large bold headings for notes and story bibles." },
  { id: "literary", name: "Literary", font: "EB Garamond", description: "A narrower text area, indented paragraphs, and relaxed leading for a book appearance." },
];

export const DEFAULT_PROSE_EXPORT_STYLE = "classic";
