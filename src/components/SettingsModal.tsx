import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAppContext } from "../context/AppContext";
import { useFocusTrap } from "../hooks/useFocusTrap";

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
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const activeLabel = options.find(o => o.value === value)?.label || value;
  const optionsRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      const currentIdx = options.findIndex(o => o.value === value);
      setHighlightIdx(currentIdx >= 0 ? currentIdx : 0);
    }
  }, [isOpen, options, value]);

  useEffect(() => {
    if (isOpen && optionsRef.current) {
      const highlighted = optionsRef.current.querySelector(`[data-idx="${highlightIdx}"]`) as HTMLElement;
      highlighted?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIdx, isOpen]);

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(true);
    }
  };

  const handleDropdownKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(options.length - 1, prev + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(0, prev - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (highlightIdx >= 0) {
        onChange(options[highlightIdx].value);
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        tabIndex={0}
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
          <div
            ref={optionsRef}
            tabIndex={0}
            onKeyDown={handleDropdownKeyDown}
            style={{
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
              padding: "4px",
              outline: "none"
            }}
          >
            {options.map((opt, idx) => {
              const isActive = opt.value === value;
              const isHighlighted = idx === highlightIdx;
              return (
                <div
                  key={opt.value}
                  data-idx={idx}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  }}
                  onMouseEnter={() => setHighlightIdx(idx)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    cursor: "pointer",
                    backgroundColor: isHighlighted
                      ? (isActive ? "rgba(var(--accent-rgb), 0.2)" : "rgba(128, 128, 128, 0.1)")
                      : (isActive ? "rgba(var(--accent-rgb), 0.15)" : "transparent"),
                    color: isActive ? "var(--accent-color)" : "var(--text-main)",
                    fontWeight: isActive ? 600 : 400,
                    transition: "all 0.1s ease",
                    outline: isHighlighted ? "1px solid var(--accent-color)" : "none",
                    outlineOffset: "-1px"
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
    setHideFountainMarkupEnabled,
    autoSaveEnabled,
    setAutoSaveEnabled,
    autoSaveInterval,
    setAutoSaveInterval
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<"general" | "editor">("general");
  const { containerRef, handleKeyDown: trapKeyDown } = useFocusTrap(true, onClose, '[role="tab"]');

  const themesList = [
    { value: "light", label: "Classic White" },
    { value: "warm-paper", label: "Warm Paper" },
    { value: "lilac", label: "Lilac Violet" },
    { value: "honey", label: "Honey" },
    { value: "sage", label: "Sage" },
    { value: "dark", label: "Classic Dark" },
    { value: "pitch-black", label: "Pitch Black" },
    { value: "forest", label: "Forest" },
    { value: "plum", label: "Plum" },
    { value: "ayu-mirage", label: "Ayu Mirage" }
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

  const handleTabKeyDown = (e: React.KeyboardEvent, tab: "general" | "editor") => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setActiveTab(tab === "general" ? "editor" : "general");
    }
  };

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
        style={{ maxWidth: "560px", width: "90%" }} 
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
      >
        <div className="theme-modal-header">
          <h2 className="theme-modal-title">Settings</h2>
          <button className="theme-modal-close" onClick={onClose} tabIndex={0}>
            <X size={18} />
          </button>
        </div>

        <div className="theme-tabs" role="tablist">
          <button 
            className={`theme-tab-btn ${activeTab === "general" ? "active" : ""}`}
            onClick={() => setActiveTab("general")}
            onKeyDown={(e) => handleTabKeyDown(e, "general")}
            role="tab"
            aria-selected={activeTab === "general"}
            tabIndex={0}
          >
            General Settings
          </button>
          <button 
            className={`theme-tab-btn ${activeTab === "editor" ? "active" : ""}`}
            onClick={() => setActiveTab("editor")}
            onKeyDown={(e) => handleTabKeyDown(e, "editor")}
            role="tab"
            aria-selected={activeTab === "editor"}
            tabIndex={0}
          >
            Editor Settings
          </button>
        </div>

        <div className="theme-modal-body" style={{ maxHeight: "420px", overflowY: "auto" }} role="tabpanel">
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
                  className="native-checkbox"
                  checked={showTimeline}
                  onChange={(e) => setShowTimeline(e.target.checked)}
                  tabIndex={0}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Auto-save</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Automatically save changes periodically</span>
                </div>
                <input 
                  type="checkbox" 
                  className="native-checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  tabIndex={0}
                />
              </div>

              {autoSaveEnabled && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", paddingLeft: "4px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Auto-save Interval</label>
                  <CustomSelect
                    options={[
                      { value: "30000", label: "30 seconds" },
                      { value: "60000", label: "1 minute" },
                      { value: "120000", label: "2 minutes" },
                      { value: "300000", label: "5 minutes" },
                    ]}
                    value={String(autoSaveInterval)}
                    onChange={(val) => setAutoSaveInterval(parseInt(val, 10))}
                  />
                </div>
              )}

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
                  className="native-range"
                  min="50"
                  max="200"
                  step="10"
                  value={zoomLevel}
                  onChange={(e) => setZoomLevel(parseInt(e.target.value, 10))}
                  tabIndex={0}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Typewriter Mode</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Keep the typing line centered vertically</span>
                </div>
                <input 
                  type="checkbox" 
                  className="native-checkbox"
                  checked={typewriterMode}
                  onChange={(e) => setTypewriterMode(e.target.checked)}
                  tabIndex={0}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Character/Scene Autocomplete</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Smart suggestions based on Fountain structure</span>
                </div>
                <input 
                  type="checkbox" 
                  className="native-checkbox"
                  checked={autocompleteEnabled}
                  onChange={(e) => setAutocompleteEnabled(e.target.checked)}
                  tabIndex={0}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Smart Quotes</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Convert straight quotes to curly quotes</span>
                </div>
                <input 
                  type="checkbox" 
                  className="native-checkbox"
                  checked={smartQuotesEnabled}
                  onChange={(e) => setSmartQuotesEnabled(e.target.checked)}
                  tabIndex={0}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Auto-match Parentheses</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Automatically insert closing parenthesis</span>
                </div>
                <input 
                  type="checkbox" 
                  className="native-checkbox"
                  checked={matchParenthesesEnabled}
                  onChange={(e) => setMatchParenthesesEnabled(e.target.checked)}
                  tabIndex={0}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, opacity: 0.9 }}>Hide Fountain Markup</span>
                  <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Hide formatting markup tags inside the editor</span>
                </div>
                <input 
                  type="checkbox" 
                  className="native-checkbox"
                  checked={hideFountainMarkupEnabled}
                  onChange={(e) => setHideFountainMarkupEnabled(e.target.checked)}
                  tabIndex={0}
                />
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
