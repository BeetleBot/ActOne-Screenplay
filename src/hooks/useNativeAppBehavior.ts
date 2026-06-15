import { useEffect } from "react";

export function useNativeAppBehavior() {
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
      if (e.key === "F5" || (ctrlOrCmd && e.key.toLowerCase() === "r")) {
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

    // Prevent browser navigation on external file drops (harmless for in-app DnD
    // since child element drop handlers run before this bubbles up to window)
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("drop", handleDrop);
    };
  }, []);
}
