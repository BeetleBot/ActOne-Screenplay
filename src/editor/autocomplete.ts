import { CompletionContext, CompletionResult } from "@codemirror/autocomplete";
import { 
  LINE_CHARACTER, 
  LINE_DUAL_CHARACTER, 
  LINE_EMPTY, 
  LINE_PARENTHETICAL, 
  LINE_TRANSITION,
  classifyLines
} from "./fountainSyntax";

const PARENTHETICALS = [
  // Character extensions
  "V.O.", "O.S.", "CONT'D", "CONTINUED", "MORE",

  // Emotions
  "angry", "frustrated", "excited", "nervous", "worried",
  "sarcastic", "deadpan", "impatient", "annoyed", "disappointed",
  "relieved", "shocked", "horrified", "amused", "bored",

  // Delivery / tone
  "quietly", "softly", "evenly", "coldly", "warmly",
  "harshly", "sternly", "mockingly", "wryly", "urgently",
  "breathlessly", "through gritted teeth", "under his breath",
  "in a low voice", "barely audible", "trying not to laugh",

  // Reactions
  "sighing", "laughing", "laughing nervously", "with a chuckle",
  "crying", "through tears", "voice breaking", "groaning",
  "screaming", "shouting", "yelling after him",

  // To self / aside
  "to herself", "to himself", "aloud to herself", "muttering to himself",
  "to the audience", "aside",

  // Beats & pauses
  "beat", "a beat", "another beat", "long beat",
  "pause", "a long pause", "an awkward pause", "after a pause",

  // Physical actions
  "checking his watch", "looking around", "glancing at the door",
  "nodding", "shaking his head", "shrugging", "pacing",
  "leaning in", "wiping his brow",

  // Location / in-world
  "through the door", "from outside", "on the phone", "into radio",
  "over speaker", "filtered", "echoing",
];

const TRANSITIONS = [
  "CUT TO:", "FADE OUT.", "FADE IN:", "DISSOLVE TO:", "SMASH CUT TO:",
  "MATCH CUT TO:", "JUMP CUT TO:", "CROSSFADE TO:", "WIPE TO:",
  "IRIS IN:", "IRIS OUT:", "FADE TO BLACK.", "FADE FROM BLACK:",
  "FADE TO WHITE.", "TIME CUT:", "CUT AWAY TO:", "INTERCUT WITH:",
];

export const fountainCompletionSource = (context: CompletionContext): CompletionResult | null => {
  if (localStorage.getItem("actone-autocomplete-enabled") === "false") return null;

  const word = context.matchBefore(/[\w().\/-]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;

  const line = context.state.doc.lineAt(context.pos);
  const beforeCursor = line.text.substring(0, context.pos - line.from);
  const trimmed = beforeCursor.trim().toUpperCase();
  const lineTypes = classifyLines(context.state.doc);
  const currentType = lineTypes[line.number - 1];

  const options: { label: string; type: string; boost?: number }[] = [];

  // Parenthetical — on parenthetical lines or character lines after "("
  if ((currentType === LINE_PARENTHETICAL || currentType === LINE_CHARACTER || currentType === LINE_DUAL_CHARACTER) && beforeCursor.includes("(") && !beforeCursor.includes(")")) {
    const openParen = beforeCursor.lastIndexOf("(");
    const afterParen = beforeCursor.substring(openParen + 1);
    if (afterParen.length >= 1) {
      const parenText = afterParen.toUpperCase();
      for (const p of PARENTHETICALS) {
        const upper = p.toUpperCase();
        if (upper.startsWith(parenText)) {
          options.push({ label: p, type: "keyword" });
        }
      }
    }
  }

  // Character line
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
      options.push({ label: char, type: "variable", boost: 95 });
    });
  }

  // Transition line
  if (currentType === LINE_TRANSITION || currentType === LINE_EMPTY) {
    const isTransitionPrefix = /^(CUT|FAD|DIS|SMA|MAT|JUM|CRO|WIP|IRI|TIM)/.test(trimmed);
    if (currentType === LINE_TRANSITION || isTransitionPrefix) {
      for (const t of TRANSITIONS) {
        if (t.startsWith(trimmed)) {
          options.push({ label: t, type: "keyword" });
        }
      }
    }
  }

  if (options.length === 0) return null;

  let from = word.from;
  let to = context.pos;

  // For parentheticals, start completion after the opening paren
  if (beforeCursor.includes("(")) {
    const openParen = beforeCursor.lastIndexOf("(");
    if (openParen >= 0) {
      from = line.from + openParen + 1;
    }
  }

  return {
    from,
    to,
    options: options.filter(opt => opt.label.toUpperCase().startsWith(word.text.trim().toUpperCase().replace(/^\(+/, ''))),
  };
};
