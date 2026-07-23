import { Box, Button } from "@mui/material";

const AI_ACTIONS = ["summarize", "analyzeTone", "checkSpelling"];
export type AIAction = typeof AI_ACTIONS[number];

interface AIQuickActionsProps {
  onAction: (action: AIAction) => void;
  disabled?: boolean;
}

const ACTION_LABELS: Record<AIAction, string> = {
  summarize: "Summarize",
  analyzeTone: "Analyze Tone",
  checkSpelling: "Check Spelling",
};

export function AIQuickActions({ onAction, disabled }: AIQuickActionsProps) {
  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, px: 1.5, pt: 1, flexShrink: 0 }}>
      {AI_ACTIONS.map((action) => (
        <Button
          key={action}
          size="small"
          variant="outlined"
          disabled={disabled}
          onClick={() => onAction(action as AIAction)}
          sx={{
            borderRadius: 0,
            fontSize: "0.7rem",
            py: 0.25,
            px: 1,
            textTransform: "none",
            minWidth: 0,
          }}
        >
          {ACTION_LABELS[action as AIAction]}
        </Button>
      ))}
    </Box>
  );
}

