import { parseScreenplay } from "./FountainParser";

self.onmessage = (e: MessageEvent<string | { text: string; paperSize: 'letter' | 'a4'; fileId?: string }>) => {
  if (typeof e.data === "string") {
    const result = parseScreenplay(e.data, "letter");
    self.postMessage(result);
  } else {
    const { text, paperSize, fileId } = e.data;
    const result = parseScreenplay(text, paperSize);
    self.postMessage({ ...result, fileId });
  }
};
