import { useCallback, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ContentCopyIcon, CheckIcon, PlayArrowIcon } from "../Icons";
import { copyToClipboard } from "../../utils";

interface FountainBlockProps {
  fountainText: string;
  sceneNumber?: number;
  onInsertAtCursor?: (text: string) => void;
  onApplyToEditor?: (sceneNumber: number, fountainText: string) => void;
}

export function FountainBlock({
  fountainText,
  sceneNumber,
  onInsertAtCursor,
  onApplyToEditor,
}: FountainBlockProps) {
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleCopy = useCallback(() => {
    void copyToClipboard(fountainText).then((success) => {
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  }, [fountainText]);

  const handleApply = useCallback(() => {
    if (sceneNumber && onApplyToEditor) {
      onApplyToEditor(sceneNumber, fountainText);
    } else {
      onInsertAtCursor?.(fountainText);
    }
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  }, [sceneNumber, fountainText, onApplyToEditor, onInsertAtCursor]);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: "background.default",
        overflow: "hidden",
        my: 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 0.5,
          bgcolor: "action.hover",
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            fontSize: "0.65rem",
            color: "primary.main",
            letterSpacing: "0.06em",
          }}
        >
          {sceneNumber ? `FOUNTAIN · Scene ${sceneNumber}` : "FOUNTAIN"}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Button
            size="small"
            startIcon={copied ? <CheckIcon sx={{ fontSize: 12 }} /> : <ContentCopyIcon sx={{ fontSize: 12 }} />}
            onClick={handleCopy}
            sx={{
              minWidth: 0,
              py: 0.15,
              px: 0.75,
              fontSize: "0.6rem",
              color: "text.secondary",
              textTransform: "none",
              "&:hover": { bgcolor: "action.selected", color: "text.primary" },
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            size="small"
            startIcon={applied ? <CheckIcon sx={{ fontSize: 12 }} /> : <PlayArrowIcon sx={{ fontSize: 12 }} />}
            onClick={handleApply}
            disabled={applied}
            sx={{
              minWidth: 0,
              py: 0.15,
              px: 0.75,
              fontSize: "0.6rem",
              color: applied ? "success.main" : "primary.main",
              fontWeight: 600,
              textTransform: "none",
              "&:hover": { bgcolor: "action.selected" },
            }}
          >
            {applied ? "Applied ✓" : "Apply to Editor"}
          </Button>
        </Box>
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0,
          fontFamily: '"Courier Prime", Courier, monospace',
          fontSize: "0.75rem",
          lineHeight: 1.65,
          whiteSpace: "pre-wrap",
          overflow: "auto",
          color: "text.primary",
          maxHeight: 360,
          px: 1.5,
          py: 1.25,
        }}
      >
        {fountainText}
      </Box>
    </Box>
  );
}
