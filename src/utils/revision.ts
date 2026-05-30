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


