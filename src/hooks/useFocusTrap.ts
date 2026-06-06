import { useEffect, useRef, useCallback } from "react";

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[role="option"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="radio"]',
].join(", ");

export function useFocusTrap(isActive: boolean, onEscape?: () => void, initialFocusSelector?: string) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    previousFocusRef.current = document.activeElement as HTMLElement;

    const timer = setTimeout(() => {
      if (!containerRef.current) return;

      const cmContent = document.querySelector(".cm-content") as HTMLElement;
      if (cmContent) {
        cmContent.setAttribute("contenteditable", "false");
      }

      const selector = initialFocusSelector || FOCUSABLE_SELECTOR;
      const first = containerRef.current.querySelector(selector) as HTMLElement;
      if (first) {
        first.focus();
      } else {
        containerRef.current.focus();
      }
    }, 30);

    return () => {
      clearTimeout(timer);
      const cmContent = document.querySelector(".cm-content") as HTMLElement;
      if (cmContent) {
        cmContent.setAttribute("contenteditable", "true");
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (!isActive) return;

    return () => {
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === "function") {
        previousFocusRef.current.focus();
      }
    };
  }, [isActive]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isActive || !containerRef.current) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onEscape?.();
        return;
      }

      if (e.key === "Tab") {
        const focusable = Array.from(
          containerRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
        ) as HTMLElement[];

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const firstEl = focusable[0];
        const lastEl = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
          if (active === firstEl || !containerRef.current.contains(active)) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (active === lastEl || !containerRef.current.contains(active)) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    },
    [isActive, onEscape]
  );

  return { containerRef, handleKeyDown };
}
