import React from "react";
import { Alert, AlertTitle, Button } from "@mui/material";
import { PILL_RADIUS } from "../constants";

interface ActoneBannerProps {
  message?: string;
  saveFileAs?: () => Promise<string | null>;
}

export const ActoneBanner: React.FC<ActoneBannerProps> = ({ message, saveFileAs }) => (
  <Alert
    severity="warning"
    sx={{ mb: 2, borderRadius: '8px' }}
    action={
      saveFileAs && (
        <Button
          color="warning"
          size="small"
          variant="contained"
          onClick={() => saveFileAs()}
          sx={{ fontWeight: 600, textTransform: "none", borderRadius: PILL_RADIUS }}
        >
          Save as .actone
        </Button>
      )
    }
  >
    <AlertTitle sx={{ fontWeight: 700 }}>Only available on .actone</AlertTitle>
    {message || "This feature requires saving the screenplay as an ActOne Bundle (.actone)."}
  </Alert>
);