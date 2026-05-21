import { parseScreenplay } from "./FountainParser";

self.onmessage = (e: MessageEvent<string | { text: string; paperSize: 'letter' | 'a4' }>) => {
  if (typeof e.data === "string") {
    const result = parseScreenplay(e.data, "letter");
    self.postMessage(result);
  } else {
    const { text, paperSize } = e.data;
    const result = parseScreenplay(text, paperSize);
    self.postMessage(result);
  }
};
