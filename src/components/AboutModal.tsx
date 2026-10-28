import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  useTheme as useMuiTheme,
  Chip,
  Tooltip,
} from '@mui/material';
import {
  ContentCopyIcon,
  CheckIcon,
  OpenInNewIcon,
  SendIcon,
  ColorLensIcon,
  InfoOutlinedIcon,
  LibraryBooksIcon,
  ChevronRightIcon,
  ArrowDownwardIcon,
} from './Icons';
import { TitleBar } from './TitleBar';
import { ThemeLogo } from './ThemeLogo';
import { useTheme as useAppTheme } from '../context';
import { resolveThemeConfig } from '../theme/themeUtils';
import { copyToClipboard } from '../utils';

interface DependencyCredit {
  name: string;
  category: 'Core' | 'Frontend' | 'Backend';
  description: string;
  url: string;
}

const DEPENDENCY_CREDITS: DependencyCredit[] = [
  // Core & Editor
  {
    name: 'CodeMirror 6',
    category: 'Core',
    description: 'Next-generation extensible code & screenplay text editor system',
    url: 'https://codemirror.net',
  },
  {
    name: 'Excalidraw',
    category: 'Core',
    description: 'Virtual whiteboard & sketching canvas for visual story planning',
    url: 'https://excalidraw.com',
  },
  {
    name: 'Material UI (MUI 9)',
    category: 'Core',
    description: 'Comprehensive component library powering the design system & UI',
    url: 'https://mui.com',
  },
  {
    name: 'Tauri v2',
    category: 'Core',
    description: 'Fast, secure & lightweight cross-platform desktop application runtime',
    url: 'https://v2.tauri.app',
  },
  // Frontend
  {
    name: 'React 19 & React DOM',
    category: 'Frontend',
    description: 'Modern component-driven declarative UI framework',
    url: 'https://react.dev',
  },
  {
    name: 'Phosphor Icons',
    category: 'Frontend',
    description: 'Flexible icon family delivering clean, customizable UI iconography',
    url: 'https://phosphoricons.com',
  },
  {
    name: 'PDF.js (pdfjs-dist)',
    category: 'Frontend',
    description: 'Mozilla PDF parsing and rendering engine for script imports & previews',
    url: 'https://mozilla.github.io/pdf.js/',
  },
  {
    name: 'React Window',
    category: 'Frontend',
    description: 'High-performance virtual windowing for large lists & screenplay views',
    url: 'https://github.com/bvaughn/react-window',
  },
  {
    name: 'Fuse.js',
    category: 'Frontend',
    description: 'Lightweight fuzzy-search library for screenplay search & command palette',
    url: 'https://www.fusejs.io',
  },
  {
    name: 'diff-match-patch',
    category: 'Frontend',
    description: 'Robust algorithms for computing text diffs, matches, and patches',
    url: 'https://github.com/google/diff-match-patch',
  },
  {
    name: 'React Markdown & Remark / Rehype',
    category: 'Frontend',
    description: 'Markdown processor powering prose notes, treatments, and help guides',
    url: 'https://github.com/remarkjs/react-markdown',
  },
  {
    name: 'fflate',
    category: 'Frontend',
    description: 'High-speed compression tool for reading and writing .actone zip bundles',
    url: 'https://github.com/101arrowz/fflate',
  },
  {
    name: 'Emotion',
    category: 'Frontend',
    description: 'CSS-in-JS styling engine powering flexible component styles',
    url: 'https://emotion.sh',
  },
  // Rust & Backend
  {
    name: 'Krilla',
    category: 'Backend',
    description: 'High-performance Rust PDF generation engine for screenplay typesetting',
    url: 'https://github.com/LaurenzV/krilla',
  },
  {
    name: 'Cosmic Text',
    category: 'Backend',
    description: 'Advanced multi-font text layout and shaping engine',
    url: 'https://github.com/pop-os/cosmic-text',
  },
  {
    name: 'Pulldown-cmark',
    category: 'Backend',
    description: 'Fast, pull-based CommonMark parser for native prose and export flows',
    url: 'https://github.com/raphlinus/pulldown-cmark',
  },
  {
    name: 'Spellbook',
    category: 'Backend',
    description: 'Native spellchecking and dictionary suggestions provider',
    url: 'https://github.com/revery-ui/spellbook',
  },
  {
    name: 'Tokio',
    category: 'Backend',
    description: 'Asynchronous runtime for background jobs, file I/O, and networking',
    url: 'https://tokio.rs',
  },
  {
    name: 'Reqwest & Serde',
    category: 'Backend',
    description: 'Ergonomic HTTP client and serializing/deserializing framework for Rust',
    url: 'https://serde.rs',
  },
];

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const muiTheme = useMuiTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const { theme: activeThemeId, customThemes } = useAppTheme();
  const [copied, setCopied] = useState(false);
  const [showCredits, setShowCredits] = useState(false);

  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentThemeConfig = resolveThemeConfig(activeThemeId, customThemes, systemDark);

  const supportEmail = 'actonesupport@iyal.ink';
  const actoneUrl = 'https://actone.iyal.ink';
  const fountUrl = 'https://fount.iyal.ink';
  const appVersion = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.4.21';
  const version = `v${appVersion}`;
  const displayThemeName = currentThemeConfig.name;

  const handleOpenUrl = (url: string) => {
    try {
      import('@tauri-apps/plugin-opener').then(({ openUrl }) => openUrl(url));
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleCopyEmail = () => {
    void copyToClipboard(supportEmail).then((success) => {
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '12px',
            bgcolor: 'background.paper',
            color: 'text.primary',
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: isDark
              ? '0 16px 32px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)'
              : '0 16px 32px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
          },
        },
      }}
    >
      <TitleBar title="About ActOne" onClose={onClose} isModal />
      
      <Box sx={{ p: 2.5 }}>
        {/* Header Hero Section */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            p: 2,
            mb: 2,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: '10px',
          }}
        >
          <Box
            sx={{
              width: 54,
              height: 54,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              p: 1.25,
              borderRadius: '8px',
            }}
          >
            <ThemeLogo variant="solid" />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.01em', lineHeight: 1.2 }}>
              ActOne
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25, fontSize: 11, fontWeight: 500 }}>
              Native Fountain Screenplay Studio
            </Typography>
          </Box>
        </Box>

        {/* Technical Chips */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Chip
            icon={<InfoOutlinedIcon sx={{ fontSize: 13 }} />}
            label={`VERSION ${version.toUpperCase()}`}
            size="small"
            sx={{
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.68rem',
              letterSpacing: '0.04em',
              bgcolor: 'action.selected',
              color: 'text.primary',
              height: 24,
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
          <Chip
            icon={<ColorLensIcon sx={{ fontSize: 13 }} />}
            label={displayThemeName.toUpperCase()}
            size="small"
            sx={{
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.68rem',
              letterSpacing: '0.04em',
              bgcolor: 'action.selected',
              color: 'text.primary',
              height: 24,
              border: '1px solid',
              borderColor: 'divider',
            }}
          />
        </Box>

        {/* Resources Card */}
        <DialogContent sx={{ p: 0, mb: 2 }}>
          <Box
            sx={{
              bgcolor: 'background.paper',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <OpenInNewIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                  ActOne Studio Website
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={() => handleOpenUrl(actoneUrl)}
                sx={{
                  borderRadius: '20px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: 'primary.main',
                  px: 1.5,
                  py: 0.25,
                  minWidth: 'auto',
                }}
              >
                actone.iyal.ink
              </Button>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <OpenInNewIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                  Fount TUI Website
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={() => handleOpenUrl(fountUrl)}
                sx={{
                  borderRadius: '20px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  color: 'primary.main',
                  px: 1.5,
                  py: 0.25,
                  minWidth: 'auto',
                }}
              >
                fount.iyal.ink
              </Button>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <SendIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                  Support Email
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: 'text.primary',
                  }}
                >
                  {supportEmail}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy Support Email'}>
                  <IconButton size="small" onClick={handleCopyEmail} sx={{ p: '4px', borderRadius: '20px' }}>
                    {copied ? (
                      <CheckIcon sx={{ fontSize: 14, color: 'success.main' }} />
                    ) : (
                      <ContentCopyIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            {/* Credits Toggle Button */}
            <Box
              onClick={() => setShowCredits((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowCredits((prev) => !prev);
                }
              }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 1.5,
                cursor: 'pointer',
                bgcolor: showCredits ? 'action.selected' : 'transparent',
                '&:hover': {
                  bgcolor: 'action.hover',
                },
                transition: 'background-color 0.15s ease',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <LibraryBooksIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 12 }}>
                  Credits & Open Source Dependencies
                </Typography>
              </Box>
              <IconButton size="small" sx={{ p: '2px', color: 'text.secondary' }} tabIndex={-1} aria-label={showCredits ? "Hide Credits" : "Show Credits"}>
                {showCredits ? <ArrowDownwardIcon sx={{ fontSize: 14 }} /> : <ChevronRightIcon sx={{ fontSize: 14 }} />}
              </IconButton>
            </Box>

            {/* Expandable Credits List */}
            {showCredits && (
              <Box
                sx={{
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'action.hover',
                  p: 1.5,
                  maxHeight: 220,
                  overflowY: 'auto',
                }}
              >
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5, fontSize: 11 }}>
                  ActOne is built with gratitude on these major open-source libraries and frameworks:
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {DEPENDENCY_CREDITS.map((dep) => (
                    <Box
                      key={dep.name}
                      sx={{
                        p: 1,
                        bgcolor: 'background.paper',
                        borderRadius: '6px',
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 0.25,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                            {dep.name}
                          </Typography>
                          <Chip
                            label={dep.category}
                            size="small"
                            sx={{
                              height: 16,
                              fontSize: '0.6rem',
                              fontWeight: 600,
                              borderRadius: '4px',
                            }}
                          />
                        </Box>
                        <Tooltip title={`Visit ${dep.name}`}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenUrl(dep.url)}
                            sx={{ p: '2px', color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                          >
                            <OpenInNewIcon sx={{ fontSize: 12 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.68rem', lineHeight: 1.3 }}>
                        {dep.description}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>

        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 0.5 }}>
          <Chip
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.68rem', color: 'text.secondary' }}>
                  © 2026
                </Typography>
                <Typography
                  variant="caption"
                  component="span"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenUrl('https://iyal.ink');
                  }}
                  sx={{
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    color: 'primary.main',
                    cursor: 'pointer',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  iyal.ink
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 500, fontSize: '0.68rem', color: 'text.secondary' }}>
                  — Tools for the story in progress.
                </Typography>
              </Box>
            }
            size="small"
            sx={{
              borderRadius: '20px',
              height: 26,
              bgcolor: 'action.hover',
              border: '1px solid',
              borderColor: 'divider',
              px: 0.5,
            }}
          />
        </Box>
      </Box>
    </Dialog>
  );
};
