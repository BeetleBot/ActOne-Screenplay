import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { 
  LINE_CHARACTER, 
  LINE_DUAL_CHARACTER, 
  LINE_EMPTY, 
  classifyLines
} from "./fountainSyntax";

export const fountainCompletionSource = (context: CompletionContext): CompletionResult | null => {
  if (localStorage.getItem("actone-autocomplete-enabled") === "false") return null;

  const word = context.matchBefore(/[\w().\/-]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const line = context.state.doc.lineAt(context.pos);
  const lineTypes = classifyLines(context.state.doc);
  const currentType = lineTypes[line.number - 1];

  const options: { label: string; type: string; boost?: number; apply?: string }[] = [];

  // Suggest character names on character or empty lines
  if (currentType === LINE_CHARACTER || currentType === LINE_EMPTY) {
    const doc = context.state.doc;
    const characters = new Set<string>();
    const allTypes = classifyLines(doc);
    for (let i = 1; i <= doc.lines; i++) {
      if (allTypes[i - 1] === LINE_CHARACTER || allTypes[i - 1] === LINE_DUAL_CHARACTER) {
        const lineText = doc.line(i).text;
        const name = lineText.trim().replace(/\s*\^$/, "").replace(/\s*\(.*\)$/, "").trim();
        if (name.length > 1) characters.add(name);
      }
    }
    characters.forEach(char => {
      options.push({ label: char, type: "variable", boost: 95, apply: char + "\n" });
    });
  }

  if (options.length === 0) return null;

  return {
    from: word.from,
    to: context.pos,
    options: options.filter(opt => opt.label.toUpperCase().startsWith(word.text.trim().toUpperCase())),
  };
};
