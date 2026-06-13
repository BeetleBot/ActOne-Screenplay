import React, { useCallback } from "react";

type Dir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

const EDGE_SIZE = 8;
const CORNER_SIZE = 24;

const cursors: Record<Dir, string> = {
  n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize",
  ne: "nesw-resize", nw: "nwse-resize", se: "nwse-resize", sw: "nesw-resize",
};

const tauriDirections: Record<Dir, string> = {
  n: "North",
  s: "South",
  e: "East",
  w: "West",
  ne: "NorthEast",
  nw: "NorthWest",
  se: "SouthEast",
  sw: "SouthWest",
};

const TITLEBAR_HEIGHT = 30;
const WINDOW_CONTROLS_WIDTH = 138;

function edgeStyle(dir: Dir): React.CSSProperties {
  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 99999,
  };
  if (dir === "n" || dir === "s") {
    style.left = CORNER_SIZE;
    style.right = dir === "n" ? WINDOW_CONTROLS_WIDTH : CORNER_SIZE;
    style.height = EDGE_SIZE;
    style[dir === "n" ? "top" : "bottom"] = 0;
    style.cursor = cursors[dir];
  } else if (dir === "e" || dir === "w") {
    style.top = dir === "e" ? TITLEBAR_HEIGHT : CORNER_SIZE;
    style.bottom = CORNER_SIZE;
    style.width = EDGE_SIZE;
    style[dir === "e" ? "right" : "left"] = 0;
    style.cursor = cursors[dir];
  } else {
    style.width = CORNER_SIZE;
    style.height = CORNER_SIZE;
    if (dir.includes("n")) style.top = 0;
    if (dir.includes("s")) style.bottom = 0;
    if (dir.includes("e")) style.right = 0;
    if (dir.includes("w")) style.left = 0;
    style.cursor = cursors[dir];
    
    // Hide 'ne' completely so it doesn't overlap the close button
    if (dir === "ne") {
      style.display = "none";
    }
  }
  return style;
}

let tauriWindow: any = null;

async function ensureTauri() {
  if (!tauriWindow) {
    try {
      const w = await import("@tauri-apps/api/window");
      tauriWindow = w.getCurrentWindow();
    } catch { return null; }
  }
  return tauriWindow;
}

interface WindowResizeHandlesProps {
  showDragHandle?: boolean;
  resizeEnabled?: boolean;
}

export const WindowResizeHandles: React.FC<WindowResizeHandlesProps> = ({ showDragHandle = false, resizeEnabled = true }) => {

  const onEdgeMouseDown = useCallback((dir: Dir, e: React.MouseEvent) => {
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    ensureTauri().then((win) => {
      if (win && typeof win.startResizeDragging === "function") {
        win.startResizeDragging(tauriDirections[dir]).catch((err: any) => {
          console.error("Failed to start native resize dragging:", err);
        });
      }
    });
  }, []);

  const handleDrag = useCallback(async (e: React.MouseEvent) => {
    if (e.button === 0) {
      e.preventDefault();
      const win = await ensureTauri();
      if (win) win.startDragging();
    }
  }, []);

  const dirs: Dir[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];

  return (
    <>
      {resizeEnabled && dirs.map((dir) => (
        <div
          key={dir}
          style={edgeStyle(dir)}
          onMouseDown={(e) => onEdgeMouseDown(dir, e)}
        />
      ))}
      {showDragHandle && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: 28,
            zIndex: 99998,
          }}
          onMouseDown={handleDrag}
        />
      )}
    </>
  );
};
