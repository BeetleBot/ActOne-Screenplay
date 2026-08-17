import React from "react";
import { UIProvider } from "./UIContext";
import { FileProvider } from "./FileContext";
import { EditorProvider } from "./EditorContext";
import { ScriptEditorProvider } from "./ScriptEditorContext";
import { CursorProvider } from "./CursorContext";
import { ParkingProvider } from "./ParkingContext";
import { CustomModalProvider } from "./CustomModalContext";
import { SnapshotProvider } from "./SnapshotContext";

export const AppProviders: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <UIProvider>
      <CustomModalProvider>
        <FileProvider>
          <SnapshotProvider>
            <EditorProvider>
              <ScriptEditorProvider>
                <CursorProvider>
                  <ParkingProvider>
                    {children}
                  </ParkingProvider>
                </CursorProvider>
              </ScriptEditorProvider>
            </EditorProvider>
          </SnapshotProvider>
        </FileProvider>
      </CustomModalProvider>
    </UIProvider>
  );
};
