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
    if (key === "productionTags" && ("tags" in val || "definitions" in val)) {
      return val;
    }
    return val[scriptFileName];
  }
  return val;
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
