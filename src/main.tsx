import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { SettingsWindow } from "./components/SettingsWindow";
import { HelpWindow } from "./components/HelpWindow";
import { TagManagerWindow } from "./components/TagManagerWindow";
import { ThemeManagerWindow } from "./components/ThemeManagerWindow";
import "./index.css";
import { logger } from "./utils/logger";

window.onerror = (_message, _source, _line, _col, error) => {
  logger.error("app", "Uncaught exception", error ?? undefined);
};

window.addEventListener("unhandledrejection", (event) => {
  logger.error("app", "Unhandled Promise rejection", event.reason);
});

const params = new URLSearchParams(window.location.search);
const modalParam = params.get("modal");

let rootElement: React.ReactNode;
if (modalParam === "settings") {
  rootElement = <SettingsWindow />;
} else if (modalParam === "help") {
  rootElement = <HelpWindow />;
} else if (modalParam === "tag-manager") {
  rootElement = <TagManagerWindow />;
} else if (modalParam === "theme-manager") {
  rootElement = <ThemeManagerWindow />;
} else {
  rootElement = <App />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {rootElement}
  </React.StrictMode>,
);
