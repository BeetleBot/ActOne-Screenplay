import React from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  useTheme as useMuiTheme,
} from "@mui/material";
import { TitleBar } from "./TitleBar";
import { AutoAwesomeIcon, CheckIcon } from "./Icons";
import type { FixFormattingReport } from "../utils/fixFormatting";

interface FixFormattingModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: FixFormattingReport | null;
}

export const FixFormattingModal: React.FC<FixFormattingModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  const muiTheme = useMuiTheme();
  const isDark = muiTheme.palette.mode === "dark";

  if (!report) return null;

  const stats = [
    { label: "Lines Removed", count: report.linesRemoved },
    { label: "Dialogue Blank Lines Collapsed", count: report.dialogueSpacesCleaned },
    { label: "Syntax Prefixes Trimmed", count: report.syntaxPrefixesTrimmed },
    { label: "Inline Note Spaces Trimmed", count: report.notesTrimmed },
  ];

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 0,
            bgcolor: "background.paper",
            color: "text.primary",
            backgroundImage: "none",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: isDark
              ? "0 16px 32px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)"
              : "0 16px 32px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.08)",
            overflow: "hidden",
          },
        },
      }}
    >
      <TitleBar title="Fix Formatting Result" onClose={onClose} icon={<AutoAwesomeIcon sx={{ fontSize: 16 }} />} isModal />

      <Box sx={{ p: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            p: 2,
            mb: 2,
            bgcolor: "action.hover",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 0,
          }}
        >
          <Box
            sx={{
              width: 44,
              height: 44,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              borderRadius: 0,
            }}
          >
            <CheckIcon sx={{ fontSize: 24 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: 16, lineHeight: 1.2 }}>
              {report.totalChanges > 0 ? "Format Cleaned & Fixed" : "Already Clean"}
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.25, fontSize: 11 }}>
              {report.totalChanges > 0
                ? `${report.totalChanges} total layout adjustment${report.totalChanges === 1 ? "" : "s"} applied.`
                : "Your screenplay matches all industry formatting rules."}
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ p: 0, mb: 2.5 }}>
          <Box
            sx={{
              bgcolor: "background.paper",
              borderRadius: 0,
              display: "flex",
              flexDirection: "column",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            {stats.map((stat, idx) => (
              <Box
                key={stat.label}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  p: 1.5,
                  borderBottom: idx < stats.length - 1 ? "1px solid" : "none",
                  borderColor: "divider",
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                  {stat.label}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: "monospace",
                    fontWeight: 700,
                    fontSize: 12,
                    color: stat.count > 0 ? "primary.main" : "text.secondary",
                  }}
                >
                  {stat.count}
                </Typography>
              </Box>
            ))}
          </Box>
        </DialogContent>

        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            size="small"
            onClick={onClose}
            sx={{
              borderRadius: 0,
              textTransform: "none",
              fontWeight: 700,
              px: 3,
            }}
          >
            Done
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};
