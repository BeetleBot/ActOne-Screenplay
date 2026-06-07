import React, { useState, useCallback, useRef, useEffect } from "react";
import { X, Check } from "lucide-react";
import { useTheme, ThemeType } from "../context/ThemeContext";
import { useFocusTrap } from "../hooks/useFocusTrap";

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
    id: "warm-paper",
    name: "Warm Paper",
    desc: "Creamy paper-like warmth",
    isDark: false,
    colors: { bg: "#f5eed7", text: "#2c1810", accent: "#a0522d", sidebar: "#ede3c8" }
  },
  {
    id: "lilac",
    name: "Lilac Violet",
    desc: "Premium lavender pastel style",
    isDark: false,
    colors: { bg: "#f3e5f5", text: "#4a148c", accent: "#7b1fa2", sidebar: "#f8f0fb" }
  },
  {
    id: "honey",
    name: "Honey",
    desc: "Warm golden sunlight glow",
    isDark: false,
    colors: { bg: "#faf3e0", text: "#3d2c1a", accent: "#d4943a", sidebar: "#f5ecd0" }
  },
  {
    id: "sage",
    name: "Sage",
    desc: "Calming muted green",
    isDark: false,
    colors: { bg: "#f0f5f0", text: "#2c3a2e", accent: "#6a9a6a", sidebar: "#e6efe4" }
  },
  {
    id: "dark",
    name: "Classic Dark",
    desc: "Low-fatigue dark workspace",
    isDark: true,
    colors: { bg: "#18191c", text: "#d4d4d8", accent: "#0a84ff", sidebar: "#121315" }
  },
  {
    id: "pitch-black",
    name: "Pitch Black",
    desc: "True black OLED-friendly dark",
    isDark: true,
    colors: { bg: "#000000", text: "#e0e0e0", accent: "#0a84ff", sidebar: "#0a0a0a" }
  },
  {
    id: "forest",
    name: "Forest",
    desc: "Deep nature-inspired green",
    isDark: true,
    colors: { bg: "#1a241a", text: "#c4d0c4", accent: "#6a9e6a", sidebar: "#141e14" }
  },
  {
    id: "plum",
    name: "Plum",
    desc: "Rich dark purple warmth",
    isDark: true,
    colors: { bg: "#1a1428", text: "#d0c8e0", accent: "#9b6ab0", sidebar: "#141020" }
  },
  {
    id: "ayu-mirage",
    name: "Ayu Mirage",
    desc: "Warm amber dusk palette",
    isDark: true,
    colors: { bg: "#1f2430", text: "#ccbfae", accent: "#ffcc66", sidebar: "#171b24" }
  }
];

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({ onClose }) => {
  const { theme, setTheme } = useTheme();
  const [focusedIdx, setFocusedIdx] = useState(() => {
    const idx = themes.findIndex(t => t.id === theme);
    return idx >= 0 ? idx : 0;
  });
  const gridRef = useRef<HTMLDivElement>(null);

  const { containerRef, handleKeyDown: trapKeyDown } = useFocusTrap(true, onClose);

  const scrollIntoView = useCallback((idx: number) => {
    const el = gridRef.current?.querySelector(`[data-theme-idx="${idx}"]`) as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, []);

  useEffect(() => {
    scrollIntoView(focusedIdx);
  }, [focusedIdx, scrollIntoView]);

  const handleGridKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx(prev => Math.min(themes.length - 1, prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx(prev => Math.max(0, prev - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setFocusedIdx(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setFocusedIdx(themes.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focusedIdx >= 0 && focusedIdx < themes.length) {
        setTheme(themes[focusedIdx].id);
      }
    }
  }, [focusedIdx, setTheme]);

  return (
    <div
      className="theme-modal-overlay"
      onClick={onClose}
      ref={containerRef}
      onKeyDown={trapKeyDown}
      tabIndex={-1}
      style={{ outline: "none" }}
    >
      <div
        className="theme-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Select Theme"
      >
        <div className="theme-modal-header">
          <h2 className="theme-modal-title">Select Theme</h2>
          <button className="theme-modal-close" onClick={onClose} tabIndex={0}>
            <X size={18} />
          </button>
        </div>

        <div className="theme-modal-body">
          <div
            ref={gridRef}
            className="theme-grid"
            role="listbox"
            tabIndex={0}
            onKeyDown={handleGridKeyDown}
            style={{ outline: "none" }}
          >
            {themes.map((t, idx) => {
              const isActive = theme === t.id;
              const isFocused = idx === focusedIdx;
              return (
                <button
                  key={t.id}
                  data-theme-idx={idx}
                  className={`theme-card ${isActive ? "active" : ""}`}
                  onClick={() => setTheme(t.id)}
                  onFocus={() => setFocusedIdx(idx)}
                  onMouseEnter={() => setFocusedIdx(idx)}
                  role="option"
                  aria-selected={isActive}
                  tabIndex={-1}
                  style={{
                    outline: isFocused ? "2px solid var(--accent-color)" : "none",
                    outlineOffset: "-2px",
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
