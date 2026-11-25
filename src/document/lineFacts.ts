import { LineType, type ParsedLine } from "../parser";
import { createDocumentCalculation } from "./documentDataStore";

export interface IndexedLine {
  line: ParsedLine;
  index: number;
}
export interface LineFacts {
  headings: IndexedLine[];
  sections: IndexedLine[];
  sectionBoundaries: IndexedLine[];
  hasTitlePage: boolean;
}

/** Reusable structural facts; view ordering, geometry and identities stay local. */
export const getLineFacts = createDocumentCalculation<ParsedLine[], LineFacts>("line-facts", (lines) => {
  const result: LineFacts = { headings: [], sections: [], sectionBoundaries: [], hasTitlePage: false };
  lines.forEach((line, index) => {
    const entry = { line, index };
    if (line.type === LineType.heading) result.headings.push(entry);
    if (line.type === LineType.section) {
      if (line.sectionDepth === 1) result.sections.push(entry);
      if (line.sectionDepth === 1 || line.sectionDepth === 2) result.sectionBoundaries.push(entry);
    }
    if (line.type >= LineType.titlePageTitle && line.type <= LineType.titlePageUnknown) result.hasTitlePage = true;
  });
  return result;
});
