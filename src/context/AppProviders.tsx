import React from "react";
import { UIProvider } from "./UIContext";
import { FileProvider } from "./FileContext";
import { EditorProvider } from "./EditorContext";
import { ParkingProvider } from "./ParkingContext";

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <UIProvider>
      <FileProvider>
        <EditorProvider>
          <ParkingProvider>
            {children}
          </ParkingProvider>
        </EditorProvider>
      </FileProvider>
    </UIProvider>
  );
};
