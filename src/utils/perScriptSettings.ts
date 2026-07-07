/* eslint-disable @typescript-eslint/no-explicit-any */
export function getPerScriptSetting(
  key: string,
  settings: Record<string, any> | undefined,
  scriptFileName: string
): any {
  const val = settings?.[key];
  if (val === undefined || val === null) return val;
  if (!scriptFileName) return val;
  if (typeof val !== "object" || Array.isArray(val)) return val;

  const isPerScriptKeyed =
    (scriptFileName in val) ||
    Object.keys(val).some(k => k.endsWith(".fountain")) ||
    ["parking", "todos", "notepad", "productionTags", "characterProfiles", "genders"].includes(key);

  if (isPerScriptKeyed) {
    return val[scriptFileName];
  }
  return val;
}

export function migrateProductionTags(raw: any): Record<string, any> {
  if (!raw || typeof raw !== "object") return {};
  
  // Old flat format: { tags: [...], definitions: [...] }
  // Also catches hybrid format: { tags: [], definitions: [], "33.fountain": {...} }
  if ("tags" in raw || "definitions" in raw) {
    const result: Record<string, any> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (key === "tags" || key === "definitions") continue; // drop flat-format junk
      if (val && typeof val === "object" && ("tags" in (val as any) || "definitions" in (val as any))) {
        result[key] = val; // keep per-script entries
      }
    }
    // Keep flat format as-is when there are no per-script entries (e.g. empty tags)
    return Object.keys(result).length > 0 ? result : raw;
  }
  
  return raw;
}

export function updatePerScriptSetting(
  prev: Record<string, any>,
  key: string,
  scriptFileName: string,
  value: any
): Record<string, any> {
  if (!scriptFileName) return { [key]: value };
  const current = prev?.[key];
  if (current && typeof current === "object" && !Array.isArray(current)) {
    return { [key]: { ...current, [scriptFileName]: value } };
  }
  return { [key]: { [scriptFileName]: value } };
}

export function getPerScriptSettingArray<T = any>(
  key: string,
  settings: Record<string, any> | undefined,
  scriptFileName: string,
  fallback: T[] = []
): T[] {
  const val = getPerScriptSetting(key, settings, scriptFileName);
  if (Array.isArray(val)) return val;
  return fallback;
}

export function getPerScriptSettingObject<T = Record<string, any>>(
  key: string,
  settings: Record<string, any> | undefined,
  scriptFileName: string,
  fallback: T = {} as T
): T {
  const val = getPerScriptSetting(key, settings, scriptFileName);
  if (val && typeof val === "object" && !Array.isArray(val)) return val as T;
  return fallback;
}

export function getPerScriptSettingString(
  key: string,
  settings: Record<string, any> | undefined,
  scriptFileName: string,
  fallback: string = ""
): string {
  const val = getPerScriptSetting(key, settings, scriptFileName);
  if (typeof val === "string") return val;
  return fallback;
}

export function getPerScriptSettingNumber(
  key: string,
  settings: Record<string, any> | undefined,
  scriptFileName: string,
  fallback: number = 0
): number {
  const val = getPerScriptSetting(key, settings, scriptFileName);
  if (typeof val === "number" && !isNaN(val)) return val;
  return fallback;
}
