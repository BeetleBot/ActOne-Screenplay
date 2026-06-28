import React, { useState, useCallback } from "react";
import { useUI, useFile, useTheme } from "../../context";
import { PILL_RADIUS } from "../../constants";
import { themes } from "../../theme";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Slider from "@mui/material/Slider";
import Button from "@mui/material/Button";
import {
  FormatListBulletedIcon, LibraryBooksIcon, PersonIcon, BarChartIcon,
  AssignmentIcon, ArchiveIcon, TuneIcon, SearchIcon, CheckIcon,
  RestartAltIcon, SettingsIcon, BookmarkIcon, TimerIcon, NoteAddIcon,
  KeyboardArrowDownIcon,
} from "../Icons";

interface ActivityBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenSettingsModal: () => void;
  onOpenPalette: () => void;
  onOpenBreakdownModal: () => void;
  onOpenThemeManagerModal?: () => void;
}

export const ActivityBar: React.FC<ActivityBarProps> = ({
  activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen,
  onOpenSettingsModal, onOpenPalette, onOpenBreakdownModal, onOpenThemeManagerModal,
}) => {
  const {
    paperSize, setPaperSize,
    typewriterMode, setTypewriterMode, zoomLevel, setZoomLevel,
    appScale, setAppScale,
    hideSyntaxEnabled, setHideSyntaxEnabled,
    isZenMode,
  } = useUI();
  const { theme, setTheme, customThemes } = useTheme();
  const { filePath } = useFile();
  const supportsExtended = filePath === null || filePath.toLowerCase().endsWith(".actone");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const toggleSection = useCallback((key: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleClick = (tab: string) => {
    if (tab === "tags") {
      onOpenBreakdownModal();
      return;
    }
    if (isSidebarOpen && activeTab === tab) setIsSidebarOpen(false);
    else { setActiveTab(tab); setIsSidebarOpen(true); }
  };

  const allTabs = [
    { id: "outline", icon: <FormatListBulletedIcon sx={{ fontSize: 20 }} />, title: "Outline" },
    { id: "scripts", icon: <LibraryBooksIcon sx={{ fontSize: 20 }} />, title: "Scripts" },
    { id: "characters", icon: <PersonIcon sx={{ fontSize: 20 }} />, title: "Characters" },
    { id: "stats", icon: <BarChartIcon sx={{ fontSize: 20 }} />, title: "Statistics" },
    { id: "notepad", icon: <NoteAddIcon sx={{ fontSize: 20 }} />, title: "Notepad" },
    { id: "markers", icon: <BookmarkIcon sx={{ fontSize: 20 }} />, title: "Markers" },
    { id: "todo", icon: <AssignmentIcon sx={{ fontSize: 20 }} />, title: "Tasks" },
    { id: "sprint", icon: <TimerIcon sx={{ fontSize: 20 }} />, title: "Sprint" },
    { id: "parking", icon: <ArchiveIcon sx={{ fontSize: 20 }} />, title: "Parking" },
  ];
  const tabs = supportsExtended ? allTabs : allTabs.filter(t => t.id === "outline" || t.id === "stats");

  return (
    <Box
      sx={{
        width: isZenMode ? 0 : 48, display: 'flex', flexDirection: 'column',
        alignItems: 'center', py: 0.5, gap: 0.25,
        bgcolor: 'background.paper', borderRight: isZenMode ? 0 : 1, borderColor: 'divider',
        flexShrink: 0,
        // Zen mode transition support with staggered delay (0.05s)
        opacity: isZenMode ? 0 : 1,
        transform: isZenMode ? 'translateX(-100%)' : 'translateX(0)',
        pointerEvents: isZenMode ? 'none' : 'auto',
        transition: 'opacity 0.3s ease-in-out 0.05s, transform 0.3s ease-in-out 0.05s, width 0.3s ease-in-out 0.05s, border-right 0.3s ease-in-out 0.05s',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.25, flex: 1 }}>
        {tabs.map((tab) => {
          const isActive = isSidebarOpen && activeTab === tab.id;
          return (
            <Tooltip key={tab.id} title={tab.title} placement="right">
              <IconButton
                onClick={() => handleClick(tab.id)}
                sx={{
                  p: 1, borderRadius: '12px',
                  color: isActive ? 'var(--button-color)' : 'text.secondary',
                  bgcolor: isActive ? 'action.selected' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                  position: 'relative',
                  '&::before': isActive ? {
                    content: '""', position: 'absolute', left: -4,
                    top: '25%', bottom: '25%', width: 3,
                    borderRadius: '3px', bgcolor: 'primary.main',
                  } : {},
                }}
              >
                {tab.icon}
              </IconButton>
            </Tooltip>
          );
        })}
      </Box>

      <Divider sx={{ width: 28, my: 0.5 }} />

      <Tooltip title="Commands (Ctrl+K)" placement="right">
        <IconButton
          onClick={onOpenPalette}
          sx={{
            p: 1, borderRadius: '12px',
            color: 'text.secondary',
            '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
          }}
        >
          <SearchIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Tooltip title="Quick Settings" placement="right">
        <IconButton
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            p: 1, borderRadius: '12px',
            color: anchorEl ? 'var(--button-color)' : 'text.secondary',
            bgcolor: anchorEl ? 'action.selected' : 'transparent',
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <TuneIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { minWidth: 260, ml: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'primary.main' }}>
            Quick Settings
          </Typography>
        </Box>

        <Divider sx={{ mb: 0.5 }} />

        {/* ── View & Scale ── */}
        <Box
          sx={{ px: 2, pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => toggleSection('view')}
        >
          <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, fontSize: '0.65rem' }}>
            View & Scale
          </Typography>
          <KeyboardArrowDownIcon sx={{
            fontSize: 16, color: 'text.disabled',
            transform: collapsedSections.has('view') ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }} />
        </Box>

        {!collapsedSections.has('view') && (
          <>
            <Box sx={{ px: 2, py: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Interface Scale</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography variant="caption" color="primary">{appScale}%</Typography>
                  <IconButton
                    size="small" onClick={() => { setZoomLevel(100); setAppScale(100); }}
                    sx={{ p: 0.2, color: (appScale !== 100 || zoomLevel !== 100) ? 'primary.main' : 'text.disabled' }}
                  >
                    <RestartAltIcon sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              </Box>
              <Slider size="small" min={50} max={300} step={5} value={appScale}
                onChange={(_, val) => setAppScale(val as number)} aria-label="Interface Scale" />
            </Box>

            <Box sx={{ px: 2, py: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Editor Zoom</Typography>
                <Typography variant="caption" color="primary">{zoomLevel}%</Typography>
              </Box>
              <Slider size="small" min={50} max={400} step={10} value={zoomLevel}
                onChange={(_, val) => setZoomLevel(val as number)} aria-label="Editor Zoom" />
            </Box>
          </>
        )}

        <Divider sx={{ my: 0.5 }} />

        {/* ── Editor Preferences ── */}
        <Box
          sx={{ px: 2, pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => toggleSection('editor')}
        >
          <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, fontSize: '0.65rem' }}>
            Editor Preferences
          </Typography>
          <KeyboardArrowDownIcon sx={{
            fontSize: 16, color: 'text.disabled',
            transform: collapsedSections.has('editor') ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }} />
        </Box>

        {!collapsedSections.has('editor') && (
          <>
            <MenuItem onClick={() => setTypewriterMode(!typewriterMode)} dense>
              <ListItemIcon>
                <Box sx={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {typewriterMode ? <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} /> : null}
                </Box>
              </ListItemIcon>
              <ListItemText primary={<Typography variant="body2">Typewriter Mode</Typography>} />
            </MenuItem>

            <MenuItem onClick={() => setHideSyntaxEnabled(!hideSyntaxEnabled)} dense>
              <ListItemIcon>
                <Box sx={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {hideSyntaxEnabled ? <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} /> : null}
                </Box>
              </ListItemIcon>
              <ListItemText primary={<Typography variant="body2">Hide Fountain Markup</Typography>} />
            </MenuItem>
          </>
        )}

        {collapsedSections.has('editor') && (
          <Box sx={{ px: 2, py: 0.6 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
              {[typewriterMode && 'Typewriter', hideSyntaxEnabled && 'Markup hidden'].filter(Boolean).join(' • ') || 'All off'}
            </Typography>
          </Box>
        )}

        <Divider sx={{ my: 0.5 }} />

        {/* ── Theme ── */}
        <Box
          sx={{ px: 2, pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => toggleSection('theme')}
        >
          <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, fontSize: '0.65rem' }}>
            Theme
          </Typography>
          <KeyboardArrowDownIcon sx={{
            fontSize: 16, color: 'text.disabled',
            transform: collapsedSections.has('theme') ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }} />
        </Box>

        {!collapsedSections.has('theme') && (
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontSize: '0.6rem', mb: 0.5, fontWeight: 600 }}>
              Light
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              {themes.filter(t => !t.isDark).map((t) => {
                const isActive = theme === t.id;
                return (
                  <Tooltip key={t.id} title={t.name} placement="top">
                    <Box
                      onClick={() => setTheme(t.id)}
                      sx={{
                        width: 28, height: 28, borderRadius: '7px', cursor: 'pointer',
                        border: '2px solid', borderColor: isActive ? 'primary.main' : 'transparent',
                        display: 'flex', overflow: 'hidden',
                        '&:hover': { borderColor: isActive ? 'primary.main' : 'divider' },
                        transition: 'border-color 0.12s ease',
                      }}
                    >
                      <Box sx={{ width: 7, bgcolor: t.colors.sidebar }} />
                      <Box sx={{ flex: 1, bgcolor: t.colors.editor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: t.colors.accent }} />
                      </Box>
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>

            <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontSize: '0.6rem', mb: 0.5, fontWeight: 600 }}>
              Dark
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              {themes.filter(t => t.isDark).map((t) => {
                const isActive = theme === t.id;
                return (
                  <Tooltip key={t.id} title={t.name} placement="top">
                    <Box
                      onClick={() => setTheme(t.id)}
                      sx={{
                        width: 28, height: 28, borderRadius: '7px', cursor: 'pointer',
                        border: '2px solid', borderColor: isActive ? 'primary.main' : 'transparent',
                        display: 'flex', overflow: 'hidden',
                        '&:hover': { borderColor: isActive ? 'primary.main' : 'divider' },
                        transition: 'border-color 0.12s ease',
                      }}
                    >
                      <Box sx={{ width: 7, bgcolor: t.colors.sidebar }} />
                      <Box sx={{ flex: 1, bgcolor: t.colors.editor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: t.colors.accent }} />
                      </Box>
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>

            <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontSize: '0.6rem', mb: 0.5, fontWeight: 600 }}>
              Adaptive
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
              {(() => {
                const isActive = theme === 'adaptive';
                return (
                  <Tooltip title="Adaptive (follows system)" placement="top">
                    <Box
                      onClick={() => setTheme('adaptive')}
                      sx={{
                        width: 28, height: 28, borderRadius: '7px', cursor: 'pointer',
                        border: '2px solid', borderColor: isActive ? 'primary.main' : 'transparent',
                        display: 'flex', overflow: 'hidden',
                        '&:hover': { borderColor: isActive ? 'primary.main' : 'divider' },
                        transition: 'border-color 0.12s ease',
                      }}
                    >
                      <Box sx={{ width: 7, bgcolor: 'text.disabled' }} />
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ flex: 1, bgcolor: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#1976d2' }} />
                        </Box>
                        <Box sx={{ flex: 1, bgcolor: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#90caf9' }} />
                        </Box>
                      </Box>
                    </Box>
                  </Tooltip>
                );
              })()}
            </Box>

            {customThemes.length > 0 && (
              <>
                <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontSize: '0.6rem', mb: 0.5, fontWeight: 600 }}>
                  Custom
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                  {customThemes.map((t) => {
                    const isActive = theme === t.id;
                    return (
                      <Tooltip key={t.id} title={t.name} placement="top">
                        <Box
                          onClick={() => setTheme(t.id)}
                          sx={{
                            width: 28, height: 28, borderRadius: '7px', cursor: 'pointer',
                            border: '2px solid', borderColor: isActive ? 'primary.main' : 'transparent',
                            display: 'flex', overflow: 'hidden',
                            '&:hover': { borderColor: isActive ? 'primary.main' : 'divider' },
                            transition: 'border-color 0.12s ease',
                          }}
                        >
                          <Box sx={{ width: 7, bgcolor: t.colors.sidebar }} />
                          <Box sx={{ flex: 1, bgcolor: t.colors.editor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: t.colors.accent }} />
                          </Box>
                        </Box>
                      </Tooltip>
                    );
                  })}
                </Box>
              </>
            )}

            {onOpenThemeManagerModal && (
              <Button size="small" fullWidth onClick={onOpenThemeManagerModal} sx={{ fontSize: '0.65rem', py: 0.3, mt: 0.5 }}>
                Open Theme Manager
              </Button>
            )}
          </Box>
        )}

        <Divider sx={{ my: 0.5 }} />

        {/* ── Layout & Page ── */}
        <Box
          sx={{ px: 2, pt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
          onClick={() => toggleSection('layout')}
        >
          <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, fontSize: '0.65rem' }}>
            Layout & Page
          </Typography>
          <KeyboardArrowDownIcon sx={{
            fontSize: 16, color: 'text.disabled',
            transform: collapsedSections.has('layout') ? 'rotate(-90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }} />
        </Box>

        {!collapsedSections.has('layout') && (
          <MenuItem onClick={() => {}} sx={{ cursor: 'default', '&:hover': { bgcolor: 'transparent' } }}>
            <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
               <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant={paperSize === "letter" ? "contained" : "outlined"}
                    fullWidth
                    onClick={() => setPaperSize("letter")}
                     sx={{ fontSize: '0.65rem', py: 0.5, borderRadius: PILL_RADIUS }}
                   >
                    Letter
                  </Button>
                  <Button
                    size="small"
                    variant={paperSize === "a4" ? "contained" : "outlined"}
                    fullWidth
                    onClick={() => setPaperSize("a4")}
                    sx={{ fontSize: '0.65rem', py: 0.5, borderRadius: PILL_RADIUS }}
                  >
                    A4
                  </Button>
               </Box>
            </Box>
          </MenuItem>
        )}

        <Divider sx={{ my: 0.5 }} />

        <MenuItem onClick={() => { setAnchorEl(null); onOpenSettingsModal(); }} dense>
          <ListItemIcon><SettingsIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText primary={<Typography variant="body2">Full Settings</Typography>} />
        </MenuItem>
      </Menu>
    </Box>
  );
};
