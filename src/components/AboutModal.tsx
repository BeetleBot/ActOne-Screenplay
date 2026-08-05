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
  CloseIcon,
  ContentCopyIcon,
  CheckIcon,
  OpenInNewIcon,
  SendIcon,
  ColorLensIcon,
  InfoOutlinedIcon,
} from './Icons';
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
            borderRadius: '16px',
            bgcolor: 'background.paper',
            color: 'text.primary',
            backgroundImage: 'none',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: isDark
              ? '0 24px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)'
              : '0 24px 48px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
          },
        },
      }}
    >
      <Box sx={{ position: 'relative', pt: 4, pb: 3, px: 3, textAlign: 'center' }}>
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 12,
            top: 12,
            color: 'text.secondary',
            '&:hover': {
              color: 'text.primary',
              bgcolor: 'action.hover',
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>

        <Box
          sx={{
            width: 72,
            height: 72,
            mx: 'auto',
            mb: 2,
            borderRadius: '18px',
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)',
            p: 1.5,
          }}
        >
          <Box sx={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main' }}>
            <ThemeLogo variant="solid" />
          </Box>
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
          ActOne
        </Typography>

        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
          Native Fountain Screenplay Studio
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3, flexWrap: 'wrap' }}>
          <Chip
            icon={<InfoOutlinedIcon sx={{ fontSize: 14 }} />}
            label={version}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.75rem',
              bgcolor: 'action.selected',
              color: 'text.primary',
            }}
          />
          <Chip
            icon={<ColorLensIcon sx={{ fontSize: 14 }} />}
            label={displayThemeName}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.75rem',
              bgcolor: 'action.selected',
              color: 'text.primary',
            }}
          />
        </Box>

        <DialogContent sx={{ p: 0, mb: 3 }}>
          <Box
            sx={{
              bgcolor: 'action.hover',
              borderRadius: '12px',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <OpenInNewIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  ActOne Website
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={() => handleOpenUrl(actoneUrl)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: 'primary.main',
                  p: '2px 8px',
                  minWidth: 'auto',
                }}
              >
                actone.iyal.ink
              </Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <OpenInNewIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Fount TUI Website
                </Typography>
              </Box>
              <Button
                size="small"
                onClick={() => handleOpenUrl(fountUrl)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: 'primary.main',
                  p: '2px 8px',
                  minWidth: 'auto',
                }}
              >
                fount.iyal.ink
              </Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <SendIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Support Email
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.78rem',
                    color: 'text.primary',
                  }}
                >
                  {supportEmail}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy Support Email'}>
                  <IconButton size="small" onClick={handleCopyEmail} sx={{ p: '2px' }}>
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

        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          © 2026 iyal.ink — Tools for the story in progress.
        </Typography>
      </Box>
    </Dialog>
  );
};

