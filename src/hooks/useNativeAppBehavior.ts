import { useEffect, useRef } from "react";

const ACCEPTED_EXTENSIONS = new Set([".fountain", ".txt", ".actone"]);

export function useNativeAppBehavior(
  onDropFiles?: (paths: string[]) => void,
  onDragStateChange?: (isDragging: boolean) => void
) {
  const onDropFilesRef = useRef(onDropFiles);
  onDropFilesRef.current = onDropFiles;
  const onDragStateChangeRef = useRef(onDragStateChange);
  onDragStateChangeRef.current = onDragStateChange;
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target || typeof target.closest !== "function") {
        e.preventDefault();
        return;
      }

      const isEditable =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.closest(".cm-editor") !== null ||
        target.contentEditable === "true";

      if (!isEditable) {
        e.preventDefault();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (e.key === "F5" || e.key === "F7" || (ctrlOrCmd && e.key.toLowerCase() === "r")) {
        e.preventDefault();
        return;
      }

      const target = e.target as HTMLElement | null;
      if (
        !target ||
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.tagName === "SELECT" || 
        target.contentEditable === "true" ||
        target.closest(".cm-content")
      ) {
        return;
      }

      if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "PageUp" || e.key === "PageDown") {
        const hoveredEl = document.querySelectorAll(":hover");
        let scrollTarget: HTMLElement | null = null;
        
        for (let i = hoveredEl.length - 1; i >= 0; i--) {
          const el = hoveredEl[i] as HTMLElement;
          const style = window.getComputedStyle(el);
          const isScrollable = (style.overflowY === "auto" || style.overflowY === "scroll" || style.overflow === "auto" || style.overflow === "scroll") && el.scrollHeight > el.clientHeight;
          if (isScrollable) {
            scrollTarget = el;
            break;
          }
        }
        
        if (!scrollTarget) {
          const activeEl = document.activeElement as HTMLElement;
          if (activeEl && activeEl.scrollHeight > activeEl.clientHeight) {
            scrollTarget = activeEl;
          }
        }
        
        if (scrollTarget) {
          e.preventDefault();
          const amount = (e.key === "PageUp" || e.key === "PageDown") ? scrollTarget.clientHeight * 0.8 : 40;
          const direction = (e.key === "ArrowUp" || e.key === "PageUp") ? -1 : 1;
          scrollTarget.scrollBy({
            top: amount * direction,
            behavior: "auto"
          });
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("drop", handleDrop);

    let unlistenDragDrop: (() => void) | undefined;

    const setupDragDrop = async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        unlistenDragDrop = await getCurrentWebview().onDragDropEvent((event) => {
          const payload = event.payload;
          if (payload.type === "enter") {
            onDragStateChangeRef.current?.(true);
          } else if (payload.type === "leave") {
            onDragStateChangeRef.current?.(false);
          } else if (payload.type === "drop") {
            onDragStateChangeRef.current?.(false);
            const valid = payload.paths.filter((p) => {
              const ext = p.slice(p.lastIndexOf(".")).toLowerCase();
              return ACCEPTED_EXTENSIONS.has(ext);
            });
            if (valid.length > 0) {
              onDropFilesRef.current?.(valid);
            }
          }
        });
      } catch {
        // Not in Tauri — no-op, native drop is already prevented
      }
    };

    setupDragDrop();

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("drop", handleDrop);
      unlistenDragDrop?.();
    };
  }, []);
}
