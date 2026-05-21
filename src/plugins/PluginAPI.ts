import { ParsedLine, LineType } from "../parser/FountainParser";

export interface PluginRange {
  location: number;
  length: number;
}

export interface PluginLineInfo {
  text: string;
  type: string;
  typeAsString: string;
  sceneNumber?: string;
  color?: string;
  marker?: { color: string; description: string };
  storylines?: string[];
}

export interface PluginSceneInfo {
  text: string;
  sceneNumber?: string;
  color?: string;
  lineIndex: number;
  storylines?: string[];
}

const TYPE_NAMES: Record<number, string> = {
  [LineType.empty]: "empty",
  [LineType.section]: "section",
  [LineType.synopse]: "synopsis",
  [LineType.titlePageTitle]: "titlePageTitle",
  [LineType.titlePageAuthor]: "titlePageAuthor",
  [LineType.titlePageCredit]: "titlePageCredit",
  [LineType.titlePageSource]: "titlePageSource",
  [LineType.titlePageContact]: "titlePageContact",
  [LineType.titlePageDraftDate]: "titlePageDraftDate",
  [LineType.titlePageUnknown]: "titlePageUnknown",
  [LineType.heading]: "heading",
  [LineType.action]: "action",
  [LineType.character]: "character",
  [LineType.parenthetical]: "parenthetical",
  [LineType.dialogue]: "dialogue",
  [LineType.dualDialogueCharacter]: "dualDialogueCharacter",
  [LineType.dualDialogueParenthetical]: "dualDialogueParenthetical",
  [LineType.dualDialogue]: "dualDialogue",
  [LineType.transitionLine]: "transition",
  [LineType.lyrics]: "lyrics",
  [LineType.pageBreak]: "pageBreak",
  [LineType.centered]: "centered",
  [LineType.shot]: "shot",
};

const TYPE_DISPLAY: Record<number, string> = {
  [LineType.empty]: "Empty",
  [LineType.section]: "Section",
  [LineType.synopse]: "Synopsis",
  [LineType.heading]: "Heading",
  [LineType.action]: "Action",
  [LineType.character]: "Character",
  [LineType.parenthetical]: "Parenthetical",
  [LineType.dialogue]: "Dialogue",
  [LineType.dualDialogueCharacter]: "DD Character",
  [LineType.dualDialogueParenthetical]: "DD Parenthetical",
  [LineType.dualDialogue]: "DD Dialogue",
  [LineType.transitionLine]: "Transition",
  [LineType.lyrics]: "Lyrics",
  [LineType.pageBreak]: "Page Break",
  [LineType.centered]: "Centered",
  [LineType.shot]: "Shot",
};

export function lineToPluginInfo(line: ParsedLine): PluginLineInfo {
  return {
    text: line.text,
    type: TYPE_NAMES[line.type] || "action",
    typeAsString: TYPE_DISPLAY[line.type] || "Action",
    sceneNumber: line.sceneNumber,
    color: line.color,
    marker: line.marker,
    storylines: line.storylines,
  };
}

export function buildTypeConstants(): Record<string, number> {
  const constants: Record<string, number> = {};
  for (const [val, name] of Object.entries(TYPE_NAMES)) {
    constants[name] = Number(val);
  }
  return constants;
}

export type APICallHandler = (method: string, args: any[]) => any;

export interface PluginAPIMessage {
  type: "api_call";
  method: string;
  args: any[];
  callId: string;
}

export interface PluginAPIResponse {
  type: "api_response";
  callId: string;
  result?: any;
  error?: string;
}

export interface PluginEventMessage {
  type: "event";
  name: string;
  data?: any;
}

export interface PluginInitMessage {
  type: "init";
  source: string;
  typeConstants: Record<string, number>;
}

export interface PluginEndMessage {
  type: "end";
}

export interface PluginResidentMessage {
  type: "makeResident";
}

export type WorkerIncomingMessage = PluginAPIMessage | PluginEndMessage | PluginResidentMessage;
export type WorkerOutgoingMessage = PluginAPIResponse | PluginEventMessage | PluginInitMessage;
