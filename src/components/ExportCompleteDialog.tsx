import { useState } from "react";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { TitleBar } from "./TitleBar";

interface ExportCompleteDialogProps {
  path: string;
  onClose: () => void;
}

export function ExportCompleteDialog({ path, onClose }: ExportCompleteDialogProps) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const actOnFile = async (action: "open" | "reveal") => {
    if (busy || typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) return;
    setBusy(true);
    setError("");
    try {
      if (action === "open") await openPath(path);
      else await revealItemInDir(path);
    } catch {
      setError(action === "open" ? "Could not open the exported file. Check that an application is installed for this file type." : "Could not show the exported file in your file manager.");
    } finally { setBusy(false); }
  };
  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ p: 0 }}><TitleBar title="Export complete" isModal onClose={onClose} /></DialogTitle>
      <DialogContent>
        <Box sx={{ py: 2 }}>
          <Typography sx={{ fontWeight: 600 }}>{path.split(/[/\\]/).pop()}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, overflowWrap: "anywhere" }}>{path}</Typography>
          {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit">Done</Button>
        <Button disabled={busy} onClick={() => void actOnFile("reveal")}>Show in folder</Button>
        <Button disabled={busy} variant="contained" onClick={() => void actOnFile("open")}>Open file</Button>
      </DialogActions>
    </Dialog>
  );
}
