import React, { useState } from "react";
import { X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAppContext } from "../context/AppContext";

interface SettingsModalProps {
  onClose: () => void;
}

const CustomSelect = <T extends string>({
  options,
  value,
  onChange
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeLabel = options.find(o => o.value === value)?.label || value;

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: "8px",
          border: "1px solid var(--border-color)",
          backgroundColor: "var(--bg-sidebar)",
          color: "var(--text-main)",
          textAlign: "left",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          outline: "none"
        }}
      >
        <span>{activeLabel}</span>
        <span style={{ fontSize: "10px", opacity: 0.6, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▼</span>
      </button>

      {isOpen && (
        <>
          <div 
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }} 
            onClick={() => setIsOpen(false)} 
          />
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            backgroundColor: "var(--bg-sidebar)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            zIndex: 1000,
            maxHeight: "180px",
            overflowY: "auto",
            padding: "4px"
          }}>
            {options.map((opt) => {
              const isActive = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                    backgroundColor: isActive ? "rgba(var(--accent-rgb), 0.15)" : "transparent",
                    color: isActive ? "var(--accent-color)" : "var(--text-main)",
                    fontWeight: isActive ? 600 : 400,
                    transition: "all 0.1s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "rgba(128, 128, 128, 0.08)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {opt.label}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { theme, setTheme } = useTheme();
  const {
    fontFamily,
    setFontFamily,
    paperSize,
    setPaperSize,
    showTimeline,
    setShowTimeline,
    workspaceMode,
    setWorkspaceMode,
    typewriterMode,
    setTypewriterMode,
    zoomLevel,
    setZoomLevel,
    autocompleteEnabled,
    setAutocompleteEnabled,
    smartQuotesEnabled,
    setSmartQuotesEnabled,
    matchParenthesesEnabled,
    setMatchParenthesesEnabled,
    hideFountainMarkupEnabled,
    setHideFountainMarkupEnabled
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<"general" | "editor">("general");

  const themesList = [
    { value: "light", label: "Classic White" },
    { value: "latte", label: "Catppuccin Latte" },
    { value: "sepia", label: "Warm Sepia" },
    { value: "frost", label: "Nordic Frost" },
    { value: "everforest-light", label: "Everforest Light" },
    { value: "lilac", label: "Lilac Violet" },
    { value: "dark", label: "Charcoal Slate" },
    { value: "mocha", label: "Catppuccin Mocha" },
    { value: "everforest-dark", label: "Everforest Dark" },
    { value: "tokyo-night", label: "Tokyo Night" },
    { value: "solarized", label: "Solarized Dark" },
    { value: "midnight", label: "Midnight Neon" }
  ];

  const workspacesList = [
    { value: "editor", label: "Editor View" },
    { value: "cards", label: "Index Cards View" }
  ];

  const paperSizesList = [
    { value: "letter", label: "Letter (US)" },
    { value: "a4", label: "A4 (Standard)" }
  ];

  const fontFamiliesList = [
    { value: "courier-prime", label: "Courier Prime (Serif)" },
    { value: "courier-prime-sans", label: "Courier Prime Sans" }
  ];

  return (
    <div className="theme-modal-overlay" onClick={onClose}>
      <div 
        className="theme-modal" 
        style={{ maxWidth: "560px", width: "90%" }} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="theme-modal-header">
          <h2 className="theme-modal-title">Settings</h2>
          <button className="theme-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="theme-tabs">
          <button 
            className={`theme-tab-btn ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
          >
            General Settings
          </button>
          <button 
            className={`theme-tab-btn ${activeTab === "editor" ? "active" : ""}`}
            onClick={() => setActiveTab("editor")}
          >
            Editor Settings
          </button>
        </div>

        <div className="theme-modal-body" style={{ maxHeight: "420px", overflowY: "auto" }}>
          {activeTab === "general" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", padding: "4px" }}>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Visual Theme</label>
                <CustomSelect
                  options={themesList}
                  value={theme}
                  onChange={(val) => setTheme(val as any)}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Default Workspace</label>
                <CustomSelect
                  options={workspacesList}
                  value={workspaceMode}
                  onChange={(val) => setWorkspaceMode(val as any)}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Paper/Page Size</label>
                <CustomSelect
                  options={paperSizesList}
                  value={paperSize}
                  onChange={(val) => setPaperSize(val as any)}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Show Timeline</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Display outline progress at the bottom</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={showTimeline}
                  onChange={(e) => setShowTimeline(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
              </div>

            </div>
          )}

          {activeTab === "editor" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "4px" }}>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Font Style</label>
                <CustomSelect
                  options={fontFamiliesList}
                  value={fontFamily}
                  onChange={(val) => setFontFamily(val as any)}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Editor Zoom</label>
                  <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--accent-color)" }}>{zoomLevel}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="200"
                  step="10"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(parseInt(e.target.value, 10))}
                  style={{
                    width: "100%",
                    accentColor: "var(--accent-color)",
                    cursor: "pointer",
                    height: "6px",
                    borderRadius: "4px",
                    background: "var(--border-color)"
                  }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Typewriter Mode</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Keep the typing line centered vertically</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={typewriterMode}
                  onChange={(e) => setTypewriterMode(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Character/Scene Autocomplete</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Smart suggestions based on Fountain structure</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={autocompleteEnabled}
                  onChange={(e) => setAutocompleteEnabled(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Smart Quotes</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Convert straight quotes to curly quotes</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={smartQuotesEnabled}
                  onChange={(e) => setSmartQuotesEnabled(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Auto-match Parentheses</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Automatically insert closing parenthesis</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={matchParenthesesEnabled}
                  onChange={(e) => setMatchParenthesesEnabled(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "12px", opacity: 0.6 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Hide Fountain Markup <span style={{ fontSize: "10px", fontStyle: "italic", color: "var(--text-muted)" }}>(Yet to be implemented)</span></span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Hide formatting markup tags inside the editor</span>
                </div>
                <input 
                  type="checkbox" 
                  checked={hideFountainMarkupEnabled}
                  onChange={(e) => setHideFountainMarkupEnabled(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
