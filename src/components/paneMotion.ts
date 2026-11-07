const easing = "240ms cubic-bezier(0.25, 1, 0.5, 1)";

export const paneTransition = `width ${easing}, min-width ${easing}, max-width ${easing}, opacity 180ms ease`;
export const paneHandleTransition = `width ${easing}, opacity 180ms ease, background-color var(--duration-fast)`;
export const reducedPaneMotion = { "@media (prefers-reduced-motion: reduce)": { transition: "none" } };
