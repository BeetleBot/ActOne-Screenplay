import { createPortal } from "react-dom";
import { ThemeLogo } from "./ThemeLogo";

interface WindowLoadingProps {
  label?: string;
  embedded?: boolean;
  spinning?: boolean;
}

export function WindowLoading({ label = "Loading window", embedded = false, spinning = false }: WindowLoadingProps) {
  const host = spinning ? document.querySelector(".editor-container") : null;
  const loader = <div role="status" aria-label={label} className={`actone-window-loading${embedded ? " actone-window-loading-embedded" : ""}${spinning ? " actone-document-loading" : ""}${host ? " actone-document-loading-overlay" : ""}`}>
    <div aria-hidden="true" className={spinning ? "actone-document-loading-logo" : "actone-window-loading-logo"}>{spinning && <ThemeLogo variant="solid" />}</div>
  </div>;
  return host ? createPortal(loader, host) : loader;
}
