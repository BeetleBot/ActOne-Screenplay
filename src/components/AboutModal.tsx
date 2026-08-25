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
} from './Icons';
import { TitleBar } from './TitleBar';
import { ThemeLogo } from './ThemeLogo';
import { useTheme as useAppTheme } from '../context';
import { resolveThemeConfig } from '../theme/themeUtils';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const muiTheme = useMuiTheme();
  const isDark = muiTheme.palette.mode === 'dark';
  const { theme: activeThemeId, customThemes } = useAppTheme();
  const [copied, setCopied] = useState(false);

  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const currentThemeConfig = resolveThemeConfig(activeThemeId, customThemes, systemDark);

  const supportEmail = 'actonesupport@iyal.ink';
  const actoneUrl = 'https://actone.iyal.ink';
  const fountUrl = 'https://fount.iyal.ink';
  const version = 'v0.4.6';
  const displayThemeName = currentThemeConfig.name;

  const handleOpenUrl = (url: string) => {
    try {
      import('@tauri-apps/plugin-opener').then(({ openUrl }) => openUrl(url));
    } catch {
      window.open(url, '_blank');
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(supportEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
        <DialogContent sx={{ p: 0, mb: 2.5 }}>
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


