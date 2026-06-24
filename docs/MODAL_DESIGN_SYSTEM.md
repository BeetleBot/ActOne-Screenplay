# Modal Design System

## Visual Identity

Every modal in ActOne follows these core principles:

- **Compact** — tight padding, small font sizes, minimal whitespace
- **Professional** — subtle borders, muted colors, consistent hierarchy
- **Animated** — smooth entrance transitions, no jarring pop-ins

---

## Dialog Structure

```
┌─────────────────────────────────────┐
│  [icon]  Title               [X]   │  ← DialogTitle (14px, icon + text)
├─────────────────────────────────────┤
│  [pill nav or breadcrumb]           │  ← Optional (ToggleButtonGroup or breadcrumb)
├─────────────────────────────────────┤
│                                     │
│  ┌──── Card ──────────────────────┐ │
│  │  SECTION HEADER (10px caps)    │ │
│  │  [controls]                    │ │
│  └────────────────────────────────┘ │
│                                     │
│  ┌──── Card ──────────────────────┐ │
│  │  SECTION HEADER (10px caps)    │ │
│  │  [controls]                    │ │
│  └────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│  [Cancel]              [Action]    │  ← DialogActions
└─────────────────────────────────────┘
```

### Dialog Paper
| Property | Value |
|----------|-------|
| `borderRadius` | `12px` |
| `zoom` | `${appScale}%` |
| `maxHeight` | `85vh` |
| `transitionDuration` | `200-250` (entrance) |

### DialogTitle
| Property | Value |
|----------|-------|
| Font size | `14px`, weight `600` |
| Padding | `px: 2, py: 1` |
| Layout | `flex`, `space-between` (icon + title left, close button right) |
| Close button | `IconButton` with `CloseIcon`, `fontSize: 18`, `color: text.secondary` |

### DialogContent
| Property | Value |
|----------|-------|
| Padding | `px: 2, py: 1.5` |
| Dividers | Use `dividers` prop on `DialogContent` |
| Overflow | `overflow: auto` |

### DialogActions
| Property | Value |
|----------|-------|
| Padding | `px: 2, py: 1` |
| Layout | `justify-content: space-between` |
| Cancel button | `variant="outlined"`, `size="small"`, `fontSize: 11`, `color="inherit"` |
| Action button | `variant="contained"`, `size="small"`, `fontSize: 11`, `color="primary"` |

---

## Cards

Content inside modals is grouped into bordered card sections.

```tsx
<Box sx={{
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  p: 1.5,
  mb: 1.5,
}}>
```

| Property | Value |
|----------|-------|
| Border | `1px solid`, color `divider` |
| Border radius | `1` (8px) |
| Padding | `p: 1.5` |
| Margin bottom | `mb: 1.5` |

### Card Section Header

```tsx
<Typography variant="caption" sx={{
  fontWeight: 700,
  fontSize: 10,
  color: 'text.secondary',
  letterSpacing: 0.5,
  mb: 1.25,
  display: 'block',
}}>
  SECTION NAME
</Typography>
```

---

## Form Controls

### Switches

Side-by-side layout (2 per row) when possible:

```tsx
<Box sx={{ display: "flex", gap: 1.5 }}>
  <FormControlLabel
    control={<Switch size="small" checked={...} onChange={...} />}
    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Label</Typography>}
    sx={{ mx: 0, flex: 1 }}
  />
  <FormControlLabel
    control={<Switch size="small" checked={...} onChange={...} />}
    label={<Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Label</Typography>}
    sx={{ mx: 0, flex: 1 }}
  />
</Box>
```

| Property | Value |
|----------|-------|
| Switch size | `size="small"` |
| Label font | `12px`, weight `500` |
| Gap between rows | `gap: 1.5` (12px) |
| Row margin bottom | `mb: 0.5` |

### Selects (Button-Style)

No border, filled background, compact dropdown:

```tsx
<Select
  fullWidth
  size="small"
  value={value}
  onChange={handler}
  sx={{
    fontSize: 12,
    '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
    bgcolor: 'action.hover',
    borderRadius: '6px',
    '&:hover': { bgcolor: 'action.selected' },
    '& .MuiSelect-select': { py: 0.6, px: 1.25 },
  }}
  MenuProps={{
    slotProps: {
      paper: {
        sx: {
          '& .MuiMenuItem-root': { fontSize: 12, py: 0.4, minHeight: 30 },
        },
      },
    },
  }}
>
  <MenuItem value="option1">Option 1</MenuItem>
  <MenuItem value="option2">Option 2</MenuItem>
</Select>
```

| Property | Value |
|----------|-------|
| Border | None (`notchedOutline: none`) |
| Background | `action.hover` |
| Hover | `action.selected` |
| Select padding | `py: 0.6, px: 1.25` |
| Menu item font | `12px` |
| Menu item padding | `py: 0.4, minHeight: 30` |

### ToggleButtonGroup (Pill Tabs)

Used for navigation (format selector, tab switcher):

```tsx
<ToggleButtonGroup
  value={value}
  exclusive
  onChange={handler}
  fullWidth
  size="small"
>
  <ToggleButton value={0} sx={{ fontSize: 12, py: 0.3 }}>Tab 1</ToggleButton>
  <ToggleButton value={1} sx={{ fontSize: 12, py: 0.3 }}>Tab 2</ToggleButton>
</ToggleButtonGroup>
```

| Property | Value |
|----------|-------|
| Size | `size="small"` |
| Button font | `12px` |
| Button padding | `py: 0.3` |
| Layout | `fullWidth` |

### Toggle Buttons (B/I/U)

Used for element formatting (bold/italic/underline):

```tsx
<ToggleButton
  value="bold"
  size="small"
  selected={checked}
  onChange={() => toggle(key, "bold")}
  sx={{
    width: 28, height: 24, p: 0,
    border: "1px solid",
    borderColor: checked ? "primary.main" : "divider",
    borderRadius: "4px",
    bgcolor: checked ? "primary.main" : "transparent",
    color: checked ? "primary.contrastText" : "text.secondary",
    fontSize: 10,
    fontWeight: 700,
    lineHeight: 1,
    '&:hover': { bgcolor: checked ? "primary.dark" : "action.hover" },
    transition: "all 0.1s ease",
  }}
>
  B
</ToggleButton>
```

| Property | Value |
|----------|-------|
| Size | `28×24px` |
| Active | `primary.main` bg, `primary.contrastText` text |
| Inactive | Transparent bg, `text.secondary` text, `divider` border |
| Hover active | `primary.dark` |
| Hover inactive | `action.hover` |

### Sliders

```tsx
<Slider
  size="small"
  min={75}
  max={300}
  step={5}
  value={value}
  onChange={handler}
  aria-label="Label"
/>
```

Value-label pairs above the slider:

```tsx
<Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
  <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 12 }}>Label</Typography>
  <Typography variant="body2" color="primary" sx={{ fontWeight: 600, fontSize: 12 }}>{value}%</Typography>
</Box>
```

### Radio Groups

```tsx
<RadioGroup value={value} onChange={handler}>
  <FormControlLabel
    value="option1"
    control={<Radio size="small" />}
    label={<Typography variant="caption" sx={{ fontSize: 11 }}>Option 1</Typography>}
  />
  <FormControlLabel
    value="option2"
    control={<Radio size="small" />}
    label={<Typography variant="caption" sx={{ fontSize: 11 }}>Option 2</Typography>}
  />
</RadioGroup>
```

| Property | Value |
|----------|-------|
| Radio size | `size="small"` |
| Label font | `11px` |

---

## Animations

### Dialog Entrance
```tsx
<Dialog
  open onClose={onClose}
  transitionDuration={200}
  ...
>
```
All dialogs use MUI's built-in `Grow` transition with `transitionDuration={200}`.

### Sub-panel Slide
For panels that slide in within a dialog (e.g., Format Elements in ExportModal), use a nested `<Dialog>` instead of manual CSS transforms. The nested dialog gets its own scroll context and clean `Grow` entrance.

---

## Typography Scale

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Dialog title | 14px | 600 | `text.primary` |
| Section header (cards) | 10px | 700 | `text.secondary` |
| Switch label | 12px | 500 | `text.primary` |
| Button text | 11px | 500-600 | varies |
| Select value | 12px | 400 | `text.primary` |
| Menu item | 12px | 400 | `text.primary` |
| B/I/U label | 10px | 700 | varies |
| Radio label | 11px | 400 | `text.primary` |
| Caption/description | 10-11px | 400 | `text.secondary` |
| Pill tab label | 12px | 500 | varies |

---

## Spacing Grid

| Token | Value | Usage |
|-------|-------|-------|
| `0.25` | 2px | Slider to label gap |
| `0.5` | 4px | Switch rows gap |
| `0.75` | 6px | Element padding, tight cards |
| `1` | 8px | Card padding, vertical gaps |
| `1.25` | 10px | Section header to first control |
| `1.5` | 12px | Between cards, button gaps |
| `2` | 16px | Dialog content padding |

---

## Icon Usage

- Dialog title: paired with a relevant icon (`DownloadIcon`, `SettingsIcon`, etc.)
- Icons: `fontSize: 18` in title, `fontSize: 16` inline
- Close button: `CloseIcon`, `fontSize: 18`, `color: text.secondary`
- All icons from `src/components/Icons.tsx`

---

## Modal Checklist

Use this when creating or updating a modal:

- [ ] `borderRadius: 12px` on Dialog paper
- [ ] `zoom: ${appScale}%` on Dialog paper
- [ ] `transitionDuration={200}` on Dialog
- [ ] Title with icon + close button
- [ ] Title font 14px, weight 600
- [ ] Content padding `px: 2, py: 1.5`
- [ ] Bordered cards for grouped controls
- [ ] Card headers: 10px caps, `text.secondary`
- [ ] Side-by-side switches (2 per row) where possible
- [ ] Button-style `<Select>` (no outline, filled bg)
- [ ] `<ToggleButtonGroup>` for tab navigation
- [ ] `<size="small">` on all form controls
- [ ] No unused imports
- [ ] TypeScript compiles cleanly (`npx tsc --noEmit`)
