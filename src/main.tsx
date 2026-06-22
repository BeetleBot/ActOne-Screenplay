import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { logger } from "./utils/logger";

window.onerror = (_message, _source, _line, _col, error) => {
  logger.error("app", "Uncaught exception", error ?? undefined);
};

window.addEventListener("unhandledrejection", (event) => {
  logger.error("app", "Unhandled Promise rejection", event.reason);
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
