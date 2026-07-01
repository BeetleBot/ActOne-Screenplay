import React from "react";
import { UIProvider } from "./UIContext";
import { FileProvider } from "./FileContext";
import { EditorProvider } from "./EditorContext";
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
              <ParkingProvider>
                {children}
              </ParkingProvider>
            </EditorProvider>
          </SnapshotProvider>
        </FileProvider>
      </CustomModalProvider>
    </UIProvider>
  );
};
