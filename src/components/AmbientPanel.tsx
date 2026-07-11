import React from "react";
import {
  Box,
  Typography,
  Slider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Card,
  CardContent,
  alpha,
} from "@mui/material";
import { useUI } from "../context";
import { PlayArrowIcon, StopIcon } from "./Icons";

// Custom inline SVG icons to prevent icon import issues
const VolumeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
  </svg>
);

const MusicNoteIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: 8, opacity: 0.8 }}>
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </svg>
);

const TRACKS = [
  { id: "Light Rain", label: "Light Rain", icon: "🌧", desc: "Soothing rain showers" },
  { id: "Coffee Shop", label: "Coffee Shop", icon: "☕", desc: "Relaxing cafe chatter" },
  { id: "Wind in Trees", label: "Wind in Trees", icon: "🌲", desc: "Breeze rustling through leaves" },
  { id: "Ocean Waves", label: "Ocean Waves", icon: "🌊", desc: "Slow waves washing ashore" },
];

export const AmbientPanel: React.FC = () => {
  const {
    activeAmbientTrack,
    playAmbientTrack,
    stopAmbientTrack,
    ambientVolume,
    setAmbientVolume,
  } = useUI();

  const handleToggleTrack = (trackId: string) => {
    if (activeAmbientTrack === trackId) {
      stopAmbientTrack();
    } else {
      playAmbientTrack(trackId);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", bgcolor: "background.default" }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center" }}>
        <MusicNoteIcon />
        <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: "0.02em" }}>
          Ambient Sounds
        </Typography>
      </Box>

      {/* Volume Control */}
      <Card sx={{ m: 2, bgcolor: "background.paper", borderRadius: 0 }} elevation={0} variant="outlined">
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1, color: "text.secondary" }}>
            <VolumeIcon />
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              Master Volume
            </Typography>
            <Typography variant="caption" sx={{ ml: "auto", fontWeight: 800 }}>
              {Math.round(ambientVolume * 100)}%
            </Typography>
          </Box>
          <Slider
            value={ambientVolume}
            min={0}
            max={1}
            step={0.01}
            onChange={(_, val) => setAmbientVolume(val as number)}
            sx={{
              py: 1,
              "& .MuiSlider-thumb": { width: 14, height: 14 },
            }}
          />
        </CardContent>
      </Card>

      {/* Sounds List */}
      <Box sx={{ flex: 1, overflow: "auto", px: 2, pb: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", mb: 1, px: 0.5 }}>
          Soundscapes
        </Typography>
        <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {TRACKS.map((t) => {
            const isActive = activeAmbientTrack === t.id;
            return (
              <ListItem
                key={t.id}
                onClick={() => handleToggleTrack(t.id)}
                sx={{
                  borderRadius: 0,
                  cursor: "pointer",
                  border: 1,
                  borderColor: isActive ? "primary.main" : "divider",
                  bgcolor: isActive ? (theme) => alpha(theme.palette.primary.main, 0.05) : "background.paper",
                  transition: "all var(--duration-normal) ease",
                  py: 1.5,
                  px: 2,
                  "&:hover": {
                    borderColor: isActive ? "primary.main" : "text.secondary",
                    bgcolor: isActive ? (theme) => alpha(theme.palette.primary.main, 0.07) : "action.hover",
                  },
                }}
              >
                <Box sx={{ fontSize: 24, mr: 2, select: "none" }}>{t.icon}</Box>
                <ListItemText
                  primary={
                    <Typography variant="body2" sx={{ fontWeight: 700, color: isActive ? "primary.main" : "text.primary" }}>
                      {t.label}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {t.desc}
                    </Typography>
                  }
                />
                <ListItemSecondaryAction sx={{ right: 16 }}>
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTrack(t.id);
                    }}
                    sx={{
                      color: isActive ? "primary.main" : "text.secondary",
                      bgcolor: isActive ? (theme) => alpha(theme.palette.primary.main, 0.1) : "transparent",
                    }}
                  >
                    {isActive ? <StopIcon sx={{ fontSize: 16 }} /> : <PlayArrowIcon sx={{ fontSize: 16 }} />}
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </Box>
  );
};
