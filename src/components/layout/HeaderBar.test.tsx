import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { HeaderBar } from "./HeaderBar";
vi.mock("../../context", () => ({
  useWorkspaceMetadata: () => ({ files: [{ id: "one", filePath: "Script.fountain" }, { id: "two", filePath: "Other.fountain" }], activeFileId: "one" }),
  useFileActions: () => ({ selectFile: vi.fn(), newFile: vi.fn(), closeFile: vi.fn(), closeOthers: vi.fn(), closeAll: vi.fn() }),
  useUI: () => ({ isZenMode: false }),
}));
vi.mock("../../utils", () => ({ getTauriWindow: () => null }));
it("keeps both active and inactive tabs free of shadows", () => {
  Element.prototype.scrollIntoView = vi.fn();
  const { container } = render(<HeaderBar />);
  const tabs = container.querySelectorAll(".header-tab");
  expect(tabs).toHaveLength(2);
  tabs.forEach(tab => expect(tab).toHaveStyle({ boxShadow: "none" }));
});
