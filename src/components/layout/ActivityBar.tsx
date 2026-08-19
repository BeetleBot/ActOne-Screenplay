import React, { useState, useCallback } from "react";
import { useUI, useFile, useTheme } from "../../context";
import { PILL_RADIUS } from "../../constants";
import { themes, THEME_CATEGORIES, ADAPTIVE_THEME_META } from "../../theme";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import {
  FolderSimplePlusIcon, CheckIcon, SettingsIcon, TimerIcon,
  KeyboardArrowDownIcon, CameraIcon,
  ViewAgendaIcon, AddNotesIcon, BeenhereIcon, AssignmentAddIcon,
  GarageIcon, MoreHorizIcon,
} from "../Icons";
import { ThemeLogo } from "../ThemeLogo";
import { isProseScript } from "../../utils/scriptMode";

interface ActivityBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  onOpenSettingsModal: () => void;
  onOpenThemeManagerModal?: () => void;
  onOpenPalette?: () => void;
}

export const ActivityBar = React.memo<ActivityBarProps>(({
  activeTab, setActiveTab, isSidebarOpen, setIsSidebarOpen,
  onOpenSettingsModal, onOpenThemeManagerModal, onOpenPalette,
}) => {
  const {
    paperSize, setPaperSize,
    typewriterMode, setTypewriterMode,
    hideSyntaxEnabled, setHideSyntaxEnabled,
    isZenMode,
    fountainColorsEnabled, setFountainColorsEnabled,
  } = useUI();
  const { theme, setTheme, customThemes } = useTheme();
  const { filePath, files, activeFileId } = useFile();
  const supportsExtended = filePath === null || filePath.toLowerCase().endsWith(".actone");
  const activeFile = files.find(f => f.id === activeFileId);
  const hasNoScripts = activeFile?.scripts && activeFile.scripts.length === 0;
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
    if (isSidebarOpen && activeTab === tab) setIsSidebarOpen(false);
    else { setActiveTab(tab); setIsSidebarOpen(true); }
  };

  const activeScript = activeFile?.scripts?.[activeFile.activeScriptIndex ?? 0];
  const isProse = isProseScript(activeScript, activeFile?.filePath);

  const allTabs = [
    { id: "outline", icon: <ViewAgendaIcon sx={{ fontSize: 20 }} />, title: "Outline" },
    { id: "scripts", icon: <FolderSimplePlusIcon sx={{ fontSize: 20 }} />, title: "Project" },
    { id: "notepad", icon: <AddNotesIcon sx={{ fontSize: 20 }} />, title: "Notepad" },
    { id: "markers", icon: <BeenhereIcon sx={{ fontSize: 20 }} />, title: "Markers", scriptOnly: true },
    { id: "todo", icon: <AssignmentAddIcon sx={{ fontSize: 20 }} />, title: "Tasks" },
    { id: "snapshots", icon: <CameraIcon sx={{ fontSize: 20 }} />, title: "Snapshots" },
    { id: "sprint", icon: <TimerIcon sx={{ fontSize: 20 }} />, title: "Sprint", scriptOnly: true },
    { id: "parking", icon: <GarageIcon sx={{ fontSize: 20 }} />, title: "Parking", scriptOnly: true },
  ];

  const availableTabs = allTabs.filter(t => !isProse || !t.scriptOnly);
  const tabs = supportsExtended ? availableTabs : availableTabs.filter(t => t.id === "outline" || t.id === "scripts");

  React.useEffect(() => {
    if (isProse && (activeTab === "markers" || activeTab === "sprint" || activeTab === "parking")) {
      setActiveTab("scripts");
    }
  }, [isProse, activeTab, setActiveTab]);

  return (
    <Box
      id="activity-bar"
      sx={{
        width: isZenMode ? 0 : 48, 
        minWidth: isZenMode ? 0 : 48,
        maxWidth: isZenMode ? 0 : 48,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        bgcolor: 'background.paper',
        borderRight: isZenMode ? 0 : 1,
        borderColor: 'divider',
        flexShrink: 0,
        pointerEvents: isZenMode ? 'none' : 'auto',
        overflow: 'hidden',
      }}
    >
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          flex: 1, 
          overflowY: 'auto', 
          width: '100%',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        <Box
          id="command-palette-btn"
          className="command-palette-btn"
          sx={{
            width: 47,
            minWidth: 47,
            maxWidth: 47,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative',
            cursor: 'pointer',
            bgcolor: 'primary.main',
            borderBottom: 1,
            borderColor: 'divider',
            transition: 'background-color var(--duration-slow) var(--easing-standard)',
            '&:hover': {
              bgcolor: 'transparent',
              '& .command-palette-icon': {
                color: 'primary.main',
              },
            },
            '@keyframes commandPaletteBounce': {
              '0%': { transform: 'scale(1)' },
              '40%': { transform: 'scale(0.82)' },
              '70%': { transform: 'scale(1.14)' },
              '100%': { transform: 'scale(1)' },
            },
            '&:active .command-palette-icon': {
              animation: 'commandPaletteBounce 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
          }}
          onClick={(e) => { e.stopPropagation(); onOpenPalette?.(); }}
        >
          <Tooltip title="Command Palette (Ctrl+K)" placement="right">
            <Box
              className="command-palette-icon"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 19,
                height: 19,
                color: 'primary.contrastText',
                transition: 'color var(--duration-slow) var(--easing-standard), transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <ThemeLogo variant="solid" />
            </Box>
          </Tooltip>
        </Box>
        {tabs.map((tab) => {
          const isActive = isSidebarOpen && activeTab === tab.id;
          const disabled = hasNoScripts;
          return (
            <Tooltip key={tab.id} title={tab.title} placement="right">
              <Box
                id={"activity-tab-" + tab.id}
                onClick={() => !disabled && handleClick(tab.id)}
                sx={{
                  width: 47,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: disabled ? 'default' : 'pointer',
                  color: isActive ? 'primary.contrastText' : 'text.secondary',
                  bgcolor: isActive ? 'primary.main' : 'transparent',
                  position: 'relative',
                  flexShrink: 0,
                  borderBottom: 1,
                  borderColor: 'divider',
                  opacity: disabled ? 0.4 : 1,
                  pointerEvents: disabled ? 'none' : 'auto',
                  transition: 'background-color var(--duration-slow) var(--easing-standard), color var(--duration-slow) var(--easing-standard)',
                  '&:hover': {
                    bgcolor: disabled ? 'transparent' : 'primary.main',
                    color: disabled ? 'text.secondary' : 'primary.contrastText',
                  },
                  '@keyframes activityIconBounce': {
                    '0%': { transform: 'scale(1)' },
                    '40%': { transform: 'scale(0.78)' },
                    '70%': { transform: 'scale(1.12)' },
                    '100%': { transform: 'scale(1)' },
                  },
                  '&:active .activity-icon-inner': {
                    animation: 'activityIconBounce 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  },
                }}
              >
                <Box
                  className="activity-icon-inner"
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {tab.icon}
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      <Divider sx={{ width: 28, my: 0.5 }} />

      <Tooltip title="Quick Settings" placement="right">
        <Box
          id="quick-settings"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            width: 47,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: anchorEl ? 'primary.contrastText' : 'text.secondary',
            bgcolor: anchorEl ? 'primary.main' : 'transparent',
            transition: 'background-color var(--duration-slow) var(--easing-standard), color var(--duration-slow) var(--easing-standard)',
            '&:hover': {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            },
            '&:active .activity-icon-inner': {
              animation: 'activityIconBounce 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
            },
          }}
        >
          <Box
            className="activity-icon-inner"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MoreHorizIcon sx={{ fontSize: 20 }} />
          </Box>
        </Box>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 220, ml: 1 } } }}
      >
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'primary.main' }}>
            Quick Settings
          </Typography>
        </Box>



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
            transition: 'transform var(--duration-normal)',
          }} />
        </Box>

        {!collapsedSections.has('editor') && (
          <>
            <MenuItem onClick={() => setTypewriterMode(!typewriterMode)} dense sx={{ py: 0.25, px: 1.5 }}>
              <ListItemIcon sx={{ minWidth: 28 }}>
                <Box sx={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {typewriterMode ? <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} /> : null}
                </Box>
              </ListItemIcon>
              <ListItemText primary={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Typewriter Mode</Typography>} />
            </MenuItem>

            {!isProse && (
              <>
                <MenuItem onClick={() => setHideSyntaxEnabled(!hideSyntaxEnabled)} dense sx={{ py: 0.25, px: 1.5 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <Box sx={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {hideSyntaxEnabled ? <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} /> : null}
                    </Box>
                  </ListItemIcon>
                  <ListItemText primary={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Hide Fountain Markup</Typography>} />
                </MenuItem>

                <MenuItem onClick={() => setFountainColorsEnabled(!fountainColorsEnabled)} dense sx={{ py: 0.25, px: 1.5 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <Box sx={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {fountainColorsEnabled ? <CheckIcon sx={{ fontSize: 16, color: 'primary.main' }} /> : null}
                    </Box>
                  </ListItemIcon>
                  <ListItemText primary={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Syntax Colors</Typography>} />
                </MenuItem>
              </>
            )}
          </>
        )}

        {collapsedSections.has('editor') && (
          <Box sx={{ px: 2, py: 0.6 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
              {[typewriterMode && 'Typewriter', !isProse && hideSyntaxEnabled && 'Markup hidden', !isProse && fountainColorsEnabled && 'Colors'].filter(Boolean).join(' • ') || 'All off'}
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
            transition: 'transform var(--duration-normal)',
          }} />
        </Box>

        {!collapsedSections.has('theme') && (
          <Box sx={{ px: 2, py: 1 }}>
            {THEME_CATEGORIES.map(cat => {
              const catThemes = themes.filter(t => t.category === cat.category);
              return (
                <Box key={cat.label}>
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontSize: '0.6rem', mb: 0.5, fontWeight: 600 }}>
                    {cat.label}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
                    {cat.adaptiveId && (() => {
                      const meta = ADAPTIVE_THEME_META[cat.adaptiveId!];
                      const isActive = theme === cat.adaptiveId;
                      return (
                        <Tooltip key={cat.adaptiveId} title={meta.label + " (follows system)"} placement="top">
                          <Box
                            onClick={() => setTheme(cat.adaptiveId!)}
                            sx={{
                              width: 28, height: 28, borderRadius: 0, cursor: 'pointer',
                              border: '2px solid', borderColor: isActive ? 'primary.main' : 'transparent',
                              display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden',
                              '&:hover': { borderColor: isActive ? 'primary.main' : 'divider' },
                              transition: 'border-color var(--duration-fast) ease',
                            }}
                          >
                            <Box sx={{ bgcolor: meta.swatchColors[0] }} />
                            <Box sx={{ bgcolor: meta.swatchColors[1] }} />
                            <Box sx={{ bgcolor: meta.swatchColors[2] }} />
                            <Box sx={{ bgcolor: meta.swatchColors[3] }} />
                          </Box>
                        </Tooltip>
                      );
                    })()}
                    {catThemes.map(t => {
                      const isActive = theme === t.id;
                      return (
                        <Tooltip key={t.id} title={t.name} placement="top">
                          <Box
                            onClick={() => setTheme(t.id)}
                            sx={{
                              width: 28, height: 28, borderRadius: 0, cursor: 'pointer',
                              border: '2px solid', borderColor: isActive ? 'primary.main' : 'transparent',
                              display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden',
                              '&:hover': { borderColor: isActive ? 'primary.main' : 'divider' },
                              transition: 'border-color var(--duration-fast) ease',
                            }}
                          >
                            <Box sx={{ bgcolor: t.colors.editor }} />
                            <Box sx={{ bgcolor: t.colors.sidebar }} />
                            <Box sx={{ bgcolor: t.colors.accent }} />
                            <Box sx={{ bgcolor: t.colors.dropdown }} />
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}

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
                            width: 28, height: 28, borderRadius: 0, cursor: 'pointer',
                            border: '2px solid', borderColor: isActive ? 'primary.main' : 'transparent',
                            display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden',
                            '&:hover': { borderColor: isActive ? 'primary.main' : 'divider' },
                            transition: 'border-color var(--duration-fast) ease',
                          }}
                        >
                          <Box sx={{ bgcolor: t.colors.editor }} />
                          <Box sx={{ bgcolor: t.colors.sidebar }} />
                          <Box sx={{ bgcolor: t.colors.accent }} />
                          <Box sx={{ bgcolor: t.colors.dropdown }} />
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
            transition: 'transform var(--duration-normal)',
          }} />
        </Box>

        {!collapsedSections.has('layout') && (
          <Box sx={{ px: 1.5, py: 0.5 }}>
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
          </Box>
        )}

        <Divider sx={{ my: 0.5 }} />

        <MenuItem onClick={() => { setAnchorEl(null); onOpenSettingsModal(); }} dense sx={{ py: 0.25, px: 1.5 }}>
          <ListItemIcon sx={{ minWidth: 28 }}><SettingsIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText primary={<Typography variant="body2" sx={{ fontSize: '0.8rem' }}>Full Settings</Typography>} />
        </MenuItem>
      </Menu>
    </Box>
  );
});
