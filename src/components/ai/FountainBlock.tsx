import { useCallback, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { ContentCopyIcon, CheckIcon } from "../Icons";
import { copyToClipboard } from "../../utils";

interface FountainBlockProps {
  fountainText: string;
  sceneNumber?: number;
}

export function FountainBlock({
  fountainText,
  sceneNumber,
}: FountainBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    void copyToClipboard(fountainText).then((success) => {
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  }, [fountainText]);

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
