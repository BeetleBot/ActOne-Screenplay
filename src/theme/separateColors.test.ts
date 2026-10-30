import { expect, it } from "vitest";
import { createActOneTheme, deriveAllColors, getEditorVars } from "./muiTheme";
import { completeCustomColors, exportTheme, importTheme } from "./themeUtils";

const colors = { ...deriveAllColors({ editor: "#fff8e8", text: "#eeeeee", accent: "#8855bb", button: "#8855bb", sidebar: "#202020" }, true), app: "#151515", editorText: "#302820" };
const config = { id: "paper", name: "Paper", desc: "", category: "custom" as const, isDark: true, colors };
it("separates UI and writing foreground/background across MUI and editor CSS", () => {
  const theme = createActOneTheme(config);
  const vars = getEditorVars(config);
  expect(theme.palette.text.primary).toBe("#eeeeee");
  expect(theme.palette.background.default).toBe("#151515");
  expect(theme.palette.background.paper).toBe("#202020");
  expect(vars["--editor-text"]).toBe("#302820");
  expect(vars["--prose-editor-fg"]).toBe("#302820");
  expect(vars["--bg-editor-wrapper"]).toBe("#fff8e8");
});
it("preserves independent colours on save, import and resolution", () => {
  const imported = importTheme(exportTheme(config));
  expect(completeCustomColors(imported.colors, true).editorText).toBe("#302820");
  expect(imported.colors.app).toBe("#151515");
});
it("keeps legacy theme fallbacks", () => {
  const legacy: Partial<typeof colors> = { ...colors };
  delete legacy.app;
  delete legacy.editorText;
  const completed = completeCustomColors(legacy, true);
  const theme = createActOneTheme({ ...config, colors: completed });
  expect(theme.palette.background.default).toBe(legacy.editor);
  expect(getEditorVars({ ...config, colors: completed })["--editor-text"]).toBe(legacy.text);
});

it("keeps small and normal switch thumbs inside their tracks", () => {
  const theme = createActOneTheme(config);
  const root = theme.components?.MuiSwitch?.styleOverrides?.root as Record<string, unknown>;
  expect(root.width).toBe(36);
  expect(root.height).toBe(22);
  expect(root["& .MuiSwitch-switchBase"]).toEqual({ padding: 3, width: 22, height: 22, margin: 0, boxSizing: 'border-box' });
  expect(root["&.MuiSwitch-sizeSmall"]).toEqual({ width: 36, height: 22, padding: 0 });
});
