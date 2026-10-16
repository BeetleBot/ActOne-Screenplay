import type { ScreenplayFile } from "../context/FileContext";
import type { ScriptInfo } from "./actone";

/** A completed write acknowledges its snapshot, never edits made during that write. */
export function acknowledgeSavedFile(current: ScreenplayFile, snapshot: ScreenplayFile, writtenScripts?: ScriptInfo[]): ScreenplayFile {
  const scripts = writtenScripts
    ? (current.scripts?.length ? current.scripts : writtenScripts).map(script => {
        const written = writtenScripts.find(saved => saved.fileName === script.fileName);
        return written ? { ...script, savedContent: written.content } : script;
      })
    : undefined;
  const savedText = scripts?.[current.activeScriptIndex ?? 0]?.savedContent ?? snapshot.rawText;
  const structureChanged = scripts !== undefined && (
    scripts.length !== writtenScripts?.length || scripts.some((script, index) => {
      const written = writtenScripts?.[index];
      return !written || written.fileName !== script.fileName || written.name !== script.name;
    })
  );
  const contentChanged = scripts ? scripts.some(script => script.content !== script.savedContent) : current.rawText !== snapshot.rawText;
  const settingsChanged = JSON.stringify(current.parsedDoc.settings) !== JSON.stringify(snapshot.parsedDoc.settings);
  return { ...current, scripts, savedText, isDirty: structureChanged || contentChanged || settingsChanged };
}
