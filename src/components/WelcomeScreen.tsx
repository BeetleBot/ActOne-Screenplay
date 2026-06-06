import React, { useEffect, useState } from "react";
import { useFile } from "../context/FileContext";
import { Plus, FolderOpen, FileText, Trash2 } from "lucide-react";

interface Quote {
  text: string;
  author: string;
}

const QUOTES: Quote[] = [
  { text: "To make a great film, you need three things: the script, the script and the script.", author: "Alfred Hitchcock" },
  { text: "The hardest thing about writing is writing.", author: "Nora Ephron" },
  { text: "If it can be written, or thought, it can be filmed.", author: "Stanley Kubrick" },
  { text: "The screenwriter's job is to make the audience care.", author: "Billy Wilder" },
  { text: "Action is character. If we never show what a person does, we don't know who they are.", author: "Syd Field" },
  { text: "Don't write what you think people want to read. Write what you want to read.", author: "William Goldman" },
  { text: "Give me a good script, and I'll make a good movie.", author: "Akira Kurosawa" },
  { text: "The script is the outline of the dream.", author: "Jean-Luc Godard" },
  { text: "Write what you see, write what you hear. Everything else is decoration.", author: "David Mamet" },
  { text: "Audiences don't know what they want until you give it to them.", author: "Federico Fellini" },
  { text: "A story should have a beginning, a middle, and an end... but not necessarily in that order.", author: "Jean-Luc Godard" },
  { text: "Theme is the glue that holds the story together.", author: "Lajos Egri" },
  { text: "Plot is what happens. Story is who it happens to.", author: "Robert McKee" }
];

function getDynamicQuote(): Quote {
  try {
    const lastIdxStr = localStorage.getItem("last_quote_index");
    const lastIdx = lastIdxStr ? parseInt(lastIdxStr, 10) : -1;
    const available = [];
    for (let i = 0; i < QUOTES.length; i++) {
      if (i !== lastIdx) {
        available.push(i);
      }
    }
    const candidates = available.length > 0 ? available : [0];
    const randomIndex = candidates[Math.floor(Math.random() * candidates.length)];
    localStorage.setItem("last_quote_index", randomIndex.toString());
    return QUOTES[randomIndex];
  } catch {
    return QUOTES[Math.floor(Math.random() * QUOTES.length)];
  }
}

const welcomeStyles = `
  .welcome-container {
    display: grid;
    grid-template-columns: 1.2fr 1.3fr;
    width: 100%;
    height: 100%;
    background: var(--bg-app);
    overflow: hidden;
  }
  @media (max-width: 768px) {
    .welcome-container {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr;
      overflow-y: auto;
    }
  }
  .welcome-left {
    padding: 64px 80px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    background: var(--bg-sidebar);
    border-right: 1px solid var(--border-color);
    position: relative;
    overflow: hidden;
    height: 100%;
  }
  @media (max-width: 768px) {
    .welcome-left {
      border-right: none;
      border-bottom: 1px solid var(--border-color);
      padding: 40px;
      height: auto;
    }
  }
  .welcome-right {
    padding: 64px 80px;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  @media (max-width: 768px) {
    .welcome-right {
      padding: 40px;
      height: auto;
    }
  }
  .welcome-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    max-width: 320px;
    padding: 14px 18px;
    border-radius: 10px;
    border: 1px solid var(--border-color);
    background: var(--bg-app);
    color: var(--text-main);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .welcome-btn:hover {
    border-color: var(--accent-color);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(var(--accent-rgb), 0.15);
  }
  .recent-list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 24px;
    padding-right: 4px;
  }
  .recent-list::-webkit-scrollbar {
    width: 6px;
  }
  .recent-list::-webkit-scrollbar-track {
    background: transparent;
  }
  .recent-list::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
  }
  .recent-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    position: relative;
    border: 1px solid transparent;
    background: rgba(var(--accent-rgb), 0.01);
  }
  .recent-item:hover {
    background: var(--bg-sidebar);
    border-color: var(--border-color);
    transform: translateX(4px);
  }
  .recent-delete {
    opacity: 0;
    transition: all 0.2s ease;
    border-radius: 6px;
    padding: 6px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .recent-item:hover .recent-delete {
    opacity: 0.6;
  }
  .recent-delete:hover {
    opacity: 1 !important;
    background: rgba(239, 68, 68, 0.1) !important;
    color: #ef4444 !important;
  }
  .glowing-bg {
    position: absolute;
    top: -80px;
    left: -80px;
    width: 320px;
    height: 320px;
    background: radial-gradient(circle, rgba(var(--accent-rgb), 0.08) 0%, rgba(var(--accent-rgb), 0) 70%);
    pointer-events: none;
    z-index: 0;
  }
  .shortcut-pill {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    font-size: 10px;
    font-weight: 500;
    background: var(--bg-app);
    color: var(--text-muted);
  }
`;

export const WelcomeScreen: React.FC = () => {
  const { newFile, openFile, recentFiles, openFilePath, removeFromRecent } = useFile();
  const [quote, setQuote] = useState<Quote>({ text: "", author: "" });

  useEffect(() => {
    setQuote(getDynamicQuote());
  }, []);

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "var(--bg-app)",
      fontFamily: "var(--font-ui)",
      color: "var(--text-main)",
      overflow: "hidden"
    }}>
      <style>{welcomeStyles}</style>

      <div className="welcome-container">
        <div className="welcome-left">
          <div className="glowing-bg" />
          
          <div style={{ display: "flex", alignItems: "center", gap: 10, zIndex: 1 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "var(--accent-color)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(var(--accent-rgb), 0.2)"
            }}>
              <FileText size={16} color="white" />
            </div>
            <div>
              <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.02em" }}>Act One</span>
            </div>
          </div>

          <div style={{ zIndex: 1, margin: "auto 0" }}>
            {quote.text && (
              <>
                <h1 style={{
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  lineHeight: 1.25,
                  color: "var(--text-main)",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-editor), Courier, monospace",
                  maxWidth: 480
                }}>
                  {quote.text}
                </h1>
                <p style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginTop: 16,
                  fontFamily: "var(--font-ui)"
                }}>
                  — {quote.author}
                </p>
              </>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 32 }}>
              <button className="welcome-btn" onClick={() => newFile()}>
                <Plus size={16} color="var(--accent-color)" />
                <span>New Screenplay</span>
              </button>
              <button className="welcome-btn" onClick={openFile}>
                <FolderOpen size={16} color="var(--accent-color)" />
                <span>Open Screenplay</span>
              </button>
            </div>
          </div>

          <div style={{
            display: "flex",
            gap: 16,
            fontSize: 11,
            color: "var(--text-muted)",
            opacity: 0.8,
            zIndex: 1
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <kbd className="shortcut-pill">Ctrl+N</kbd> New
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <kbd className="shortcut-pill">Ctrl+O</kbd> Open
            </span>
          </div>
        </div>

        <div className="welcome-right">
          <div style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            opacity: 0.7
          }}>
            Recent Projects
          </div>

          {recentFiles.length > 0 ? (
            <div className="recent-list">
              {recentFiles.map((item: any) => (
                <div
                  key={item.path}
                  className="recent-item"
                  onClick={() => openFilePath(item.path)}
                >
                  <div style={{
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    background: "rgba(128, 128, 128, 0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <FileText size={14} style={{ opacity: 0.6 }} />
                  </div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 500,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {item.name}
                    </div>
                    <div style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      marginTop: 2
                    }}>
                      {item.path}
                    </div>
                  </div>
                  <button
                    className="recent-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromRecent(item.path);
                    }}
                    title="Remove from recent"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              opacity: 0.4,
              gap: 8,
              textAlign: "center",
              padding: "40px 0"
            }}>
              <FileText size={32} strokeWidth={1.5} />
              <span style={{ fontSize: 13 }}>No recent projects</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
