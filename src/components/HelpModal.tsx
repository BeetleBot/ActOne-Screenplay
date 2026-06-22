import React, { useState, useMemo, useCallback, useEffect } from "react";
import Fuse from "fuse.js";
import { List } from "react-window";
import { articles, categories, HelpArticle } from "../data/helpArticles";
import { HelpMarkdown } from "./HelpMarkdown";
import { CloseIcon, SearchIcon, ClearIcon, OpenInNewIcon } from "./Icons";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  useTheme,
} from "@mui/material";

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

const ITEM_HEIGHT = 36;

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
        fontSize: "0.8rem",
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

interface HelpModalProps {
  onClose: () => void;
}

const openFountainGuide = () => {
  const url = "https://fountain.io";
  import("@tauri-apps/plugin-opener")
    .then(({ openUrl }) => openUrl(url))
    .catch(() => window.open(url, "_blank"));
};

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedArticleId, setSelectedArticleId] = useState("welcome-screen");
  const listApi = React.useRef<{ scrollToRow: (config: { index: number; align: string }) => void } | null>(null);

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
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth={false}
      disableScrollLock
      sx={{
        "& .MuiDialog-paper": {
          width: "95vw",
          height: "92vh",
          maxHeight: "92vh",
          borderRadius: "12px",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          m: 0,
          px: 2.5,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexShrink: 0,
          borderBottom: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}>
            ActOne Help Wiki
          </Typography>
          <Chip
            label={`${articles.length} articles`}
            size="small"
            sx={{ fontSize: 10, height: 20, borderRadius: "6px", fontWeight: 600 }}
          />
        </Box>
        <TextField
          size="small"
          placeholder="Search articles…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            flex: 1,
            maxWidth: 420,
            "& .MuiOutlinedInput-root": {
              borderRadius: "20px",
              height: 34,
              fontSize: "0.8rem",
              bgcolor: "action.hover",
              "& fieldset": { borderColor: "transparent" },
              "&:hover fieldset": { borderColor: "divider" },
              "&.Mui-focused fieldset": { borderColor: "primary.main" },
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start" sx={{ color: "text.secondary" }}>
                  <SearchIcon sx={{ fontSize: 16 }} />
                </InputAdornment>
              ),
              endAdornment: isSearching ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={handleClearSearch}
                    sx={{ color: "text.secondary", p: "2px" }}
                  >
                    <ClearIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />
        <IconButton aria-label="close" onClick={onClose} sx={{ color: "text.secondary", ml: "auto" }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: "flex", overflow: "hidden", height: "100%" }}>
        {/* Left Sidebar */}
        <Box
          sx={{
            width: 260,
            flexShrink: 0,
            borderRight: 1,
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            bgcolor: theme.palette.mode === "dark" ? "rgba(0,0,0,0.15)" : "rgba(0,0,0,0.02)",
          }}
        >
          {/* Category chips — hide when searching */}
          {!isSearching && (
            <Box sx={{ px: 1.5, pt: 1.5, pb: 1, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              <Chip
                label="All"
                size="small"
                onClick={() => setSelectedCategory(null)}
                sx={{
                  fontSize: 10.5,
                  height: 24,
                  fontWeight: 600,
                  borderRadius: "6px",
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
                    fontSize: 10.5,
                    height: 24,
                    fontWeight: 600,
                    borderRadius: "6px",
                    bgcolor: selectedCategory === cat ? "primary.main" : "action.hover",
                    color: selectedCategory === cat ? "primary.contrastText" : "text.secondary",
                    "&:hover": { bgcolor: selectedCategory === cat ? "primary.dark" : "action.selected" },
                  }}
                />
              ))}
            </Box>
          )}

          {/* Result count */}
          <Box sx={{ px: 1.5, py: 0.8 }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "text.disabled",
              }}
            >
              {isSearching
                ? `Results (${displayedArticles.length})`
                : selectedCategory || "All Articles"}
            </Typography>
          </Box>

          {/* Virtualized list */}
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
                style={{ height: window.innerHeight * 0.8 - 160, width: 260 }}
                overscanCount={10}
              />
            ) : (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic", fontSize: 12 }}>
                  No matching articles found.
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Article Content */}
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
              <Typography variant="h5" sx={{ fontWeight: 700, fontSize: 22, mb: 2 }}>
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
                      fontSize: 10.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      borderRadius: "6px",
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
                    variant="subtitle2"
                    sx={{ fontWeight: 700, fontSize: 12, mb: 1.5, color: "text.secondary" }}
                  >
                    Related Articles
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
                          sx={{ fontWeight: 600, fontSize: 12.5, color: "primary.main" }}
                        >
                          {rel.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
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
      </DialogContent>

      <Box
        sx={{
          borderTop: 1,
          borderColor: "divider",
          px: 2.5,
          py: 1,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5, fontWeight: 500 }}>
          ActOne v{__APP_VERSION__} &copy; 2026 Write Up Film Service Company
        </Typography>
        <Button
          onClick={openFountainGuide}
          endIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
          size="small"
          sx={{ textTransform: "none", fontWeight: 600, fontSize: 12 }}
        >
          Fountain Syntax Guide
        </Button>
      </Box>
    </Dialog>
  );
};
