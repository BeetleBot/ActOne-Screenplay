import React from "react";
import { UIProvider } from "./UIContext";
import { FileProvider } from "./FileContext";
import { EditorProvider } from "./EditorContext";
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
              <CursorProvider>
                <ParkingProvider>
                  {children}
                </ParkingProvider>
              </CursorProvider>
            </EditorProvider>
          </SnapshotProvider>
        </FileProvider>
      </CustomModalProvider>
    </UIProvider>
  );
};
