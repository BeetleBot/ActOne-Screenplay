# Themes & Appearance

## Built-in Themes

ActOne includes 14 built-in themes:

| Theme | Mode |
|-------|------|
| Light | Light |
| Dark | Dark |
| Dracula | Dark |
| Nord | Dark |
| Solarized Light | Light |
| Solarized Dark | Dark |
| Monokai | Dark |
| GitHub Light | Light |
| GitHub Dark | Dark |
| One Dark | Dark |
| One Light | Light |
| Ayu Light | Light |
| Ayu Dark | Dark |
| Adaptive | Follows system preference |

## Selecting a Theme

**Settings → Appearance → Theme** dropdown.

The active theme is synchronized across all windows (main editor, settings, help, etc.).

## Custom Themes

The **Theme Manager** window (`?modal=theme-manager`) allows creating custom themes:

### Theme Properties
- **5 core colors**: Primary, Secondary, Surface, Error, On Surface
- All other colors are derived automatically from these 5 using Material color science (HCT color space)

### Creating a Custom Theme
1. Open Theme Manager (Settings → Theme Manager or via Command Palette)
2. Click "New Theme"
3. Set the 5 core colors
4. Give it a name
5. Save

Custom themes appear alongside built-in themes in the settings dropdown.

## Fountain Syntax Colors

The theme also controls per-element syntax highlighting colors. When `fountainColorsEnabled` is toggled off, all text appears in the base text color (for a distraction-free writing experience).

## UI Scale

**Settings → Appearance → App Scale** adjusts the overall UI size (100%, 110%, 125%, 150%).

## Adaptive Theme

The Adaptive theme follows the system's light/dark mode preference, automatically switching between light and dark variants based on your OS setting.
