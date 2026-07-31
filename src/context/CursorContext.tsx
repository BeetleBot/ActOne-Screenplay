import React, { createContext, useContext, useState } from "react";

export interface CursorContextProps {
  activeLineId: string | null;
  activeLineNumber: number;
  selectedSceneId: string | null;
  setActiveLineId: (id: string | null) => void;
  setActiveLineNumber: (num: number) => void;
  setSelectedSceneId: (id: string | null) => void;
}

const CursorContext = createContext<CursorContextProps | undefined>(undefined);

export const useCursor = () => {
  const context = useContext(CursorContext);
  if (!context) throw new Error("useCursor must be used within a CursorProvider");
  return context;
};

export const CursorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [activeLineNumber, setActiveLineNumber] = useState<number>(-1);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  return (
    <CursorContext.Provider
      value={{
        activeLineId,
        activeLineNumber,
        selectedSceneId,
        setActiveLineId,
        setActiveLineNumber,
        setSelectedSceneId,
      }}
    >
      {children}
    </CursorContext.Provider>
  );
};
