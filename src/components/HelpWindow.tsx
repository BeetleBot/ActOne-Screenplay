import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Fuse from "fuse.js";
import { List } from "react-window";
import { articles, categories, HelpArticle } from "../data/helpArticles";
import { HelpMarkdown } from "./HelpMarkdown";
import { CloseIcon, SearchIcon, ClearIcon, OpenInNewIcon, LibraryBooksIcon } from "./Icons";
import { createActOneTheme } from "../theme";
import { resolveThemeConfig, type CustomTheme } from "../theme/themeUtils";
import { initThemeEngine, onThemeChanged } from "../theme/ThemeEngine";
import {
  Box,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  useTheme,
  ThemeProvider as MuiThemeProvider,
} from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";

const fuse = new Fuse(articles, {
  keys: [
    { name: "title", weight: 2 },
    { name: "tags", weight: 1.5 },
    { name: "category", weight: 1 },
    { name: "content", weight: 0.5 },
  ],
  threshold: 0.4,
  minMatchCharLength: 1,
});

const ITEM_HEIGHT = 30;

interface ArticleRowData {
  articles: HelpArticle[];
  selectedArticleId: string;
  onSelect: (id: string) => void;
}

const ArticleRow = (props: {
  index: number;
  style: React.CSSProperties;
} & ArticleRowData): React.ReactElement | null => {
  const { index, style, articles, selectedArticleId, onSelect } = props;
  const a = articles[index];
  const isActive = a.id === selectedArticleId;
  return (
    <Box
      style={style}
      onClick={() => onSelect(a.id)}
      sx={{
        px: 1.5,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        bgcolor: isActive ? "action.selected" : "transparent",
        color: isActive ? "primary.main" : "text.secondary",
        fontWeight: isActive ? 600 : 400,
        fontSize: "12px",
        borderLeft: isActive ? "2px solid" : "2px solid transparent",
        borderColor: isActive ? "primary.main" : "transparent",
        "&:hover": { bgcolor: "action.hover", color: "text.primary" },
      }}
    >
      <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {a.title}
      </Box>
    </Box>
  );
};

const openFountainGuide = () => {
  const url = "https://fountain.io";
  import("@tauri-apps/plugin-opener")
    .then(({ openUrl }) => openUrl(url))
    .catch(() => window.open(url, "_blank"));
};

export const HelpWindow: React.FC = () => {
  const [themeId, setThemeId] = useState("light");
  const [appScale, setAppScale] = useState(100);
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([]);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    initThemeEngine().then((state) => {
      setThemeId(state.themeId);
      setAppScale(state.appScale);
      try { setCustomThemes(JSON.parse(state.customThemes)); } catch { setCustomThemes([]); }
    });
    return onThemeChanged((state) => {
      setThemeId(state.themeId);
      setAppScale(state.appScale);
      try { setCustomThemes(JSON.parse(state.customThemes)); } catch { setCustomThemes([]); }
    });
  }, []);

  const currentThemeConfig = resolveThemeConfig(themeId, customThemes, systemDark);
  const muiTheme = createActOneTheme(currentThemeConfig, appScale);

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch {
      window.close();
    }
  };

  return (
    <MuiThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        <HelpWindowContent onClose={handleClose} />
      </Box>
    </MuiThemeProvider>
  );
};

const HelpWindowContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState("welcome-screen");
  const listApi = useRef<{ scrollToRow: (config: { index: number; align: string }) => void } | null>(null);

  const isSearching = searchQuery.trim().length > 0;

  const displayedArticles = useMemo(() => {
    if (isSearching) {
      return fuse.search(searchQuery).map((r) => r.item);
    }
    if (selectedCategory) {
      return articles.filter((a) => a.category === selectedCategory);
    }
    return articles;
  }, [searchQuery, selectedCategory, isSearching]);

  const selectedArticle = useMemo(
    () => articles.find((a) => a.id === selectedArticleId) || articles[0],
    [selectedArticleId]
  );

  const relatedArticles = useMemo(
    () => (selectedArticle ? articles.filter((a) => selectedArticle.relatedIds.includes(a.id)) : []),
    [selectedArticle]
  );

  const selectedIdx = useMemo(
    () => displayedArticles.findIndex((a) => a.id === selectedArticleId),
    [displayedArticles, selectedArticleId]
  );

  useEffect(() => {
    if (selectedIdx >= 0 && listApi.current) {
      listApi.current.scrollToRow({ index: selectedIdx, align: "smart" });
    }
  }, [selectedIdx, listApi]);

  const handleSelectArticle = useCallback((id: string) => {
    setSelectedArticleId(id);
    const article = articles.find((a) => a.id === id);
    if (article && !isSearching) {
      setSelectedCategory(article.category);
    }
  }, [isSearching]);

  const handleTagClick = useCallback((tag: string) => {
    setSearchQuery(tag);
    setSelectedCategory(null);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
          px: 2,
          py: 0.75,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LibraryBooksIcon sx={{ fontSize: 18 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>
            ActOne Help Wiki
          </Typography>
          <Chip
            label={`${articles.length} articles`}
            size="small"
            sx={{ fontSize: 9.5, height: 18, borderRadius: "4px", fontWeight: 600 }}
          />
        </Box>
        <TextField
          size="small"
          placeholder="Search articles…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            flex: 1,
            maxWidth: 320,
            "& .MuiOutlinedInput-root": {
              borderRadius: "6px",
              height: 28,
              fontSize: 12,
              bgcolor: "action.hover",
              "& fieldset": { border: "none" },
              "&:hover fieldset": { border: "none" },
              "&.Mui-focused fieldset": { border: "none" },
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ color: "text.secondary", mr: 0.5 }}>
                  <SearchIcon sx={{ fontSize: 15 }} />
                </InputAdornment>
              ),
              endAdornment: isSearching ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={handleClearSearch}
                    sx={{ color: "text.secondary", p: "2px" }}
                  >
                    <ClearIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary", ml: "auto", p: 0.5 }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", overflow: "hidden", flex: 1 }}>
        <Box
          sx={{
            width: 240,
            flexShrink: 0,
            borderRight: 1,
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            bgcolor: theme.palette.mode === "dark" ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.02)",
          }}
        >
          {!isSearching && (
            <Box sx={{ px: 1.5, pt: 1.5, pb: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              <Chip
                label="All"
                size="small"
                onClick={() => setSelectedCategory(null)}
                sx={{
                  fontSize: 10,
                  height: 22,
                  fontWeight: 600,
                  borderRadius: "4px",
                  bgcolor: selectedCategory === null ? "primary.main" : "action.hover",
                  color: selectedCategory === null ? "primary.contrastText" : "text.secondary",
                  "&:hover": { bgcolor: selectedCategory === null ? "primary.dark" : "action.selected" },
                }}
              />
              {categories.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  size="small"
                  onClick={() => setSelectedCategory(cat)}
                  sx={{
                    fontSize: 10,
                    height: 22,
                    fontWeight: 600,
                    borderRadius: "4px",
                    bgcolor: selectedCategory === cat ? "primary.main" : "action.hover",
                    color: selectedCategory === cat ? "primary.contrastText" : "text.secondary",
                    "&:hover": { bgcolor: selectedCategory === cat ? "primary.dark" : "action.selected" },
                  }}
                />
              ))}
            </Box>
          )}
          <Box sx={{ px: 1.5, py: 1 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                fontSize: 10,
                color: 'text.secondary',
                letterSpacing: 0.5,
                display: 'block'
              }}
            >
              {isSearching
                ? `RESULTS (${displayedArticles.length})`
                : (selectedCategory || "ALL ARTICLES").toUpperCase()}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }}>
            {displayedArticles.length > 0 ? (
              <List<ArticleRowData>
                listRef={(el: any) => { listApi.current = el; }}
                rowCount={displayedArticles.length}
                rowHeight={ITEM_HEIGHT}
                rowComponent={ArticleRow}
                rowProps={{
                  articles: displayedArticles,
                  selectedArticleId,
                  onSelect: handleSelectArticle,
                }}
                style={{ height: "100%", width: 240 }}
                overscanCount={10}
              />
            ) : (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: "italic", fontSize: 11 }}>
                  No matching articles found.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", px: 4, py: 3 }}>
          {selectedArticle && (
            <Box sx={{ maxWidth: 720, mx: "auto" }}>
              <Typography
                variant="overline"
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "primary.main",
                  mb: 0.5,
                  display: "block",
                }}
              >
                {selectedArticle.category}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: 20, mb: 1.5 }}>
                {selectedArticle.title}
              </Typography>
              <Box sx={{ mb: 3, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                {selectedArticle.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onClick={() => handleTagClick(tag)}
                    sx={{
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: "pointer",
                      borderRadius: "4px",
                      bgcolor: "action.hover",
                      "&:hover": { bgcolor: "action.selected" },
                    }}
                  />
                ))}
              </Box>
              <HelpMarkdown content={selectedArticle.content} />
              {relatedArticles.length > 0 && (
                <Box sx={{ mt: 5, pt: 3, borderTop: 1, borderColor: "divider" }}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, fontSize: 10, mb: 1.5, color: "text.secondary", letterSpacing: 0.5, display: "block" }}
                  >
                    RELATED ARTICLES
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {relatedArticles.map((rel) => (
                      <Box
                        key={rel.id}
                        onClick={() => handleSelectArticle(rel.id)}
                        sx={{
                          px: 1.5,
                          py: 0.8,
                          borderRadius: 1,
                          cursor: "pointer",
                          bgcolor: "action.hover",
                          "&:hover": { bgcolor: "action.selected" },
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, fontSize: 12, color: "primary.main" }}
                        >
                          {rel.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>
                          {rel.category}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          borderTop: 1,
          borderColor: "divider",
          px: 2,
          py: 0.75,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, fontWeight: 500 }}>
          ActOne v{__APP_VERSION__} &copy; 2026 Write Up Film Service Company
        </Typography>
        <Button
          onClick={openFountainGuide}
          endIcon={<OpenInNewIcon sx={{ fontSize: 12 }} />}
          size="small"
          sx={{ textTransform: "none", fontWeight: 600, fontSize: 11, py: 0.25 }}
        >
          Fountain Syntax Guide
        </Button>
      </Box>
    </>
  );
};
