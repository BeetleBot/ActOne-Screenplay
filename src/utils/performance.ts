export interface PerformanceSample {
  operation: string;
  durationMs: number;
  characters: number;
}

const samples: PerformanceSample[] = [];
interface CalculationCounters {
  operation: string;
  executions: number;
  cacheHits: number;
  sharedRequests: number;
  totalMs: number;
}
const counters = new Map<string, CalculationCounters>();
function counter(operation: string): CalculationCounters {
  let entry = counters.get(operation);
  if (!entry) {
    if (counters.size >= 32) counters.delete(counters.keys().next().value!);
    entry = { operation, executions: 0, cacheHits: 0, sharedRequests: 0, totalMs: 0 };
    counters.set(operation, entry);
  }
  return entry;
}

export function recordCalculationReuse(operation: string, pending = false): void {
  if (!import.meta.env.DEV) return;
  const entry = counter(operation);
  if (pending) entry.sharedRequests++;
  else entry.cacheHits++;
}

export function readCalculationCounters(): CalculationCounters[] {
  return [...counters.values()].map(entry => ({ ...entry }));
}

/** Bounded development diagnostics; screenplay text is never retained. */
export function startPerformanceSample(operation: string, characters: number): () => void {
  if (!import.meta.env.DEV) return () => {};
  const start = performance.now();
  const entry = counter(operation);
  entry.executions++;
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    const durationMs = performance.now() - start;
    entry.totalMs += durationMs;
    samples.push({ operation, characters, durationMs });
    if (samples.length > 200) samples.shift();
  };
}

export function readPerformanceSamples(): PerformanceSample[] {
  return samples.map(sample => ({ ...sample }));
}
