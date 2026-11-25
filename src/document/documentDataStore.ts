import { recordCalculationReuse, startPerformanceSample } from "../utils/performance";

/** Keys are immutable input snapshots, not paths or script positions. Weak keys
 * allow closed documents and obsolete revisions to be collected automatically. */
export function createDocumentCalculation<Input extends object, Result>(
  name: string,
  calculate: (input: Input, options: string) => Result,
  maxOptions = 4,
) {
  const snapshots = new WeakMap<Input, Map<string, Result>>();
  const read = (input: Input, options = ""): Result => {
    let results = snapshots.get(input);
    if (results?.has(options)) {
      recordCalculationReuse(name);
      return results.get(options)!;
    }
    const finish = startPerformanceSample(name, 0);
    let result: Result;
    try {
      result = calculate(input, options);
    } finally {
      finish();
    }
    if (!results) {
      results = new Map();
      snapshots.set(input, results);
    }
    if (results.size >= maxOptions) results.delete(results.keys().next().value!);
    results.set(options, result);
    return result;
  };
  return Object.assign(read, {
    peek: (input: Input, options = ""): Result | undefined => snapshots.get(input)?.get(options),
    prime: (input: Input, result: Result, options = ""): void => {
      let results = snapshots.get(input);
      if (!results) {
        results = new Map();
        snapshots.set(input, results);
      }
      if (!results.has(options) && results.size >= maxOptions) results.delete(results.keys().next().value!);
      results.set(options, result);
    },
  });
}

/** Share only running work. Failures and completed results are not retained.
 * Callers remain responsible for validating results and rejecting stale revisions. */
export function createSharedRequests(name = "shared-request") {
  const pending = new Map<string, Promise<unknown>>();
  return function request<Result>(key: string, run: () => Promise<Result>): Promise<Result> {
    const existing = pending.get(key);
    if (existing) {
      recordCalculationReuse(name, true);
      return existing as Promise<Result>;
    }
    const finish = startPerformanceSample(name, 0);
    const job = Promise.resolve().then(run);
    pending.set(key, job);
    void job
      .finally(() => {
        finish();
        if (pending.get(key) === job) pending.delete(key);
      })
      .catch(() => {});
    return job;
  };
}

export interface TextCacheLimits {
  maxCharacters: number;
  maxSnapshots: number;
  maxOptions: number;
}

/** Exact-input cache for calculations whose output has no document identity.
 * Bounds retained source text as well as the number of option variants. */
export function createTextCalculation<Result>(
  name: string,
  calculate: (text: string, options: string) => Result,
  limits: TextCacheLimits = { maxCharacters: 1_000_000, maxSnapshots: 2, maxOptions: 4 },
) {
  const snapshots = new Map<string, Map<string, Result>>();
  let characters = 0;
  return (text: string, options = ""): Result => {
    let results = snapshots.get(text);
    if (results?.has(options)) {
      recordCalculationReuse(name);
      return results.get(options)!;
    }
    const finish = startPerformanceSample(name, text.length);
    let result: Result;
    try {
      result = calculate(text, options);
    } finally {
      finish();
    }
    if (text.length > limits.maxCharacters || limits.maxSnapshots < 1 || limits.maxOptions < 1) return result;
    if (!results) {
      while (
        snapshots.size &&
        (snapshots.size >= limits.maxSnapshots || characters + text.length > limits.maxCharacters)
      ) {
        const oldest = snapshots.keys().next().value!;
        snapshots.delete(oldest);
        characters -= oldest.length;
      }
      results = new Map();
      snapshots.set(text, results);
      characters += text.length;
    }
    if (results.size >= limits.maxOptions) results.delete(results.keys().next().value!);
    results.set(options, result);
    return result;
  };
}
