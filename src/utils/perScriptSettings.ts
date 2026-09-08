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
    ["parking", "todos", "notepad", "characterProfiles", "genders"].includes(key);

  if (isPerScriptKeyed) {
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

export function migrateSettingsKey(
  settings: Record<string, any> | undefined,
  oldFileName: string,
  newFileName: string
): Record<string, any> {
  if (!settings || typeof settings !== "object") return settings || {};
  if (oldFileName === newFileName || !oldFileName || !newFileName) return settings;
  const KEYED_PROPS = ["notepad", "todos", "parking", "genders", "characterProfiles"];
  const migrated = { ...settings };

  for (const key of KEYED_PROPS) {
    const val = migrated[key];
    if (val && typeof val === "object" && !Array.isArray(val) && oldFileName in val) {
      const { [oldFileName]: data, ...rest } = val;
      migrated[key] = { ...rest, [newFileName]: data };
    }
  }
  return migrated;
}

export function removeSettingsKey(
  settings: Record<string, any> | undefined,
  fileName: string
): Record<string, any> {
  if (!settings || typeof settings !== "object") return settings || {};
  if (!fileName) return settings;
  const KEYED_PROPS = ["notepad", "todos", "parking", "genders", "characterProfiles"];
  const cleaned = { ...settings };

  for (const key of KEYED_PROPS) {
    const val = cleaned[key];
    if (val && typeof val === "object" && !Array.isArray(val) && fileName in val) {
      const rest = { ...val };
      delete rest[fileName];
      cleaned[key] = rest;
    }
  }
  return cleaned;
}
