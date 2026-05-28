import React from "react";
import { UIProvider } from "./UIContext";
import { FileProvider } from "./FileContext";
import { EditorProvider } from "./EditorContext";

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <UIProvider>
      <FileProvider>
        <EditorProvider>
          {children}
        </EditorProvider>
      </FileProvider>
    </UIProvider>
  );
};
