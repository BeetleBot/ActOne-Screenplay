export interface PerformanceSample {
  operation: string;
  durationMs: number;
  characters: number;
}

const samples: PerformanceSample[] = [];

/** Bounded development diagnostics; screenplay text is never retained. */
export function startPerformanceSample(operation: string, characters: number): () => void {
  if (!import.meta.env.DEV) return () => {};
  const start = performance.now();
  return () => {
    samples.push({ operation, characters, durationMs: performance.now() - start });
    if (samples.length > 200) samples.shift();
  };
}

export function readPerformanceSamples(): PerformanceSample[] {
  return samples.map(sample => ({ ...sample }));
}
