import { parseScreenplay, FountainDocument } from "../parser";
import type { ParseRequestMessage, ParseResponseMessage } from "../workers/parserWorker";
import { startPerformanceSample } from "./performance";

interface ParseJob {
  id: number;
  text: string;
  paperSize?: "a4" | "letter";
  key: string;
  resolve: (doc: FountainDocument | null) => void;
  reject: (error: unknown) => void;
  finish: () => void;
}

const PARSE_TIMEOUT_MS = 30_000;
let worker: Worker | null = null;
let requestId = 0;
let failures = 0;
let active: ParseJob | null = null;
let timeout: ReturnType<typeof setTimeout> | undefined;
const queued = new Map<string, ParseJob>();

function finishJob(job: ParseJob, doc: FountainDocument | null) {
  job.finish();
  job.resolve(doc);
}

function parseFallback(job: ParseJob) {
  try { finishJob(job, parseScreenplay(job.text, job.paperSize)); }
  catch (error) { job.finish(); job.reject(error); }
}

function failWorker(failedWorker: Worker) {
  if (worker !== failedWorker) return;
  clearTimeout(timeout);
  failedWorker.terminate();
  worker = null;
  failures++;
  const failed = active;
  active = null;
  if (failed) parseFallback(failed);
  pump();
}

function getWorker(): Worker | null {
  if (failures >= 2 || typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    const instance = new Worker(new URL("../workers/parserWorker.ts", import.meta.url), { type: "module" });
    worker = instance;
    instance.onerror = () => failWorker(instance);
    instance.onmessageerror = () => failWorker(instance);
    instance.onmessage = (event: MessageEvent<ParseResponseMessage>) => {
      const response = event.data;
      if (!response || !active || response.id !== active.id ||
          (response.type !== "parsed" && response.type !== "error")) {
        failWorker(instance);
        return;
      }
      if (response.type === "error" || !response.doc || !Array.isArray(response.doc.lines)) {
        failWorker(instance);
        return;
      }
      clearTimeout(timeout);
      const completed = active;
      active = null;
      failures = 0;
      finishJob(completed, response.doc);
      pump();
    };
    return worker;
  } catch {
    worker = null;
    failures++;
    return null;
  }
}

function pump() {
  if (active) return;
  const next = queued.values().next().value as ParseJob | undefined;
  if (!next) return;
  queued.delete(next.key);
  const instance = getWorker();
  if (!instance) {
    let job: ParseJob | undefined = next;
    while (job) {
      parseFallback(job);
      job = queued.values().next().value as ParseJob | undefined;
      if (job) queued.delete(job.key);
    }
    return;
  }
  active = next;
  timeout = setTimeout(() => {
    if (active === next) failWorker(instance);
  }, PARSE_TIMEOUT_MS);
  const message: ParseRequestMessage = { id: next.id, type: "parse", text: next.text, paperSize: next.paperSize };
  try { instance.postMessage(message); }
  catch { failWorker(instance); }
}

export function parseScreenplayAsync(text: string, paperSize?: "a4" | "letter"): Promise<FountainDocument>;
export function parseScreenplayAsync(text: string, paperSize: "a4" | "letter" | undefined, documentKey: string): Promise<FountainDocument | null>;
export function parseScreenplayAsync(text: string, paperSize?: "a4" | "letter", documentKey?: string): Promise<FountainDocument | null> {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    const key = documentKey ?? `request:${id}`;
    const superseded = queued.get(key);
    if (superseded) finishJob(superseded, null);
    queued.set(key, { id, key, text, paperSize, resolve, reject, finish: startPerformanceSample("parse", text.length) });
    pump();
  });
}

/** Dispose a client during HMR and in isolated worker lifecycle tests. */
export function disposeParserWorker(): void {
  clearTimeout(timeout);
  worker?.terminate();
  worker = null;
  if (active) { parseFallback(active); active = null; }
  for (const job of queued.values()) parseFallback(job);
  queued.clear();
  failures = 0;
}

if (import.meta.hot) import.meta.hot.dispose(disposeParserWorker);
