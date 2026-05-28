import React from "react";
import { X, Check } from "lucide-react";
import { useTheme, ThemeType } from "../context/ThemeContext";

interface ThemeSelectorModalProps {
  onClose: () => void;
}

interface ThemeConfig {
  id: ThemeType;
  name: string;
  desc: string;
  isDark: boolean;
  colors: {
    bg: string;
    text: string;
    accent: string;
    sidebar: string;
  };
}

const themes: ThemeConfig[] = [
  {
    id: "light",
    name: "Classic White",
    desc: "Clean paper workspace",
    isDark: false,
    colors: { bg: "#ffffff", text: "#1a1a1a", accent: "#007aff", sidebar: "#f8f9fa" }
  },
  {
    id: "latte",
    name: "Catppuccin Latte",
    desc: "Soothing light palette",
    isDark: false,
    colors: { bg: "#eff1f5", text: "#4c4f69", accent: "#1e66f5", sidebar: "#e6e9ef" }
  },
  {
    id: "sepia",
    name: "Warm Sepia",
    desc: "Typewriter parchment style",
    isDark: false,
    colors: { bg: "#f4ecd8", text: "#433422", accent: "#a0522d", sidebar: "#e4d7ba" }
  },
  {
    id: "frost",
    name: "Nordic Frost",
    desc: "Cool blueprint hues",
    isDark: false,
    colors: { bg: "#f0f4f8", text: "#2d3748", accent: "#3182ce", sidebar: "#e1e8f0" }
  },
  {
    id: "everforest-light",
    name: "Everforest Light",
    desc: "Nature-inspired light",
    isDark: false,
    colors: { bg: "#fdf6e3", text: "#5c6a72", accent: "#859900", sidebar: "#f3ead3" }
  },
  {
    id: "lilac",
    name: "Lilac Violet",
    desc: "Premium lavender pastel style",
    isDark: false,
    colors: { bg: "#f3e5f5", text: "#4a148c", accent: "#7b1fa2", sidebar: "#f8f0fb" }
  },
  {
    id: "dark",
    name: "Charcoal Slate",
    desc: "Low-fatigue dark workspace",
    isDark: true,
    colors: { bg: "#18191c", text: "#d4d4d8", accent: "#0a84ff", sidebar: "#121315" }
  },
  {
    id: "mocha",
    name: "Catppuccin Mocha",
    desc: "Soothing dark palette",
    isDark: true,
    colors: { bg: "#1e1e2e", text: "#cdd6f4", accent: "#89b4fa", sidebar: "#181825" }
  },
  {
    id: "everforest-dark",
    name: "Everforest Dark",
    desc: "Nature-inspired dark",
    isDark: true,
    colors: { bg: "#2d353b", text: "#d3c6aa", accent: "#a7c080", sidebar: "#232a2e" }
  },
  {
    id: "tokyo-night",
    name: "Tokyo Night",
    desc: "Stormy neon dark",
    isDark: true,
    colors: { bg: "#1a1b26", text: "#a9b1d6", accent: "#bb9af7", sidebar: "#16161e" }
  },
  {
    id: "solarized",
    name: "Solarized Dark",
    desc: "Classic developer dark mode",
    isDark: true,
    colors: { bg: "#002b36", text: "#93a1a1", accent: "#2aa198", sidebar: "#073642" }
  },
  {
    id: "midnight",
    name: "Midnight Neon",
    desc: "Neon violet cyberpunk glow",
    isDark: true,
    colors: { bg: "#0b0813", text: "#e1ddec", accent: "#ba68c8", sidebar: "#130f22" }
  }
];

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ onClose }) => {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = React.useState<'light' | 'dark'>(() => {
    const currentTheme = themes.find(t => t.id === theme);
    return currentTheme?.isDark ? 'dark' : 'light';
  });

  const filteredThemes = themes.filter(t => t.isDark === (activeTab === 'dark'));

  return (
    <div className="theme-modal-overlay" onClick={onClose}>
      <div className="theme-modal" onClick={(e) => e.stopPropagation()}>
        <div className="theme-modal-header">
          <h2 className="theme-modal-title">Select Theme</h2>
          <button className="theme-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="theme-tabs">
          <button 
            className={`theme-tab-btn ${activeTab === 'light' ? 'active' : ''}`}
            onClick={() => setActiveTab('light')}
          >
            Light Themes
          </button>
          <button 
            className={`theme-tab-btn ${activeTab === 'dark' ? 'active' : ''}`}
            onClick={() => setActiveTab('dark')}
          >
            Dark Themes
          </button>
        </div>

        <div className="theme-modal-body">
          <div className="theme-grid">
            {filteredThemes.map((t) => {
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  className={`theme-card ${isActive ? "active" : ""}`}
                  onClick={() => {
                    setTheme(t.id);
                  }}
                >
                  <div className="theme-card-left">
                    <div className="theme-card-info">
                      <span className="theme-card-name">{t.name}</span>
                      <span className="theme-card-desc">{t.desc}</span>
                    </div>
                    <div className="theme-palette">
                      <span
                        className="theme-dot"
                        style={{ backgroundColor: t.colors.bg }}
                        title="Canvas Background"
                      />
                      <span
                        className="theme-dot"
                        style={{ backgroundColor: t.colors.sidebar }}
                        title="Sidebar Background"
                      />
                      <span
                        className="theme-dot"
                        style={{ backgroundColor: t.colors.text }}
                        title="Text Color"
                      />
                      <span
                        className="theme-dot"
                        style={{ backgroundColor: t.colors.accent }}
                        title="Accent Color"
                      />
                    </div>
                  </div>
                  <div className="theme-card-right">
                    {isActive ? (
                      <span className="theme-active-check">
                        <Check size={16} />
                      </span>
                    ) : (
                      <span className="theme-badge">{t.isDark ? "Dark" : "Light"}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
