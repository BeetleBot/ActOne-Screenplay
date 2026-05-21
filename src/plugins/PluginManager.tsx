import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { PluginRunner, PluginEditorBridge } from "./PluginRunner";
import { useScreenplay } from "../context/ScreenplayContext";

interface PluginInfo {
  name: string;
  filename: string;
  source: string;
}

interface PluginManagerContextProps {
  availablePlugins: PluginInfo[];
  activePlugins: Map<string, PluginRunner>;
  runPlugin: (name: string) => void;
  stopPlugin: (name: string) => void;
  reloadPlugins: () => Promise<void>;
}

const PluginManagerContext = createContext<PluginManagerContextProps | undefined>(undefined);

export const usePlugins = () => {
  const context = useContext(PluginManagerContext);
  if (!context) throw new Error("usePlugins must be used within a PluginManagerProvider");
  return context;
};

export const PluginManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { rawText, parsedDoc, editorView, scrollToLine } = useScreenplay();
  const [availablePlugins, setAvailablePlugins] = useState<PluginInfo[]>([]);
  const [activePlugins, setActivePlugins] = useState<Map<string, PluginRunner>>(new Map());
  const activePluginsRef = useRef(activePlugins);

  const rawTextRef = useRef(rawText);
  const parsedDocRef = useRef(parsedDoc);
  const editorViewRef = useRef(editorView);

  useEffect(() => { rawTextRef.current = rawText; }, [rawText]);
  useEffect(() => { parsedDocRef.current = parsedDoc; }, [parsedDoc]);
  useEffect(() => { editorViewRef.current = editorView; }, [editorView]);

  useEffect(() => {
    activePluginsRef.current = activePlugins;
  }, [activePlugins]);

  useEffect(() => {
    for (const [, runner] of activePluginsRef.current) {
      if (!runner.isTerminated) {
        runner.sendEvent("onTextChange", rawText);
      }
    }
  }, [rawText]);

  useEffect(() => {
    for (const [, runner] of activePluginsRef.current) {
      if (!runner.isTerminated) {
        runner.sendEvent("onOutlineChange");
      }
    }
  }, [parsedDoc]);

  const createBridge = useCallback((): PluginEditorBridge => ({
    getText: () => rawTextRef.current,
    getParsedDoc: () => parsedDocRef.current,
    getSelectedRange: () => {
      const view = editorViewRef.current;
      if (!view) return { location: 0, length: 0 };
      const sel = view.state.selection.main;
      return { location: sel.from, length: sel.to - sel.from };
    },
    setSelectedRange: (loc: number, len: number) => {
      const view = editorViewRef.current;
      if (!view) return;
      view.dispatch({ selection: { anchor: loc, head: loc + len } });
    },
    addString: (str: string, index: number) => {
      const view = editorViewRef.current;
      if (!view) return;
      view.dispatch({ changes: { from: index, insert: str } });
    },
    replaceRange: (loc: number, len: number, str: string) => {
      const view = editorViewRef.current;
      if (!view) return;
      view.dispatch({ changes: { from: loc, to: loc + len, insert: str } });
    },
    scrollTo: (index: number) => {
      const view = editorViewRef.current;
      if (!view) return;
      view.dispatch({ selection: { anchor: index }, scrollIntoView: true });
    },
    scrollToLine: (index: number) => {
      scrollToLine(index);
    },
    scrollToScene: (sceneIndex: number) => {
      const doc = parsedDocRef.current;
      let count = 0;
      for (let i = 0; i < doc.lines.length; i++) {
        if (doc.lines[i].type === 10) {
          if (count === sceneIndex) {
            scrollToLine(i);
            return;
          }
          count++;
        }
      }
    },
  }), [scrollToLine]);

  const loadPluginsFromFS = async (): Promise<PluginInfo[]> => {
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI_INTERNALS__;
    if (!isTauri) return [];

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const plugins: PluginInfo[] = await invoke<PluginInfo[]>("list_plugins").catch(() => []);
      return plugins;
    } catch {
      return [];
    }
  };

  const reloadPlugins = async () => {
    const plugins = await loadPluginsFromFS();
    setAvailablePlugins(plugins);
  };

  useEffect(() => {
    reloadPlugins();
  }, []);

  const runPlugin = useCallback((name: string) => {
    const plugin = availablePlugins.find(p => p.name === name);
    if (!plugin) return;

    const existing = activePluginsRef.current.get(name);
    if (existing && !existing.isTerminated) {
      existing.terminate();
    }

    const bridge = createBridge();
    const runner = new PluginRunner(name, plugin.source, bridge);
    runner.onTerminate = () => {
      setActivePlugins(prev => {
        const next = new Map(prev);
        next.delete(name);
        return next;
      });
    };

    setActivePlugins(prev => {
      const next = new Map(prev);
      next.set(name, runner);
      return next;
    });
  }, [availablePlugins, createBridge]);

  const stopPlugin = useCallback((name: string) => {
    const runner = activePluginsRef.current.get(name);
    if (runner) runner.terminate();
  }, []);

  return (
    <PluginManagerContext.Provider value={{ availablePlugins, activePlugins, runPlugin, stopPlugin, reloadPlugins }}>
      {children}
    </PluginManagerContext.Provider>
  );
};
