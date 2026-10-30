import { IconButton, Tooltip } from "@mui/material";
import { HelpOutlinedIcon } from "../Icons";

export function UrAIAbout() {
  return (
    <Tooltip
      title={'UrAI brings together “உரை” (urai), Tamil for text or explanation, and “Your AI” — your screenwriting companion.'}
      arrow
      describeChild
    >
      <IconButton aria-label="About the name UrAI" size="small" sx={{ ml: 0.5, p: 0.25, color: "text.secondary" }}>
        <HelpOutlinedIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Tooltip>
  );
}
