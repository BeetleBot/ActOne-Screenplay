import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Collapse,
  IconButton,
  Tooltip,
  Alert,
  useTheme as useMuiTheme,
} from '@mui/material';
import {
  BugReportIcon,
  CheckCircleIcon,
  KeyboardArrowDownIcon,
  SendIcon,
  ContentCopyIcon,
  CheckIcon,
} from './Icons';
import { TitleBar } from './TitleBar';
import { getSystemDiagnostics, getAppVersion } from '../utils/errorReport';
import { sendBugReport } from '../utils/bugReport';
import { copyToClipboard } from '../utils';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BugReportModal: React.FC<BugReportModalProps> = ({ isOpen, onClose }) => {
  const muiTheme = useMuiTheme();
  const isDark = muiTheme.palette.mode === 'dark';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSystemDetails, setShowSystemDetails] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessCode, setSubmitSuccessCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const diag = getSystemDiagnostics();
  const appVersion = getAppVersion();

  const handleReset = () => {
    setName('');
    setEmail('');
    setDiscordUsername('');
    setDescription('');
    setIsSubmitting(false);
    setSubmitError(null);
    setSubmitSuccessCode(null);
    setShowSystemDetails(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const result = await sendBugReport({
      name: name.trim() || undefined,
      email: email.trim() || undefined,
      discordUsername: discordUsername.trim() || undefined,
      description: description.trim(),
    });

    setIsSubmitting(false);
    if (result.success) {
      setSubmitSuccessCode(result.code);
    } else {
      setSubmitError(result.error || 'Failed to submit bug report. Please try again.');
    }
  };

  const handleCopyCode = () => {
    if (!submitSuccessCode) return;
    void copyToClipboard(submitSuccessCode).then((ok) => {
      if (ok) {
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      }
    });
  };

  return (
    <Dialog
      open={isOpen}
      onClose={isSubmitting ? undefined : handleClose}
      maxWidth="sm"
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
      <TitleBar title="Report a Bug" onClose={isSubmitting ? () => {} : handleClose} isModal />

      <DialogContent sx={{ p: 2.5, pb: 1 }}>
        {submitSuccessCode ? (
          <Box sx={{ textAlign: 'center', py: 4, px: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: 'success.main',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 36 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>
              Bug Report Submitted
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440, mx: 'auto', mb: 3 }}>
              Thank you for helping improve ActOne! Your report has been submitted directly to the developer.
            </Typography>

            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                bgcolor: 'action.hover',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
                mb: 3,
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
                Reference Code:
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>
                {submitSuccessCode}
              </Typography>
              <Tooltip title={copiedCode ? "Copied!" : "Copy code"}>
                <IconButton size="small" onClick={handleCopyCode} sx={{ ml: 0.5 }}>
                  {copiedCode ? <CheckIcon sx={{ fontSize: 16, color: "success.main" }} /> : <ContentCopyIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </Tooltip>
            </Box>

            <Box>
              <Button variant="contained" onClick={handleClose} sx={{ minWidth: 120 }}>
                Done
              </Button>
            </Box>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Header intro */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '8px',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <BugReportIcon sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                  Send Bug Report to Developer
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Describe what went wrong and what you expected to happen.
                </Typography>
              </Box>
            </Box>

            {submitError && (
              <Alert severity="error" onClose={() => setSubmitError(null)} sx={{ py: 0.5 }}>
                {submitError}
              </Alert>
            )}

            {/* Inputs */}
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <TextField
                label="Your Name"
                placeholder="Optional"
                size="small"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                fullWidth
              />
              <TextField
                label="Contact Email"
                placeholder="Optional"
                size="small"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                fullWidth
              />
            </Box>

            <TextField
              label="Discord Username"
              placeholder="@username (optional)"
              size="small"
              value={discordUsername}
              onChange={(e) => setDiscordUsername(e.target.value)}
              disabled={isSubmitting}
              fullWidth
            />

            <TextField
              label="Explain the bug *"
              placeholder="What happened? Steps to reproduce, or unexpected behavior..."
              multiline
              rows={4}
              required
              size="small"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              fullWidth
              autoFocus
            />

            {/* Privacy & System Info Box */}
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'action.hover',
                borderRadius: '8px',
                border: '1px solid',
                borderColor: 'divider',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  System Diagnostics & Privacy Guarantee
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setShowSystemDetails((prev) => !prev)}
                  endIcon={
                    <KeyboardArrowDownIcon
                      sx={{
                        fontSize: 16,
                        transform: showSystemDetails ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s',
                      }}
                    />
                  }
                  sx={{ textTransform: 'none', py: 0, px: 1, minWidth: 0, fontSize: '0.75rem' }}
                >
                  {showSystemDetails ? 'Hide details' : 'View auto-detected details'}
                </Button>
              </Box>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                Submitting this report will send your description, contact info (if provided), system diagnostics, and recent app event logs directly to the developer.
              </Typography>
              <Typography variant="caption" color="primary.main" sx={{ display: 'block', mt: 0.25, fontWeight: 600 }}>
                🔒 No screenplay text, dialogue, character names, or story files are ever collected.
              </Typography>

              <Collapse in={showSystemDetails}>
                <Box
                  sx={{
                    mt: 1.5,
                    pt: 1.5,
                    borderTop: '1px solid',
                    borderColor: 'divider',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 1,
                    fontSize: '0.75rem',
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      App Version:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {appVersion}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Operating System:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {diag.os} {diag.osVersion}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Processor & Cores:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }} noWrap>
                      {diag.cpuModel !== 'unknown' ? `${diag.cpuModel} (${diag.cpuCount} cores)` : `${diag.cpuCount} cores`}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Memory:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {diag.totalMemoryMb > 0
                        ? `${(diag.availableMemoryMb / 1024).toFixed(1)} GB available of ${(diag.totalMemoryMb / 1024).toFixed(1)} GB`
                        : 'Available'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Display & Locale:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      {diag.viewport} · {diag.language}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Included logs:
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600 }}>
                      Last 30 operational logs (omits script text)
                    </Typography>
                  </Box>
                </Box>
              </Collapse>
            </Box>

            <DialogActions sx={{ px: 0, pt: 1, pb: 0 }}>
              <Button onClick={handleClose} disabled={isSubmitting} color="inherit">
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={!description.trim() || isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <SendIcon sx={{ fontSize: 16 }} />}
              >
                {isSubmitting ? 'Sending...' : 'Send Bug Report'}
              </Button>
            </DialogActions>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};
