export async function startRevisionMode(
  filePath: string | null,
  rawText: string,
  updateSettings: (updater: (prev: any) => any) => void,
  saveFileAs: () => Promise<string | null>
): Promise<boolean> {
  const isLegacy = filePath !== null && !filePath.toLowerCase().endsWith(".actone");
  if (isLegacy || !filePath) {
    const confirmSave = window.confirm(
      "Revision Mode requires saving the screenplay as an ActOne Bundle (.actone). Would you like to save it now?"
    );
    if (!confirmSave) return false;
    const newPath = await saveFileAs();
    if (!newPath || !newPath.toLowerCase().endsWith(".actone")) {
      return false;
    }
  }
  updateSettings((prev: any) => ({
    ...prev,
    revisionModeEnabled: true,
    revisionBaseText: rawText,
  }));
  return true;
}

export function mergeRevisions(
  updateSettings: (updater: (prev: any) => any) => void
) {
  const confirmMerge = window.confirm(
    "This will merge all revisions. Revision markers will be removed, and Revision Mode will be turned off. Do you want to proceed?"
  );
  if (!confirmMerge) return;
  updateSettings((prev: any) => ({
    ...prev,
    revisionModeEnabled: false,
    revisionBaseText: undefined,
  }));
}

export function discardRevisions(
  updateSettings: (updater: (prev: any) => any) => void,
  setRawText: (text: string) => void,
  baseText: string | undefined
) {
  if (!baseText) return;
  const confirmDiscard = window.confirm(
    "Are you sure you want to discard all current revisions and revert to the base draft?"
  );
  if (!confirmDiscard) return;
  setRawText(baseText);
  updateSettings((prev: any) => ({
    ...prev,
    revisionModeEnabled: false,
    revisionBaseText: undefined,
  }));
}
