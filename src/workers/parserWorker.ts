import { parseScreenplay, FountainDocument } from "../parser";

export interface ParseRequestMessage {
  id: number;
  type: "parse";
  text: string;
  paperSize?: "a4" | "letter";
}

export interface ParseSuccessMessage {
  id: number;
  type: "parsed";
  doc: FountainDocument;
}

export interface ParseErrorMessage {
  id: number;
  type: "error";
}

export type ParseResponseMessage = ParseSuccessMessage | ParseErrorMessage;

self.onmessage = (e: MessageEvent<ParseRequestMessage>) => {
  const { id, type, text, paperSize } = e.data;
  if (type === "parse") {
    try {
      const doc = parseScreenplay(text, paperSize);
      const response: ParseResponseMessage = { id, type: "parsed", doc };
      self.postMessage(response);
    } catch {
      self.postMessage({ id, type: "error" } satisfies ParseResponseMessage);
    }
  }
};
