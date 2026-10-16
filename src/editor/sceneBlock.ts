import type { EditorState } from "@codemirror/state";
import { LINE_HEADING, LINE_SECTION, lineTypesField } from "./fountainSyntax";

export interface SceneBlock {
  headingLine: number;
  text: string;
}

export function getSceneBlockAtLine(state: EditorState, lineNumber: number): SceneBlock | null {
  const types = state.field(lineTypesField);
  let headingLine = Math.min(Math.max(1, lineNumber), state.doc.lines);

  while (headingLine > 0 && types[headingLine - 1] !== LINE_HEADING) {
    if (types[headingLine - 1] === LINE_SECTION) return null;
    headingLine--;
  }
  if (headingLine === 0) return null;

  let nextHeadingLine = headingLine + 1;
  while (
    nextHeadingLine <= state.doc.lines &&
    types[nextHeadingLine - 1] !== LINE_HEADING &&
    types[nextHeadingLine - 1] !== LINE_SECTION
  ) nextHeadingLine++;

  const from = state.doc.line(headingLine).from;
  const to = nextHeadingLine <= state.doc.lines ? state.doc.line(nextHeadingLine).from : state.doc.length;
  return { headingLine, text: state.doc.sliceString(from, to) };
}
