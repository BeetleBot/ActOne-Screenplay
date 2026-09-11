import { useEffect, useRef } from "react";

export interface DropPosition {
  clientX: number;
  clientY: number;
}

const ACCEPTED_EXTENSIONS = new Set([
  ".fountain",
  ".txt",
  ".actone",
  ".pdf",
  ".fdx",
  ".fadein",
  ".md",
  ".markdown",
]);

export function useNativeAppBehavior(
  onDropFiles?: (paths: string[], position?: DropPosition) => void,
  onDragStateChange?: (isDragging: boolean, position?: DropPosition | null) => void
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
      const target = e.target as HTMLElement | null;
      if (
        !target ||
        target.tagName === "INPUT" || 
        target.tagName === "TEXTAREA" || 
        target.tagName === "SELECT" || 
        target.contentEditable === "true" ||
        (typeof target.closest === "function" && target.closest(".cm-content"))
      ) {
        return;
      }

      if (e.key === "F5" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r")) {
        e.preventDefault();
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

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
      onDragStateChangeRef.current?.(true, { clientX: e.clientX, clientY: e.clientY });
    };

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      onDragStateChangeRef.current?.(true, { clientX: e.clientX, clientY: e.clientY });
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.relatedTarget === null) {
        onDragStateChangeRef.current?.(false, null);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      onDragStateChangeRef.current?.(false, null);
    };

    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("dragenter", handleDragEnter);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    let unmounted = false;
    let unlistenDragDrop: (() => void) | undefined;

    const setupDragDrop = async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        const toLogicalPos = (pos?: { x: number; y: number }): DropPosition | undefined => {
          if (!pos) return undefined;
          return {
            clientX: pos.x / (window.devicePixelRatio || 1),
            clientY: pos.y / (window.devicePixelRatio || 1),
          };
        };

        const unlisten = await getCurrentWebview().onDragDropEvent((event) => {
          if (unmounted) return;
          const payload = event.payload;
          if (payload.type === "enter") {
            onDragStateChangeRef.current?.(true, toLogicalPos(payload.position));
          } else if (payload.type === "over") {
            onDragStateChangeRef.current?.(true, toLogicalPos(payload.position));
          } else if (payload.type === "leave") {
            onDragStateChangeRef.current?.(false, null);
          } else if (payload.type === "drop") {
            onDragStateChangeRef.current?.(false, null);
            const valid = payload.paths.filter((p) => {
              const ext = p.slice(p.lastIndexOf(".")).toLowerCase();
              return ACCEPTED_EXTENSIONS.has(ext);
            });
            if (valid.length > 0) {
              const pos = toLogicalPos(payload.position);
              onDropFilesRef.current?.(valid, pos);
            }
          }
        });

        if (unmounted) {
          try {
            if (typeof unlisten === "function") unlisten();
          } catch {
            // Guard against handlerId undefined error on torn down webview
          }
        } else {
          unlistenDragDrop = unlisten;
        }
      } catch {
        // Not in Tauri — no-op, native drop is already prevented
      }
    };

    setupDragDrop();

    return () => {
      unmounted = true;
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("dragenter", handleDragEnter);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
      if (unlistenDragDrop) {
        try {
          if (typeof unlistenDragDrop === "function") unlistenDragDrop();
        } catch {
          // Guard against handlerId undefined error on unmount
        }
      }
    };
  }, []);
}
