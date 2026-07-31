import { parseScreenplay, FountainDocument } from "../parser";

export interface ParseRequestMessage {
  id: number;
  type: "parse";
  text: string;
  paperSize?: "a4" | "letter";
}

export interface ParseResponseMessage {
  id: number;
  type: "parsed";
  doc: FountainDocument;
}

self.onmessage = (e: MessageEvent<ParseRequestMessage>) => {
  const { id, type, text, paperSize } = e.data;
  if (type === "parse") {
    const doc = parseScreenplay(text, paperSize);
    const response: ParseResponseMessage = { id, type: "parsed", doc };
    self.postMessage(response);
  }
};
