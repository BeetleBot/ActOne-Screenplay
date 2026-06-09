import React, { useEffect, useState } from "react";
import { useFile } from "../context/FileContext";
import AddIcon from "@mui/icons-material/Add";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DescriptionIcon from "@mui/icons-material/Description";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Box,
  Typography,
  Button,
  Grid,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
} from "@mui/material";

interface Quote {
  text: string;
  author: string;
}

const QUOTES: Quote[] = [
  { text: "To make a great film, you need three things: the script, the script and the script.", author: "Alfred Hitchcock" },
  { text: "The hardest thing about writing is writing.", author: "Nora Ephron" },
  { text: "If it can be written, or thought, it can be filmed.", author: "Stanley Kubrick" },
  { text: "The screenwriter's job is to make the audience care.", author: "Billy Wilder" },
  { text: "Action is character. If we never show what a person does, we don't know who they are.", author: "Syd Field" },
  { text: "Don't write what you think people want to read. Write what you want to read.", author: "William Goldman" },
  { text: "Give me a good script, and I'll make a good movie.", author: "Akira Kurosawa" },
  { text: "The script is the outline of the dream.", author: "Jean-Luc Godard" },
  { text: "Write what you see, write what you hear. Everything else is decoration.", author: "David Mamet" },
  { text: "Audiences don't know what they want until you give it to them.", author: "Federico Fellini" },
  { text: "A story should have a beginning, a middle, and an end... but not necessarily in that order.", author: "Jean-Luc Godard" },
  { text: "Theme is the glue that holds the story together.", author: "Lajos Egri" },
  { text: "Plot is what happens. Story is who it happens to.", author: "Robert McKee" }
];

function getDynamicQuote(): Quote {
  try {
    const lastIdxStr = localStorage.getItem("last_quote_index");
    const lastIdx = lastIdxStr ? parseInt(lastIdxStr, 10) : -1;
    const available = [];
    for (let i = 0; i < QUOTES.length; i++) {
      if (i !== lastIdx) {
        available.push(i);
      }
    }
    const candidates = available.length > 0 ? available : [0];
    const randomIndex = candidates[Math.floor(Math.random() * candidates.length)];
    localStorage.setItem("last_quote_index", randomIndex.toString());
    return QUOTES[randomIndex];
  } catch {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }
}

import logoImage from "../assets/logo.png";

export const WelcomeScreen: React.FC = () => {
  const { newFile, openFile, recentFiles, openFilePath, removeFromRecent } = useFile();
  const [quote, setQuote] = useState<Quote>({ text: "", author: "" });

  useEffect(() => {
    setQuote(getDynamicQuote());
  }, []);

  return (
    <Box
      sx={{
        position: "fixed",
        inset: 0,
        bgcolor: "background.default",
        color: "text.primary",
        overflow: "hidden",
      }}
    >
      <Grid container sx={{ height: "100%" }}>
        {/* Left Side: Branding, Quote, and Main Actions */}
        <Grid
          size={{ xs: 12, md: 5 }}
          sx={{
            p: { xs: 4, sm: 6, md: 8 },
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            bgcolor: "background.paper",
            borderRight: { md: 1 },
            borderBottom: { xs: 1, md: 0 },
            borderColor: "divider",
            height: "100%",
            overflowY: "auto",
          }}
        >
          {/* Quote & Buttons */}
          <Box sx={{ my: "auto", py: 4 }}>
            <Box
              sx={{
                width: { xs: 200, sm: 300, md: 400 },
                height: { xs: 200, sm: 300, md: 400 },
                mb: 6,
                mx: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img src={logoImage} alt="ActOne Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </Box>

            {quote.text && (
              <Box sx={{ mb: 5, textAlign: "center" }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    lineHeight: 1.3,
                    fontFamily: '"Courier Prime", monospace',
                    textTransform: "uppercase",
                  }}
                >
                  "{quote.text}"
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: "block",
                    mt: 2,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                  }}
                >
                  — {quote.author}
                </Typography>
              </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, maxWidth: 320, mx: "auto" }}>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                onClick={() => newFile()}
                sx={{
                  justifyContent: "flex-start",
                  py: 1.5,
                  px: 2.5,
                  borderRadius: 2.5,
                  fontWeight: 600,
                  textTransform: "none",
                }}
              >
                New Screenplay
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<FolderOpenIcon sx={{ fontSize: 18 }} />}
                onClick={openFile}
                sx={{
                  justifyContent: "flex-start",
                  py: 1.5,
                  px: 2.5,
                  borderRadius: 2.5,
                  fontWeight: 600,
                  textTransform: "none",
                }}
              >
                Open Screenplay
              </Button>
            </Box>
          </Box>

          {/* Footer keyboard shortcuts */}
          <Box sx={{ display: "flex", gap: 3, justifyContent: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, px: 0.8, py: 0.2, bgcolor: "background.default", fontFamily: "monospace" }}>
                Ctrl+N
              </Typography>
              <Typography variant="caption" color="text.secondary">New</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="caption" sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, px: 0.8, py: 0.2, bgcolor: "background.default", fontFamily: "monospace" }}>
                Ctrl+O
              </Typography>
              <Typography variant="caption" color="text.secondary">Open</Typography>
            </Box>
          </Box>
        </Grid>

        {/* Right Side: Recents */}
        <Grid
          size={{ xs: 12, md: 7 }}
          sx={{
            p: { xs: 4, sm: 6, md: 8 },
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "hidden",
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              mb: 3,
            }}
          >
            Recent Projects
          </Typography>

          {recentFiles.length > 0 ? (
            <List
              disablePadding
              sx={{
                flex: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 1,
                pr: 1,
              }}
            >
              {recentFiles.map((item: any) => (
                <ListItem
                  key={item.path}
                  disablePadding
                  secondaryAction={
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromRecent(item.path);
                      }}
                      sx={{
                        opacity: 0.6,
                        "&:hover": { opacity: 1, color: "error.main", bgcolor: "error.lighter" },
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  }
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2.5,
                    bgcolor: "background.paper",
                    transition: "all 0.2s ease",
                    "&:hover": {
                      borderColor: "primary.main",
                      transform: "translateX(4px)",
                    },
                  }}
                >
                  <ListItemButton
                    onClick={() => openFilePath(item.path)}
                    sx={{ py: 1.5, px: 2, borderRadius: 2.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <DescriptionIcon sx={{ fontSize: 18, opacity: 0.7 }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {item.name}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary" sx={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.path}
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : (
            <Box
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "text.secondary",
                opacity: 0.5,
                gap: 1.5,
                textAlign: "center",
              }}
            >
              <DescriptionIcon sx={{ fontSize: 36, strokeWidth: 1.5, opacity: 0.5 }} />
              <Typography variant="body2">No recent projects</Typography>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

