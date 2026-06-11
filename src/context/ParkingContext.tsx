import React, { createContext, useContext, useCallback } from "react";
import { useFile } from "./FileContext";
import { useEditor } from "./EditorContext";

export interface ParkedItem {
  id: string;
  text: string;
  createdAt: number;
}

interface ParkingContextProps {
  items: ParkedItem[];
  addItem: (text: string) => void;
  removeItem: (id: string) => void;
}

const ParkingContext = createContext<ParkingContextProps | undefined>(undefined);

export const useParking = () => {
  const context = useContext(ParkingContext);
  if (!context) throw new Error("useParking must be used within a ParkingProvider");
  return context;
};

export const ParkingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { parsedDoc } = useFile();
  const { updateSettings } = useEditor();
  const items: ParkedItem[] = (parsedDoc as any)?.settings?.parking || [];

  const addItem = useCallback((text: string) => {
    if (!text.trim()) return;
    const trimmed = text.trim();
    const item: ParkedItem = {
      id: "parked-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8),
      text: trimmed,
      createdAt: Date.now(),
    };
    updateSettings((prev: any) => ({
      ...prev,
      parking: [item, ...(prev.parking || [])],
    }));
  }, [updateSettings]);

  const removeItem = useCallback((id: string) => {
    updateSettings((prev: any) => ({
      ...prev,
      parking: (prev.parking || []).filter((i: ParkedItem) => i.id !== id),
    }));
  }, [updateSettings]);

  return (
    <ParkingContext.Provider value={{ items, addItem, removeItem }}>
      {children}
    </ParkingContext.Provider>
  );
};
