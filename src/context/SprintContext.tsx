import React, { createContext, useContext, useState, useEffect } from "react";

export interface SprintSession {
  id: string;
  startTime: number;
  endTime: number;
  durationMinutes: number;
  wordCount: number;
  content: string;
  fileName?: string;
  fileId?: string;
}

interface ActiveSprint {
  startTime: number;
  durationMinutes: number;
  startWordCount: number;
}

interface SprintContextProps {
  activeSprints: Record<string, ActiveSprint>;
  sprintHistory: SprintSession[];
  startSprint: (fileId: string, durationMinutes: number, startWordCount: number) => void;
  stopSprint: (fileId: string, wordCount: number, fileName?: string) => SprintSession | null;
  cancelSprint: (fileId: string) => void;
  addHistoryItem: (session: SprintSession) => void;
  deleteHistoryItem: (id: string) => void;
  clearHistory: () => void;
}

const SprintContext = createContext<SprintContextProps | undefined>(undefined);

export const useSprint = () => {
  const context = useContext(SprintContext);
  if (!context) throw new Error("useSprint must be used within a SprintProvider");
  return context;
};

export const SprintProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeSprints, setActiveSprints] = useState<Record<string, ActiveSprint>>(() => {
    const saved = localStorage.getItem("actone-active-sprints");
    return saved ? JSON.parse(saved) : {};
  });

  const [sprintHistory, setSprintHistory] = useState<SprintSession[]>(() => {
    const saved = localStorage.getItem("actone-sprint-history");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("actone-active-sprints", JSON.stringify(activeSprints));
  }, [activeSprints]);

  useEffect(() => {
    localStorage.setItem("actone-sprint-history", JSON.stringify(sprintHistory));
  }, [sprintHistory]);

  const startSprint = (fileId: string, durationMinutes: number, startWordCount: number) => {
    setActiveSprints(prev => ({
      ...prev,
      [fileId]: {
        startTime: Date.now(),
        durationMinutes,
        startWordCount,
      }
    }));
  };

  const stopSprint = (fileId: string, wordCount: number, fileName?: string): SprintSession | null => {
    const active = activeSprints[fileId];
    if (!active) return null;

    const newSession: SprintSession = {
      id: Date.now().toString(),
      startTime: active.startTime,
      endTime: Date.now(),
      durationMinutes: active.durationMinutes,
      wordCount,
      content: "",
      fileName,
      fileId,
    };

    setSprintHistory(prev => [newSession, ...prev]);
    
    setActiveSprints(prev => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });

    return newSession;
  };

  const cancelSprint = (fileId: string) => {
    setActiveSprints(prev => {
      const next = { ...prev };
      delete next[fileId];
      return next;
    });
  };

  const addHistoryItem = (session: SprintSession) => {
    setSprintHistory(prev => {
      if (prev.find(s => s.id === session.id)) return prev;
      return [session, ...prev];
    });
  };

  const deleteHistoryItem = (id: string) => {
    setSprintHistory(prev => prev.filter(s => s.id !== id));
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear all global sprint history? This will not clear data saved inside .actone bundles.")) {
      setSprintHistory([]);
    }
  };

  return (
    <SprintContext.Provider
      value={{
        activeSprints,
        sprintHistory,
        startSprint,
        stopSprint,
        cancelSprint,
        addHistoryItem,
        deleteHistoryItem,
        clearHistory,
      }}
    >
      {children}
    </SprintContext.Provider>
  );
};
