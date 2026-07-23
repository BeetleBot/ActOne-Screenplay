import { useCallback, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ContentCopyIcon, CheckIcon, ArrowDownwardIcon } from "../Icons";

interface FountainBlockProps {
  fountainText: string;
  onInsertAtCursor?: (text: string) => void;
}

export function FountainBlock({ fountainText, onInsertAtCursor }: FountainBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(fountainText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => undefined);
  }, [fountainText]);

  const handleInsert = useCallback(() => {
    onInsertAtCursor?.(fountainText);
  }, [fountainText, onInsertAtCursor]);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        bgcolor: "background.default",
        boxShadow: (t) => `0 0 12px 0 ${t.palette.primary.main}18`,
        px: 1.75,
        py: 1.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
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
          FOUNTAIN
        </Typography>
        <Box sx={{ display: "flex", gap: 0.25 }}>
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
            startIcon={<ArrowDownwardIcon sx={{ fontSize: 12 }} />}
            onClick={handleInsert}
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
            Insert
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
        }}
      >
        {fountainText}
      </Box>
    </Box>
  );
}
