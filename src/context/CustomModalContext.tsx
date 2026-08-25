import React, { createContext, useContext, useState, useRef, useEffect } from "react";
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
  const promptInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (promptOpen) {
      const timer = setTimeout(() => {
        if (promptInputRef.current) {
          promptInputRef.current.focus();
          promptInputRef.current.select();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [promptOpen]);

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
              borderRadius: '12px',
              minWidth: 320,
              maxWidth: 440,
              p: 0.5,
              bgcolor: "background.paper",
              color: "text.primary",
              backgroundImage: "none",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.45)",
              zoom: `${appScale}%`,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary", pt: 1.5, px: 2, pb: 0.5 }}>
          {confirmOpts?.title}
        </DialogTitle>
        <DialogContent sx={{ px: 2, py: 1 }}>
          <DialogContentText sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
            {confirmOpts?.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5, pt: 1, gap: 0.75 }}>
          {confirmOpts?.buttons.map((btn) => (
            <Button
              key={btn.value}
              onClick={() => handleConfirmClose(btn.value)}
              variant={btn.variant || "outlined"}
              color={btn.color || "primary"}
              size="small"
              sx={{ borderRadius: '6px', fontSize: "0.78rem", px: 2 }}
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
              borderRadius: '12px',
              minWidth: 320,
              maxWidth: 420,
              p: 0.5,
              bgcolor: "background.paper",
              color: "text.primary",
              backgroundImage: "none",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.45)",
              border: "1px solid",
              borderColor: "divider",
              zoom: `${appScale}%`,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: "0.95rem", letterSpacing: "0.01em", pt: 1.5, pb: 0.5, px: 2, color: "text.primary" }}>
          {promptOpts?.title}
        </DialogTitle>
        <DialogContent sx={{ px: 2, py: 1 }}>
          {promptOpts?.message && (
            <DialogContentText sx={{ mb: 1.5, fontSize: "0.82rem", color: "text.secondary" }}>
              {promptOpts?.message}
            </DialogContentText>
          )}
          <TextField
            inputRef={promptInputRef}
            autoFocus
            margin="dense"
            fullWidth
            size="small"
            variant="outlined"
            placeholder={promptOpts?.placeholder}
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            onFocus={(e) => {
              e.target.select();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handlePromptSubmit();
              } else if (e.key === "Escape") {
                e.preventDefault();
                handlePromptCancel();
              }
            }}
            slotProps={{
              input: {
                sx: {
                  borderRadius: '6px',
                  fontSize: "0.85rem",
                },
              },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 1.5, pt: 1, gap: 0.75 }}>
          <Button
            onClick={handlePromptCancel}
            variant="text"
            color="inherit"
            size="small"
            sx={{ borderRadius: '6px', fontSize: "0.78rem", px: 2, fontWeight: 500, color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePromptSubmit}
            variant="contained"
            color="primary"
            size="small"
            sx={{
              borderRadius: '6px',
              fontSize: "0.78rem",
              px: 2.5,
              fontWeight: 600,
            }}
          >
            OK
          </Button>
        </DialogActions>
      </Dialog>
    </CustomModalContext.Provider>
  );
};
