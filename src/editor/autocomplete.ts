import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { 
  LINE_ACTION, 
  LINE_CHARACTER, 
  LINE_DIALOGUE, 
  LINE_DUAL_CHARACTER, 
  LINE_EMPTY, 
  LINE_HEADING, 
  LINE_PARENTHETICAL, 
  LINE_TRANSITION,
  classifyLines
} from "./fountainSyntax";

export const fountainCompletionSource = (context: CompletionContext): CompletionResult | null => {
  const word = context.matchBefore(/[\w\.\/]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const line = context.state.doc.lineAt(context.pos);
  const beforeCursor = line.text.substring(0, context.pos - line.from);
  const lineTypes = classifyLines(context.state.doc);
  const currentType = lineTypes[line.number - 1];

  if (currentType === LINE_HEADING || currentType === LINE_DIALOGUE ||
      currentType === LINE_PARENTHETICAL || currentType === LINE_ACTION) {
    return null;
  }

  const options = [];

  if (currentType === LINE_EMPTY || line.number === 1) {
    if (/^[iIeE]?$/i.test(beforeCursor.trim())) {
      options.push(
        { label: "INT. ", type: "keyword", boost: 99 },
        { label: "EXT. ", type: "keyword", boost: 98 },
        { label: "I/E ", type: "keyword", boost: 97 }
      );
    }
  }

  if (currentType === LINE_CHARACTER || currentType === LINE_EMPTY) {
    const docText = context.state.doc.toString();
    const characters = new Set<string>();
    const lines = docText.split("\n");
    const allTypes = classifyLines(context.state.doc);
    for (let i = 0; i < lines.length; i++) {
      if (allTypes[i] === LINE_CHARACTER || allTypes[i] === LINE_DUAL_CHARACTER) {
        const name = lines[i].trim().replace(/\s*\^$/, "").replace(/\s*\(.*\)$/, "").trim();
        if (name.length > 1) characters.add(name);
      }
    }
    characters.forEach(char => {
      options.push({ label: char, type: "variable" });
    });
  }

  if (currentType === LINE_TRANSITION || currentType === LINE_EMPTY) {
    const trimmed = beforeCursor.trim().toUpperCase();
    const isTransitionPrefix = /^(CUT|FAD|DIS|SMA|MAT)/.test(trimmed);
    if (currentType === LINE_TRANSITION || isTransitionPrefix) {
      const transitions = ["CUT TO:", "FADE OUT.", "FADE IN:", "DISSOLVE TO:", "SMASH CUT TO:", "MATCH CUT TO:"];
      transitions.forEach(t => {
        if (t.startsWith(trimmed)) {
          options.push({ label: t, type: "keyword" });
        }
      });
    }
  }

  if (options.length === 0) return null;

  return {
    from: word.from,
    options: options.filter(opt => opt.label.toUpperCase().startsWith(word.text.toUpperCase()))
  };
};
