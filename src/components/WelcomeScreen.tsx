import React from "react";
import { useFile } from "../context/FileContext";

export const WelcomeScreen: React.FC = () => {
  const { newFile, openFile, recentFiles, openFilePath, removeFromRecent } = useFile();

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', system-ui, sans-serif",
      color: "var(--text-main)",
    }}>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 40,
        maxWidth: 420,
        width: "100%",
        padding: "0 24px",
      }}>
        <div style={{ textAlign: "center", userSelect: "none", WebkitUserSelect: "none" }}>
          <div style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: "var(--text-main)",
            lineHeight: 1.1,
          }}>
            Act One
          </div>
          <div style={{
            fontSize: 13,
            color: "var(--text-muted)",
            fontWeight: 400,
            marginTop: 6,
            letterSpacing: "0.02em",
          }}>
            Screenplay Editor
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              background: "transparent",
              color: "var(--text-main)",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
              letterSpacing: "0.01em",
            }}
            onClick={() => newFile()}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-color)";
              e.currentTarget.style.color = "var(--accent-color)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.color = "var(--text-main)";
            }}
          >
            New Screenplay
          </button>
          <button
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              background: "transparent",
              color: "var(--text-main)",
              fontSize: 14,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s ease",
              letterSpacing: "0.01em",
            }}
            onClick={openFile}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent-color)";
              e.currentTarget.style.color = "var(--accent-color)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-color)";
              e.currentTarget.style.color = "var(--text-main)";
            }}
          >
            Open File
          </button>
        </div>

        {recentFiles.length > 0 && (
          <div style={{ width: "100%" }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 8,
              opacity: 0.6,
            }}>
              Recent
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {recentFiles.map((item: any, idx: number) => {
                const isLast = idx === recentFiles.length - 1;
                return (
                  <div
                    key={item.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 0",
                      cursor: "pointer",
                      fontSize: 13,
                      color: "var(--text-main)",
                      borderBottom: isLast ? "none" : "1px solid var(--border-color)",
                      transition: "opacity 0.1s ease",
                    }}
                    onClick={() => openFilePath(item.path)}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-main)" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                        {item.path}
                      </div>
                    </div>
                    <button
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: 15,
                        padding: "2px 4px",
                        borderRadius: 4,
                        lineHeight: 1,
                        flexShrink: 0,
                        opacity: 0.4,
                        transition: "opacity 0.1s ease",
                      }}
                      onClick={(e) => { e.stopPropagation(); removeFromRecent(item.path); }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.4"; }}
                      title="Remove from recent"
                    >
                      &times;
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{
          fontSize: 11,
          color: "var(--text-muted)",
          textAlign: "center",
          opacity: 0.4,
          letterSpacing: "0.03em",
        }}>
          <span style={{
            display: "inline-block",
            padding: "1px 5px",
            borderRadius: 3,
            border: "1px solid var(--border-color)",
            fontSize: 10,
            lineHeight: "16px",
            marginRight: 4,
          }}>Ctrl+N</span>
          {" "}New{" "}
          <span style={{
            display: "inline-block",
            padding: "1px 5px",
            borderRadius: 3,
            border: "1px solid var(--border-color)",
            fontSize: 10,
            lineHeight: "16px",
            margin: "0 4",
          }}>Ctrl+O</span>
          {" "}Open
        </div>
      </div>
    </div>
  );
};
