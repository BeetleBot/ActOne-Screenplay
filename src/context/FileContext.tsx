import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { parseScreenplay, FountainDocument } from "../parser/FountainParser";
import { invoke } from "@tauri-apps/api/core";
import { useUI } from "./UIContext";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";
import { computeRevisedLines } from "../utils/diff";

export interface ScreenplayFile {
  id: string;
  filePath: string | null;
  rawText: string;
  parsedDoc: FountainDocument;
  isSaving: boolean;
  isDirty: boolean;
  savedText: string;
}

export interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

export interface FileContextProps {
  files: ScreenplayFile[];
  activeFileId: string;
  filePath: string | null;
  isSaving: boolean;
  rawText: string;
  parsedDoc: FountainDocument;
  setRawText: (text: string) => void;
  openFile: () => Promise<void>;
  saveFile: () => Promise<void>;
  saveFileAs: () => Promise<string | null>;
  selectFile: (id: string) => void;
  newFile: (initialContent?: string) => void;
  closeFile: (id: string) => void;
  closeOthers: (id: string) => void;
  closeAll: () => void;
  recentFiles: RecentFile[];
  openFilePath: (path: string) => Promise<void>;
  removeFromRecent: (path: string) => void;
  updateSettings: (updater: (prev: any) => any) => void;
}

const FileContext = createContext<FileContextProps | undefined>(undefined);

export const useFile = () => {
  const context = useContext(FileContext);
  if (!context) throw new Error("useFile must be used within a FileProvider");
  return context;
};

export const FileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { paperSize, fontFamily } = useUI();

  const generateUUID = () => "file-" + Math.random().toString(36).substring(2, 15);

  const defaultText = "";

  const [files, setFiles] = useState<ScreenplayFile[]>([]);
  const [activeFileId, setActiveFileIdState] = useState<string>("");
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(() => {
    const saved = localStorage.getItem("actone-recent-files");
    return saved ? JSON.parse(saved) : [];
  });

  const addToRecent = (path: string) => {
    setRecentFiles(prev => {
      const name = path.split(/[/\\]/).pop() || "Untitled";
      const filtered = prev.filter(f => f.path !== path);
      const updated = [{ path, name, lastOpened: Date.now() }, ...filtered].slice(0, 10);
      localStorage.setItem("actone-recent-files", JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromRecent = (path: string) => {
    setRecentFiles(prev => {
      const updated = prev.filter(f => f.path !== path);
      localStorage.setItem("actone-recent-files", JSON.stringify(updated));
      return updated;
    });
  };

  const [rawText, setRawTextState] = useState<string>(defaultText);
  const [parsedDoc, setParsedDoc] = useState<FountainDocument>(() => parseScreenplay(defaultText, paperSize));
  const [filePath, setFilePath] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    setFiles(prev => prev.map(f => {
      const doc = parseScreenplay(f.rawText, paperSize);
      const mergedSettings = (doc.settings && Object.keys(doc.settings).length > 0)
        ? doc.settings
        : f.parsedDoc.settings;
      return { ...f, parsedDoc: { ...doc, pageBreaks: undefined, settings: mergedSettings } };
    }));
    setParsedDoc(prevDoc => {
      const doc = parseScreenplay(rawText, paperSize);
      const mergedSettings = (doc.settings && Object.keys(doc.settings).length > 0)
        ? doc.settings
        : prevDoc.settings;
      return { ...doc, pageBreaks: undefined, settings: mergedSettings };
    });
  }, [paperSize]);

  const selectFile = (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;
    setActiveFileIdState(id);
    setRawTextState(file.rawText);
    setFilePath(file.filePath);
    setParsedDoc(file.parsedDoc);
    setIsSaving(file.isSaving);
  };

  const newFile = (initialContent: string = "") => {
    const newId = generateUUID();
    const newFileObj: ScreenplayFile = {
      id: newId,
      filePath: null,
      rawText: initialContent,
      parsedDoc: parseScreenplay(initialContent, paperSize),
      isSaving: false,
      isDirty: initialContent !== "",
      savedText: "",
    };
    setFiles(prev => [...prev, newFileObj]);
    setActiveFileIdState(newId);
    setRawTextState(initialContent);
    setFilePath(null);
    setParsedDoc(newFileObj.parsedDoc);
  };

  const closeFile = (id: string) => {
    const fileToClose = files.find(f => f.id === id);
    if (!fileToClose) return;

    if (fileToClose.isDirty) {
      const confirmClose = window.confirm(`"${fileToClose.filePath ? fileToClose.filePath.split(/[/\\]/).pop() : 'Untitled'}" has unsaved changes. Are you sure you want to close it?`);
      if (!confirmClose) return;
    }

    const index = files.findIndex(f => f.id === id);
    const newFiles = files.filter(f => f.id !== id);

    if (newFiles.length === 0) {
      setFiles([]);
      setActiveFileIdState("");
      setRawTextState("");
      setFilePath(null);
      setParsedDoc(parseScreenplay("", paperSize));
    } else {
      setFiles(newFiles);
      if (activeFileId === id) {
        const nextActiveIndex = index >= newFiles.length ? newFiles.length - 1 : index;
        const nextFile = newFiles[nextActiveIndex];
        setActiveFileIdState(nextFile.id);
        setRawTextState(nextFile.rawText);
        setFilePath(nextFile.filePath);
        setParsedDoc(nextFile.parsedDoc);
      }
    }
  };

  const closeOthers = (id: string) => {
    const dirtyOthers = files.filter(f => f.id !== id && f.isDirty);
    if (dirtyOthers.length > 0) {
      if (!window.confirm(`There are ${dirtyOthers.length} unsaved files. Are you sure you want to close them?`)) {
        return;
      }
    }
    const fileToKeep = files.find(f => f.id === id);
    if (fileToKeep) {
      setFiles([fileToKeep]);
      selectFile(id);
    }
  };

  const closeAll = () => {
    const dirtyFiles = files.filter(f => f.isDirty);
    if (dirtyFiles.length > 0) {
      if (!window.confirm(`There are ${dirtyFiles.length} unsaved files. Are you sure you want to close them?`)) {
        return;
      }
    }
    setFiles([]);
    setActiveFileIdState("");
    setRawTextState("");
    setFilePath(null);
    setParsedDoc(parseScreenplay("", paperSize));
  };

  const setRawText = (text: string) => {
    const normalized = text.replace(/\r\n/g, "\n");
    setRawTextState(normalized);
    
    const doc = parseScreenplay(normalized, paperSize);
    setFiles(prev => prev.map(f => {
      if (f.id === activeFileId) {
        const isDirty = normalized !== f.savedText;
        const mergedSettings = (doc.settings && Object.keys(doc.settings).length > 0)
          ? doc.settings
          : f.parsedDoc.settings;
        return { ...f, rawText: normalized, isDirty, parsedDoc: { ...doc, pageBreaks: undefined, settings: mergedSettings } };
      }
      return f;
    }));
    setParsedDoc(prevDoc => {
      const mergedSettings = (doc.settings && Object.keys(doc.settings).length > 0)
        ? doc.settings
        : prevDoc.settings;
      return { ...doc, pageBreaks: undefined, settings: mergedSettings };
    });
  };

  const updateSettings = (updater: (prev: any) => any) => {
    setFiles(prev => prev.map(f => {
      if (f.id === activeFileId) {
        const nextSettings = updater(f.parsedDoc.settings || {});
        return {
          ...f,
          isDirty: true,
          parsedDoc: {
            ...f.parsedDoc,
            settings: nextSettings
          }
        };
      }
      return f;
    }));
    setParsedDoc(prevDoc => {
      const nextSettings = updater(prevDoc.settings || {});
      return {
        ...prevDoc,
        settings: nextSettings
      };
    });
  };

  const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;

  const revisionModeEnabled = parsedDoc?.settings?.revisionModeEnabled;
  const revisionBaseText = parsedDoc?.settings?.revisionBaseText;

  useEffect(() => {
    if (!isTauri) return;

    const handler = setTimeout(async () => {
      try {
        let revisedLines: boolean[] = [];
        if (revisionModeEnabled && typeof revisionBaseText === "string") {
          revisedLines = computeRevisedLines(revisionBaseText, rawText);
        }

        const breaks = await invoke<number[]>("get_page_breaks", {
          fountainText: rawText,
          paperSize,
          fontFamily,
          boldSceneHeadings: false,
          mirrorSceneNumbers: "off",
          exportSections: false,
          exportSynopses: false,
          exportTitlePage: true,
          revisedLines,
        });

        if (breaks) {
          setParsedDoc(prev => {
            if (prev.screenplayText === rawText) {
              return { ...prev, pageBreaks: breaks };
            }
            return prev;
          });
          setFiles(prev => prev.map(f => {
            if (f.id === activeFileId && f.rawText === rawText) {
              return { ...f, parsedDoc: { ...f.parsedDoc, pageBreaks: breaks } };
            }
            return f;
          }));
        }
      } catch (err) {
        console.error(err);
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [rawText, paperSize, fontFamily, activeFileId, isTauri, revisionModeEnabled, revisionBaseText]);

  useEffect(() => {
    if (isTauri) return;

    const handler = setTimeout(() => {
      const parsed = parseScreenplay(rawText, paperSize);
      if (parsed.pageBreaks) {
        setParsedDoc(prev => {
          if (prev.screenplayText === rawText) {
            return { ...prev, pageBreaks: parsed.pageBreaks };
          }
          return prev;
        });
        setFiles(prev => prev.map(f => {
          if (f.id === activeFileId && f.rawText === rawText) {
            return { ...f, parsedDoc: { ...f.parsedDoc, pageBreaks: parsed.pageBreaks } };
          }
          return f;
        }));
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [rawText, paperSize, activeFileId, isTauri]);

  const openFilePath = async (path: string) => {
    const existing = files.find(f => f.filePath === path);
    if (existing) {
      selectFile(existing.id);
      return;
    }

    let content = "";
    let settings = {};
    const isActone = path.toLowerCase().endsWith(".actone");

    try {
      if (isTauri) {
        if (isActone) {
          const bytes = await invoke<number[]>("read_file_binary", { path });
          const u8 = new Uint8Array(bytes);
          const unzipped = unzipSync(u8);
          if (unzipped["document.fountain"]) {
            content = strFromU8(unzipped["document.fountain"]);
          }
          let parsedSettings = {};
          let genders = {};
          let revisionData = {};
          let todosData: any[] = [];
          let parkingData: any[] = [];
          let notepadData = "";
          let sprintData: any[] = [];
          let markerData: any[] = [];
          let productionTagsData: any = { tags: [], definitions: [] };
          if (unzipped["settings.json"]) {
            try {
              parsedSettings = JSON.parse(strFromU8(unzipped["settings.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["characters.json"]) {
            try {
              const chars = JSON.parse(strFromU8(unzipped["characters.json"]));
              genders = chars.genders || {};
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["revision.json"]) {
            try {
              revisionData = JSON.parse(strFromU8(unzipped["revision.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["todos.json"]) {
            try {
              todosData = JSON.parse(strFromU8(unzipped["todos.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["parking.json"]) {
            try {
              parkingData = JSON.parse(strFromU8(unzipped["parking.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["notepad.json"]) {
            try {
              notepadData = JSON.parse(strFromU8(unzipped["notepad.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["sprint_data.json"]) {
            try {
              sprintData = JSON.parse(strFromU8(unzipped["sprint_data.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["marker.json"]) {
            try {
              markerData = JSON.parse(strFromU8(unzipped["marker.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["production_tags.json"]) {
            try {
              productionTagsData = JSON.parse(strFromU8(unzipped["production_tags.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          settings = { ...parsedSettings, genders, ...revisionData, todos: todosData, parking: parkingData, notepad: notepadData, sprintHistory: sprintData, markers: markerData, productionTags: productionTagsData };
        } else {
          content = await invoke<string>("read_file_content", { path });
        }
      } else {
        throw new Error("Cannot open direct path in web mode");
      }
    } catch (e) {
      console.error(e);
      removeFromRecent(path);
      alert("Could not open file: " + path);
      return;
    }

    const parsed = parseScreenplay(content, paperSize);
    if (isActone) {
      parsed.settings = settings;
    }
    const cleanText = parsed.screenplayText;
    
    const currentActive = files.find(f => f.id === activeFileId);
    const isDefault = currentActive && !currentActive.filePath && 
                      (currentActive.rawText === "" || !currentActive.isDirty);

    if (isDefault && currentActive) {
      setFiles(prev => prev.map(f => f.id === activeFileId ? {
        ...f,
        filePath: path,
        rawText: cleanText,
        savedText: cleanText,
        isDirty: false,
        parsedDoc: parsed
      } : f));
      setFilePath(path);
      setRawTextState(cleanText);
      setParsedDoc(parsed);
      addToRecent(path);
    } else {
      const newId = generateUUID();
      const newFileObj: ScreenplayFile = {
        id: newId,
        filePath: path,
        rawText: cleanText,
        savedText: cleanText,
        isDirty: false,
        parsedDoc: parsed,
        isSaving: false,
      };
      setFiles(prev => [...prev, newFileObj]);
      setActiveFileIdState(newId);
      setFilePath(path);
      setRawTextState(cleanText);
      setParsedDoc(parsed);
      addToRecent(path);
    }
  };

  const openFile = async () => {
    let res: { path: string; content: string; settings?: any } | null = null;
    if (isTauri) {
      try {
        res = await invoke<{ path: string; content: string } | null>("open_file_dialog");
      } catch (e) {
        console.error(e);
      }
    } else {
      res = await new Promise<{ path: string; content: string; settings?: any } | null>((resolve) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".fountain,.txt,.actone";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          if (file.name.toLowerCase().endsWith(".actone")) {
            const arrayBuffer = await file.arrayBuffer();
            const u8 = new Uint8Array(arrayBuffer);
            const unzipped = unzipSync(u8);
            let content = "";
            let settings = {};
            let parsedSettings = {};
            let genders = {};
            let revisionData = {};
            if (unzipped["document.fountain"]) {
              content = strFromU8(unzipped["document.fountain"]);
            }
            if (unzipped["settings.json"]) {
              try {
                parsedSettings = JSON.parse(strFromU8(unzipped["settings.json"]));
              } catch (e) {
                console.error(e);
              }
            }
            if (unzipped["characters.json"]) {
              try {
                const chars = JSON.parse(strFromU8(unzipped["characters.json"]));
                genders = chars.genders || {};
              } catch (e) {
                console.error(e);
              }
            }
          if (unzipped["revision.json"]) {
            try {
              revisionData = JSON.parse(strFromU8(unzipped["revision.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          let todosData: any[] = [];
          let parkingData: any[] = [];
          let notepadData = "";
          let sprintData: any[] = [];
          let markerData: any[] = [];
          let productionTagsData: any = { tags: [], definitions: [] };
          if (unzipped["todos.json"]) {
            try {
              todosData = JSON.parse(strFromU8(unzipped["todos.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["parking.json"]) {
            try {
              parkingData = JSON.parse(strFromU8(unzipped["parking.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["notepad.json"]) {
            try {
              notepadData = JSON.parse(strFromU8(unzipped["notepad.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["sprint_data.json"]) {
            try {
              sprintData = JSON.parse(strFromU8(unzipped["sprint_data.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["marker.json"]) {
            try {
              markerData = JSON.parse(strFromU8(unzipped["marker.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["production_tags.json"]) {
            try {
              productionTagsData = JSON.parse(strFromU8(unzipped["production_tags.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          settings = { ...parsedSettings, genders, ...revisionData, todos: todosData, parking: parkingData, notepad: notepadData, sprintHistory: sprintData, markers: markerData, productionTags: productionTagsData };
            resolve({ path: file.name, content, settings });
          } else {
            const content = await file.text();
            resolve({ path: file.name, content });
          }
        };
        input.click();
      });
    }

    if (res) {
      if (isTauri) addToRecent(res.path);
      const existing = files.find(f => f.filePath === res.path);
      if (existing) {
        selectFile(existing.id);
        return;
      }

      const currentActive = files.find(f => f.id === activeFileId);
      const isDefault = currentActive && !currentActive.filePath && 
                        (currentActive.rawText === "" || !currentActive.isDirty);

      let content = res.content;
      let settings = res.settings || {};
      const isActone = res.path.toLowerCase().endsWith(".actone");

      if (isActone && isTauri) {
        try {
          const bytes = await invoke<number[]>("read_file_binary", { path: res.path });
          const u8 = new Uint8Array(bytes);
          const unzipped = unzipSync(u8);
          if (unzipped["document.fountain"]) {
            content = strFromU8(unzipped["document.fountain"]);
          }
          let parsedSettings = {};
          let genders = {};
          let revisionData = {};
          let todosData: any[] = [];
          let parkingData: any[] = [];
          let notepadData = "";
          let sprintData: any[] = [];
          let markerData: any[] = [];
          let productionTagsData: any = { tags: [], definitions: [] };
          if (unzipped["settings.json"]) {
            try {
              parsedSettings = JSON.parse(strFromU8(unzipped["settings.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["characters.json"]) {
            try {
              const chars = JSON.parse(strFromU8(unzipped["characters.json"]));
              genders = chars.genders || {};
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["revision.json"]) {
            try {
              revisionData = JSON.parse(strFromU8(unzipped["revision.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["todos.json"]) {
            try {
              todosData = JSON.parse(strFromU8(unzipped["todos.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["parking.json"]) {
            try {
              parkingData = JSON.parse(strFromU8(unzipped["parking.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["notepad.json"]) {
            try {
              notepadData = JSON.parse(strFromU8(unzipped["notepad.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["sprint_data.json"]) {
            try {
              sprintData = JSON.parse(strFromU8(unzipped["sprint_data.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["marker.json"]) {
            try {
              markerData = JSON.parse(strFromU8(unzipped["marker.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          if (unzipped["production_tags.json"]) {
            try {
              productionTagsData = JSON.parse(strFromU8(unzipped["production_tags.json"]));
            } catch (e) {
              console.error(e);
            }
          }
          settings = { ...parsedSettings, genders, ...revisionData, todos: todosData, parking: parkingData, notepad: notepadData, sprintHistory: sprintData, markers: markerData, productionTags: productionTagsData };
        } catch (e) {
          console.error(e);
          alert("Could not read actone bundle binary");
          return;
        }
      }

      const parsed = parseScreenplay(content, paperSize);
      if (isActone) {
        parsed.settings = settings;
      }
      const cleanText = parsed.screenplayText;

      if (isDefault && currentActive) {
        const updatedFiles = files.map(f => f.id === activeFileId ? {
          ...f,
          filePath: res.path,
          rawText: cleanText,
          savedText: cleanText,
          isDirty: false,
          parsedDoc: parsed
        } : f);
        setFiles(updatedFiles);
        setFilePath(res.path);
        setRawTextState(cleanText);
        setParsedDoc(parsed);
      } else {
        const newId = generateUUID();
        const newFileObj: ScreenplayFile = {
          id: newId,
          filePath: res.path,
          rawText: cleanText,
          savedText: cleanText,
          isDirty: false,
          parsedDoc: parsed,
          isSaving: false,
        };
        setFiles(prev => [...prev, newFileObj]);
        setActiveFileIdState(newId);
        setFilePath(res.path);
        setRawTextState(cleanText);
        setParsedDoc(parsed);
      }
    }
  };

  const saveActoneFile = async (path: string, text: string, settings: any) => {
    const { genders, revisionModeEnabled, revisionBaseText, todos, parking, notepad, sprintHistory: sprintData, markers, productionTags, ...restSettings } = settings || {};
    const characters = genders ? { genders } : {};
    const revision = { revisionModeEnabled, revisionBaseText };
    const zipped = zipSync({
      "document.fountain": strToU8(text),
      "settings.json": strToU8(JSON.stringify(restSettings || {}, null, 2)),
      "characters.json": strToU8(JSON.stringify(characters, null, 2)),
      "revision.json": strToU8(JSON.stringify(revision, null, 2)),
      "todos.json": strToU8(JSON.stringify(todos || [], null, 2)),
      "parking.json": strToU8(JSON.stringify(parking || [], null, 2)),
      "notepad.json": strToU8(JSON.stringify(notepad || "", null, 2)),
      "sprint_data.json": strToU8(JSON.stringify(sprintData || [], null, 2)),
      "marker.json": strToU8(JSON.stringify(markers || [], null, 2)),
      "production_tags.json": strToU8(JSON.stringify(productionTags || { tags: [], definitions: [] }, null, 2)),
    });
    await invoke("save_file_binary", { path, bytes: Array.from(zipped) });
  };

  const saveFile = async () => {
    const currentActive = files.find(f => f.id === activeFileId);
    if (!currentActive) return;
    if (!currentActive.filePath) {
      await saveFileAs();
      return;
    }

    const cleanFountainText = currentActive.parsedDoc.lines.map(l => l.text).join("\n");
    const isActone = currentActive.filePath.toLowerCase().endsWith(".actone");

    if (isActone) {
      if (isTauri) {
        setIsSaving(true);
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: true } : f));
        try {
          await saveActoneFile(currentActive.filePath, cleanFountainText, currentActive.parsedDoc.settings);
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false, savedText: rawText } : f));
        } catch (e) {
          console.error(e);
        } finally {
          setIsSaving(false);
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: false } : f));
        }
      } else {
        const { genders, revisionModeEnabled, revisionBaseText, todos, parking, notepad, sprintHistory: sprintData, markers, productionTags, ...restSettings } = currentActive.parsedDoc.settings || {};
        const characters = genders ? { genders } : {};
        const revision = { revisionModeEnabled, revisionBaseText };
        const zipped = zipSync({
          "document.fountain": strToU8(cleanFountainText),
          "settings.json": strToU8(JSON.stringify(restSettings || {}, null, 2)),
          "characters.json": strToU8(JSON.stringify(characters, null, 2)),
          "revision.json": strToU8(JSON.stringify(revision, null, 2)),
          "todos.json": strToU8(JSON.stringify(todos || [], null, 2)),
          "parking.json": strToU8(JSON.stringify(parking || [], null, 2)),
          "notepad.json": strToU8(JSON.stringify(notepad || "", null, 2)),
          "sprint_data.json": strToU8(JSON.stringify(sprintData || [], null, 2)),
          "marker.json": strToU8(JSON.stringify(markers || [], null, 2)),
          "production_tags.json": strToU8(JSON.stringify(productionTags || { tags: [], definitions: [] }, null, 2)),
        });
        const blob = new Blob([zipped], { type: "application/zip" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = currentActive.filePath;
        link.click();
        URL.revokeObjectURL(url);
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false, savedText: rawText } : f));
      }
    } else {
      if (isTauri) {
        setIsSaving(true);
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: true } : f));
        try {
          await invoke("save_file_content", { path: currentActive.filePath, content: cleanFountainText });
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false, savedText: rawText } : f));
        } catch (e) {
          console.error(e);
        } finally {
          setIsSaving(false);
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isSaving: false } : f));
        }
      } else {
        const blob = new Blob([cleanFountainText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = currentActive.filePath.endsWith(".fountain") ? currentActive.filePath : `${currentActive.filePath}.fountain`;
        link.click();
        URL.revokeObjectURL(url);
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, isDirty: false, savedText: rawText } : f));
      }
    }
  };

  const saveFileAs = async (): Promise<string | null> => {
    const currentActive = files.find(f => f.id === activeFileId);
    if (!currentActive) return null;
    const cleanFountainText = currentActive.parsedDoc.lines.map(l => l.text).join("\n");

    if (isTauri) {
      try {
        const path = await invoke<string | null>("save_file_dialog", { content: cleanFountainText });
        if (path) {
          const isActone = path.toLowerCase().endsWith(".actone");
          if (isActone) {
            await saveActoneFile(path, cleanFountainText, currentActive.parsedDoc.settings);
          }
          setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, filePath: path, isDirty: false, savedText: rawText } : f));
          setFilePath(path);
          addToRecent(path);
          return path;
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      const filename = window.prompt("Enter filename to save:", filePath || "Untitled.actone");
      if (filename) {
        let isActone = filename.toLowerCase().endsWith(".actone");
        let finalName = filename;
        if (!filename.includes(".")) {
          finalName = filename + ".actone";
          isActone = true;
        } else {
          finalName = isActone ? filename : (filename.endsWith(".fountain") ? filename : `${filename}.fountain`);
        }
        let blob: Blob;

        if (isActone) {
          const { genders, revisionModeEnabled, revisionBaseText, todos, parking, notepad, sprintHistory: sprintData, markers, productionTags, ...restSettings } = currentActive.parsedDoc.settings || {};
          const characters = genders ? { genders } : {};
          const revision = { revisionModeEnabled, revisionBaseText };
          const zipped = zipSync({
            "document.fountain": strToU8(cleanFountainText),
            "settings.json": strToU8(JSON.stringify(restSettings || {}, null, 2)),
            "characters.json": strToU8(JSON.stringify(characters, null, 2)),
            "revision.json": strToU8(JSON.stringify(revision, null, 2)),
            "todos.json": strToU8(JSON.stringify(todos || [], null, 2)),
            "parking.json": strToU8(JSON.stringify(parking || [], null, 2)),
            "notepad.json": strToU8(JSON.stringify(notepad || "", null, 2)),
            "sprint_data.json": strToU8(JSON.stringify(sprintData || [], null, 2)),
            "marker.json": strToU8(JSON.stringify(markers || [], null, 2)),
            "production_tags.json": strToU8(JSON.stringify(productionTags || { tags: [], definitions: [] }, null, 2)),
          });
          blob = new Blob([zipped], { type: "application/zip" });
        } else {
          blob = new Blob([cleanFountainText], { type: "text/plain;charset=utf-8" });
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = finalName;
        link.click();
        URL.revokeObjectURL(url);
        
        setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, filePath: finalName, isDirty: false, savedText: rawText } : f));
        setFilePath(finalName);
        return finalName;
      }
    }
    return null;
  };

  const filesRef = useRef(files);
  const activeFileIdRef = useRef(activeFileId);
  const selectFileRef = useRef(selectFile);
  const saveFileRef = useRef(saveFile);

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  useEffect(() => {
    selectFileRef.current = selectFile;
  }, [selectFile]);

  useEffect(() => {
    saveFileRef.current = saveFile;
  });

  const { autoSaveEnabled, autoSaveInterval } = useUI();

  useEffect(() => {
    if (!autoSaveEnabled) return;
    const timer = setInterval(() => {
      const currentFiles = filesRef.current;
      const currentId = activeFileIdRef.current;
      const file = currentFiles.find(f => f.id === currentId);
      if (file && file.isDirty && file.filePath) {
        saveFileRef.current();
      }
    }, autoSaveInterval);
    return () => clearInterval(timer);
  }, [autoSaveEnabled, autoSaveInterval]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (((e.key === "Tab" || e.keyCode === 9) && e.ctrlKey) || (e.key === "PageDown" && e.ctrlKey) || (e.key === "PageUp" && e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const currentFiles = filesRef.current;
        const currentActiveId = activeFileIdRef.current;
        if (currentFiles.length <= 1) return;

        const currentIndex = currentFiles.findIndex(f => f.id === currentActiveId);
        let nextIndex;
        if (e.shiftKey || e.key === "PageUp") {
          nextIndex = (currentIndex - 1 + currentFiles.length) % currentFiles.length;
        } else {
          nextIndex = (currentIndex + 1) % currentFiles.length;
        }
        
        const nextFile = currentFiles[nextIndex];
        selectFileRef.current(nextFile.id);
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <FileContext.Provider
      value={{
        files,
        activeFileId,
        filePath,
        isSaving,
        rawText,
        parsedDoc,
        setRawText,
        openFile,
        saveFile,
        saveFileAs,
        selectFile,
        newFile,
        closeFile,
        closeOthers,
        closeAll,
        recentFiles,
        openFilePath,
        removeFromRecent,
        updateSettings,
      }}
    >
      {children}
    </FileContext.Provider>
  );
};
