import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Button,
  useTheme,
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

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [copied, setCopied] = useState(false);

  const supportEmail = 'actonesupport@iyal.ink';
  const actoneUrl = 'https://actone.iyal.ink';
  const fountUrl = 'https://fount.iyal.ink';
  const version = 'v0.4.6';
  const themeName = isDark ? 'Dark Studio' : 'Light Paper';

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
            bgcolor: isDark ? '#141416' : '#FFFFFF',
            color: isDark ? '#F0F0F0' : '#1A1A1A',
            backgroundImage: 'none',
            boxShadow: isDark
              ? '0 24px 48px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)'
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
            color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
            '&:hover': {
              color: isDark ? '#FFFFFF' : '#000000',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
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
            bgcolor: isDark ? '#1E1E22' : '#F5F5F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
            p: 1.5,
          }}
        >
          <img
            src="/ActOne_apptile.png"
            alt="ActOne Logo"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </Box>

        <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 0.5 }}>
          ActOne
        </Typography>

        <Typography variant="body2" sx={{ color: isDark ? '#999999' : '#666666', mb: 2 }}>
          Native Fountain Screenplay Studio
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
          <Chip
            icon={<InfoOutlinedIcon sx={{ fontSize: 14 }} />}
            label={version}
            size="small"
            sx={{
              fontWeight: 700,
              fontSize: '0.75rem',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              color: isDark ? '#E0E0E0' : '#333333',
            }}
          />
          <Chip
            icon={<ColorLensIcon sx={{ fontSize: 14 }} />}
            label={themeName}
            size="small"
            sx={{
              fontWeight: 600,
              fontSize: '0.75rem',
              bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              color: isDark ? '#E0E0E0' : '#333333',
            }}
          />
        </Box>

        <DialogContent sx={{ p: 0, mb: 3 }}>
          <Box
            sx={{
              bgcolor: isDark ? '#1A1A1E' : '#F9F9FA',
              borderRadius: '12px',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
              border: isDark ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <OpenInNewIcon sx={{ fontSize: 18, color: isDark ? '#AAAAAA' : '#666666' }} />
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
                  color: isDark ? '#66B2FF' : '#0066CC',
                  p: '2px 8px',
                  minWidth: 'auto',
                }}
              >
                actone.iyal.ink
              </Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <OpenInNewIcon sx={{ fontSize: 18, color: isDark ? '#AAAAAA' : '#666666' }} />
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
                  color: isDark ? '#66B2FF' : '#0066CC',
                  p: '2px 8px',
                  minWidth: 'auto',
                }}
              >
                fount.iyal.ink
              </Button>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                <SendIcon sx={{ fontSize: 18, color: isDark ? '#AAAAAA' : '#666666' }} />
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
                    color: isDark ? '#CCCCCC' : '#444444',
                  }}
                >
                  {supportEmail}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy Support Email'}>
                  <IconButton size="small" onClick={handleCopyEmail} sx={{ p: '2px' }}>
                    {copied ? (
                      <CheckIcon sx={{ fontSize: 14, color: '#4CAF50' }} />
                    ) : (
                      <ContentCopyIcon sx={{ fontSize: 14, color: isDark ? '#888' : '#666' }} />
                    )}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>
        </DialogContent>

        <Typography variant="caption" sx={{ color: isDark ? '#666666' : '#999999', display: 'block' }}>
          © 2026 iyal.ink — Tools for the story in progress.
        </Typography>
      </Box>
    </Dialog>
  );
};
