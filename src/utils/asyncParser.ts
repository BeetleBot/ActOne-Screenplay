import { parseScreenplay, FountainDocument } from "../parser";
import type { ParseRequestMessage, ParseResponseMessage } from "../workers/parserWorker";

let workerInstance: Worker | null = null;
let requestIdCounter = 0;
const pendingCallbacks = new Map<number, (doc: FountainDocument) => void>();

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }
  if (!workerInstance) {
    try {
      workerInstance = new Worker(
        new URL("../workers/parserWorker.ts", import.meta.url),
        { type: "module" }
      );
      workerInstance.onmessage = (e: MessageEvent<ParseResponseMessage>) => {
        const { id, doc } = e.data;
        const cb = pendingCallbacks.get(id);
        if (cb) {
          pendingCallbacks.delete(id);
          cb(doc);
        }
      };
    } catch {
      workerInstance = null;
    }
  }
  return workerInstance;
}

export function parseScreenplayAsync(
  text: string,
  paperSize?: "a4" | "letter"
): Promise<FountainDocument> {
  const worker = getWorker();
  if (!worker) {
    return Promise.resolve(parseScreenplay(text, paperSize));
  }

  return new Promise((resolve) => {
    const id = ++requestIdCounter;
    pendingCallbacks.set(id, resolve);
    const message: ParseRequestMessage = { id, type: "parse", text, paperSize };
    worker.postMessage(message);
  });
}
