import React, { createContext, useContext, useState, useRef } from "react";
import { useUI } from "./UIContext";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";

export interface ButtonOption {
  value: string;
  label: string;
  variant?: "text" | "outlined" | "contained";
  color?: "inherit" | "primary" | "secondary" | "success" | "error" | "info" | "warning";
}

export interface ConfirmOptions {
  title: string;
  message: string;
  buttons: ButtonOption[];
}

export interface PromptOptions {
  title: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
}

interface CustomModalContextProps {
  confirm: (options: ConfirmOptions) => Promise<string>;
  prompt: (options: PromptOptions) => Promise<string | null>;
}

const CustomModalContext = createContext<CustomModalContextProps | undefined>(undefined);

export const useCustomModal = () => {
  const context = useContext(CustomModalContext);
  if (!context) throw new Error("useCustomModal must be used within a CustomModalProvider");
  return context;
};

export const CustomModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { appScale } = useUI();
  // Confirm state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmOpts, setConfirmOpts] = useState<ConfirmOptions | null>(null);
  const confirmResolveRef = useRef<((value: string) => void) | null>(null);

  // Prompt state
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptOpts, setPromptOpts] = useState<PromptOptions | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const promptResolveRef = useRef<((value: string | null) => void) | null>(null);

  const confirm = (options: ConfirmOptions): Promise<string> => {
    return new Promise((resolve) => {
      setConfirmOpts(options);
      setConfirmOpen(true);
      confirmResolveRef.current = resolve;
    });
  };

  const prompt = (options: PromptOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setPromptOpts(options);
      setPromptValue(options.defaultValue || "");
      setPromptOpen(true);
      promptResolveRef.current = resolve;
    });
  };

  const handleConfirmClose = (value: string) => {
    setConfirmOpen(false);
    if (confirmResolveRef.current) {
      confirmResolveRef.current(value);
      confirmResolveRef.current = null;
    }
  };

  const handlePromptSubmit = () => {
    setPromptOpen(false);
    if (promptResolveRef.current) {
      promptResolveRef.current(promptValue);
      promptResolveRef.current = null;
    }
  };

  const handlePromptCancel = () => {
    setPromptOpen(false);
    if (promptResolveRef.current) {
      promptResolveRef.current(null);
      promptResolveRef.current = null;
    }
  };

  return (
    <CustomModalContext.Provider value={{ confirm, prompt }}>
      {children}

      {/* Confirm Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => handleConfirmClose("cancel")}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "16px",
              minWidth: 320,
              p: 1,
              zoom: `${appScale}%`
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
          {confirmOpts?.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: "0.9rem" }}>
            {confirmOpts?.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1, gap: 1 }}>
          {confirmOpts?.buttons.map((btn) => (
            <Button
              key={btn.value}
              onClick={() => handleConfirmClose(btn.value)}
              variant={btn.variant || "outlined"}
              color={btn.color || "primary"}
              sx={{ borderRadius: "20px", fontSize: "0.85rem", px: 2.5 }}
            >
              {btn.label}
            </Button>
          ))}
        </DialogActions>
      </Dialog>

      {/* Prompt Dialog */}
      <Dialog
        open={promptOpen}
        onClose={handlePromptCancel}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "16px",
              minWidth: 320,
              p: 1,
              zoom: `${appScale}%`
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
          {promptOpts?.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2, fontSize: "0.9rem" }}>
            {promptOpts?.message}
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            variant="outlined"
            placeholder={promptOpts?.placeholder}
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handlePromptSubmit();
              }
            }}
            slotProps={{
              htmlInput: {
                style: { fontSize: "0.9rem" }
              }
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1, gap: 1 }}>
          <Button
            onClick={handlePromptCancel}
            variant="text"
            color="inherit"
            sx={{ borderRadius: "20px", fontSize: "0.85rem", px: 2.5 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePromptSubmit}
            variant="contained"
            color="primary"
            sx={{ borderRadius: "20px", fontSize: "0.85rem", px: 2.5 }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </CustomModalContext.Provider>
  );
};
