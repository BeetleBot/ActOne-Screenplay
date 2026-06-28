export function getPerScriptSetting(
  key: string,
  settings: Record<string, any> | undefined,
  scriptFileName: string
): any {
  const val = settings?.[key];
  if (val === undefined || val === null) return val;
  if (!scriptFileName) return val;
  if (typeof val !== "object" || Array.isArray(val)) return val;
  if (val[scriptFileName] !== undefined) return val[scriptFileName];
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
