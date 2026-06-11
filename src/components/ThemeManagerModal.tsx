import React, { useState } from "react";
import { useTheme, type CustomTheme } from "../context/ThemeContext";
import { deriveThemeBg, deriveThemeSidebar } from "../theme/muiTheme";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, IconButton, Box, Button, TextField, Switch,
  Tooltip,
} from "@mui/material";
import { CloseIcon, AddIcon, DeleteIcon, CheckIcon } from "./Icons";

interface ThemeManagerModalProps {
  onClose: () => void;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
      <Typography variant="caption" sx={{ minWidth: 60, fontWeight: 600 }}>{label}</Typography>
      <Box
        component="input"
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{
          width: 36, height: 36, p: 0, border: '2px solid', borderColor: 'divider',
          borderRadius: '8px', cursor: 'pointer', bgcolor: 'transparent',
          '&::-webkit-color-swatch-wrapper': { p: 0 },
          '&::-webkit-color-swatch': { border: 'none', borderRadius: '6px' },
        }}
      />
      <TextField
        size="small"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ '& input': { fontSize: '0.8rem', fontFamily: 'monospace', py: 0.75, px: 1 } }}
      />
    </Box>
  );
}

function ThemePreview({ text, accent, isDark }: { text: string; accent: string; isDark: boolean }) {
  const bg = deriveThemeBg(accent, isDark);
  const sideBg = deriveThemeSidebar(accent, isDark);
  return (
    <Box sx={{
      display: 'flex', height: 64, borderRadius: '10px', overflow: 'hidden', border: '1px solid', borderColor: 'divider',
    }}>
      <Box sx={{ flex: 1, bgcolor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: accent }} />
        <Typography variant="caption" sx={{ color: text, fontWeight: 600, fontSize: '0.7rem' }}>Aa</Typography>
      </Box>
      <Box sx={{ width: 28, bgcolor: sideBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: accent }} />
      </Box>
    </Box>
  );
}

export const ThemeManagerModal: React.FC<ThemeManagerModalProps> = ({ onClose }) => {
  const { theme, setTheme, customThemes, addCustomTheme, updateCustomTheme, deleteCustomTheme } = useTheme();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formIsDark, setFormIsDark] = useState(false);
  const [formText, setFormText] = useState("#1a1c1e");
  const [formAccent, setFormAccent] = useState("#0061a4");
  const [formSidebar, setFormSidebar] = useState("#f5f5f5");

  const resetForm = () => {
    setFormName("");
    setFormIsDark(false);
    setFormText("#1a1c1e");
    setFormAccent("#0061a4");
    setFormSidebar("#f5f5f5");
    setEditingId(null);
    setShowForm(false);
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (ct: CustomTheme) => {
    setFormName(ct.name);
    setFormIsDark(ct.isDark);
    setFormText(ct.colors.text);
    setFormAccent(ct.colors.accent);
    setFormSidebar(ct.colors.sidebar);
    setEditingId(ct.id);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!formName.trim()) return;
    const colors = { text: formText, accent: formAccent, sidebar: formSidebar };
    if (editingId) {
      updateCustomTheme(editingId, formName.trim(), formIsDark, colors);
      if (theme === editingId) setTheme(editingId);
    } else {
      addCustomTheme(formName.trim(), formIsDark, colors);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    deleteCustomTheme(id);
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" disableScrollLock>
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          <Box component="span" sx={{ mr: 1 }}>🎨</Box>
          Theme Manager
        </Typography>
        <IconButton aria-label="close" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2.5 }}>
        {/* Built-in themes */}
        <Typography variant="overline" sx={{ display: 'block', color: 'text.secondary', fontWeight: 700, fontSize: '0.65rem', mb: 1 }}>
          Built-in Themes
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
          {[
            { id: "light", name: "Light", isDark: false, colors: { text: "#1a1c1e", accent: "#0061a4", sidebar: "#f5f5f5" } },
            { id: "dark", name: "Dark", isDark: true, colors: { text: "#e2e2e6", accent: "#a0caff", sidebar: "#1a1c1e" } },
          ].map((t) => {
            const isActive = theme === t.id;
            return (
              <Box
                key={t.id}
                onClick={() => setTheme(t.id)}
                sx={{
                  flex: 1, p: 1.5, borderRadius: '12px', cursor: 'pointer',
                  border: '2px solid', borderColor: isActive ? 'primary.main' : 'divider',
                  bgcolor: isActive ? 'action.selected' : 'transparent',
                  '&:hover': { bgcolor: 'action.hover' },
                  transition: 'all 0.15s',
                }}
              >
                <ThemePreview text={t.colors.text} accent={t.colors.accent} isDark={t.isDark} />
                <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {isActive && <CheckIcon sx={{ fontSize: 14, color: 'primary.main' }} />}
                  {t.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">{t.isDark ? 'Dark' : 'Light'}</Typography>
              </Box>
            );
          })}
        </Box>

        {/* Custom themes */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.65rem' }}>
            Custom Themes
          </Typography>
          <Button size="small" startIcon={<AddIcon sx={{ fontSize: 14 }} />} onClick={startCreate}>
            Create
          </Button>
        </Box>

        {customThemes.length === 0 && !showForm && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontSize: '0.8rem' }}>
            No custom themes yet. Click <strong>Create</strong> to make one.
          </Typography>
        )}

        {customThemes.map((ct) => {
          const isActive = theme === ct.id;
          return (
            <Box
              key={ct.id}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.5, p: 1.25,
                borderRadius: '10px', mb: 1,
                border: '2px solid', borderColor: isActive ? 'primary.main' : 'divider',
                bgcolor: isActive ? 'action.selected' : 'transparent',
                cursor: 'pointer', transition: 'all 0.15s',
                '&:hover': { bgcolor: 'action.hover' },
              }}
              onClick={() => setTheme(ct.id)}
            >
              <Box sx={{ flexShrink: 0 }}>
                <ThemePreview text={ct.colors.text} accent={ct.colors.accent} isDark={ct.isDark} />
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {isActive && <CheckIcon sx={{ fontSize: 14, color: 'primary.main' }} />}
                  {ct.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">{ct.isDark ? 'Dark' : 'Light'}</Typography>
              </Box>
              <Tooltip title="Edit">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); startEdit(ct); }} sx={{ color: 'text.secondary' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.7rem' }}>EDIT</Typography>
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDelete(ct.id); }} sx={{ color: 'text.secondary' }}>
                  <DeleteIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          );
        })}

        {/* Create/Edit form */}
        {showForm && (
          <Box sx={{ mt: 2.5, p: 2, borderRadius: '12px', bgcolor: 'action.hover' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              {editingId ? 'Edit Theme' : 'Create New Theme'}
            </Typography>

            <TextField
              label="Theme Name"
              size="small"
              fullWidth
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>Dark Theme</Typography>
              <Switch
                size="small"
                checked={formIsDark}
                onChange={(e) => setFormIsDark(e.target.checked)}
              />
            </Box>

            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mb: 1, color: 'text.secondary' }}>
              Colors
            </Typography>

            <ColorField label="Text" value={formText} onChange={setFormText} />
            <ColorField label="Accent" value={formAccent} onChange={setFormAccent} />
            <ColorField label="Sidebar" value={formSidebar} onChange={setFormSidebar} />

            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, mt: 1.5, mb: 0.5, color: 'text.secondary' }}>
              Preview
            </Typography>
            <ThemePreview text={formText} accent={formAccent} isDark={formIsDark} />

            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', mt: 2 }}>
              <Button size="small" onClick={resetForm}>Cancel</Button>
              <Button size="small" variant="contained" onClick={handleSave} disabled={!formName.trim()}>
                {editingId ? 'Update' : 'Save'}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
        <Button onClick={onClose} variant="outlined" fullWidth>Close</Button>
      </DialogActions>
    </Dialog>
  );
};
