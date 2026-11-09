import { inlinePreview } from "./inline-preview";
import { tables } from "./table-widget";
import { afterEach, describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { history, undo, redo } from "@codemirror/commands";
import { proseMedia, serializeTable, renderCellPreview, proseImagesField, setProseImages } from "./prose-media";
let view: EditorView;
const table = "| Name | Note |\n| --- | ---: |\n| Alice | Hello |";
function mount(doc = table, readOnly = false) {
  view = new EditorView({
    parent: document.body,
    state: EditorState.create({
      doc,
      extensions: [
        markdown({ base: markdownLanguage }),
        history(),
        inlinePreview(),
        tables(),
        proseImagesField,
        proseMedia,
        EditorState.readOnly.of(readOnly),
      ],
    }),
  });
  return view;
}
afterEach(() => {
  view?.destroy();
  document.body.innerHTML = "";
});
describe("visual prose tables", () => {
  it("renders existing Markdown as a grid with headers and alignment", () => {
    mount();
    expect(view.dom.querySelectorAll("th")).toHaveLength(2);
    expect(view.dom.querySelectorAll("td")).toHaveLength(2);
    const inputs = view.dom.querySelectorAll("textarea");
    expect(inputs[2].value).toBe("Alice");
    expect(inputs[3].style.textAlign).toBe("right");
  });
  it("commits a cell and supports undo and redo", () => {
    mount();
    const cell = view.dom.querySelectorAll("textarea")[2];
    cell.value = "Bob";
    cell.dispatchEvent(new FocusEvent("blur"));
    expect(view.state.doc.toString()).toContain("Bob");
    expect(undo(view)).toBe(true);
    expect(view.state.doc.toString()).toBe(table);
    expect(redo(view)).toBe(true);
    expect(view.state.doc.toString()).toContain("Bob");
  });
  it("saves typing immediately and retains the editing input", () => {
    mount();
    const input = view.dom.querySelectorAll("textarea")[2];
    input.focus();
    input.value = "Typing now";
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
    expect(view.state.doc.toString()).toContain("Typing now");
    expect(view.dom.querySelectorAll("textarea")[2]).toBe(input);
    expect(document.activeElement).toBe(input);
    input.blur();
    expect(view.dom.querySelectorAll(".cm-prose-table-cell-preview")[2].textContent).toBe("Typing now");
  });
  it("renders emphasis safely without activating unsafe links or HTML", () => {
    const preview = renderCellPreview("**Bold** *italic* [bad](javascript:alert) <img src=x>");
    expect(preview.querySelector("strong")?.textContent).toBe("Bold");
    expect(preview.querySelector("em")?.textContent).toBe("italic");
    expect(preview.querySelector("a")?.hasAttribute("href")).toBe(false);
    expect(preview.querySelector("img")).toBeNull();
  });
  it("adds a row with Tab at the last cell", () => {
    mount();
    view.dom
      .querySelectorAll("textarea")[3]
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    expect(view.dom.querySelectorAll("tbody tr")).toHaveLength(2);
  });
  it("adds columns through the cell menu", () => {
    mount();
    view.dom
      .querySelector("textarea")!
      .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    const button = Array.from(document.querySelectorAll<HTMLButtonElement>(".cm-prose-table-menu button")).find(
      (b) => b.textContent === "Insert column right",
    )!;
    button.click();
    expect(view.dom.querySelectorAll("th")).toHaveLength(3);
  });
  it("protects the header and final column", () => {
    mount("| A |\n| --- |\n| B |");
    view.dom
      .querySelector("textarea")!
      .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    for (const label of ["Delete row", "Delete column"])
      expect(
        Array.from(document.querySelectorAll<HTMLButtonElement>(".cm-prose-table-menu button")).find(
          (b) => b.textContent === label,
        )?.disabled,
      ).toBe(true);
  });
  it("does not allow edits in read-only documents", () => {
    mount(table, true);
    const input = view.dom.querySelector("textarea")!;
    expect(input.readOnly).toBe(true);
    input.value = "Changed";
    input.dispatchEvent(new FocusEvent("blur"));
    expect(view.state.doc.toString()).toBe(table);
  });
  it("escapes pipes and keeps multiline cell edits on one Markdown row", () => {
    expect(
      serializeTable(
        [
          ["A", "B"],
          ["one|two", "three\nfour"],
        ],
        ["---", "---"],
      ),
    ).toContain("one\\|two | three four");
  });
});
describe("prose image display", () => {
  it("renders a short image reference using separate registry data", () => {
    mount("![image1](image1)");
    view.dispatch({ effects: setProseImages.of({ image1: "data:image/png;base64,YQ==" }) });
    expect(view.dom.querySelector("img")?.src).toBe("data:image/png;base64,YQ==");
    expect(view.state.doc.toString()).toBe("![image1](image1)");
    Array.from(view.dom.querySelectorAll("button"))
      .find((button) => button.textContent === "Remove image")!
      .click();
    undo(view);
    expect(view.dom.querySelector("img")).toBeTruthy();
  });
  it("renders an imported image and removes it undoably", () => {
    const source = "![Picture](data:image/png;base64,YQ==)";
    mount(source);
    expect(view.dom.querySelector("img")?.alt).toBe("Picture");
    Array.from(view.dom.querySelectorAll("button"))
      .find((b) => b.textContent === "Remove image")!
      .click();
    expect(view.state.doc.length).toBe(0);
    undo(view);
    expect(view.state.doc.toString()).toBe(source);
  });
  it("reveals source for editing its description", () => {
    mount("![Picture](data:image/png;base64,YQ==)");
    Array.from(view.dom.querySelectorAll("button"))
      .find((b) => b.textContent === "Edit description")!
      .click();
    expect(view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to)).toBe("Picture");
    expect(view.dom.querySelector("img")).toBeNull();
  });
  it("does not load remote images automatically", () => {
    mount("![remote](https://example.com/a.png)");
    expect(view.dom.querySelector("img")).toBeNull();
  });

  it("disables image actions in read-only documents", () => {
    const source = "![Picture](data:image/png;base64,YQ==)";
    mount(source, true);
    const buttons = Array.from(view.dom.querySelectorAll<HTMLButtonElement>("figcaption button"));
    expect(buttons).toHaveLength(3);
    for (const button of buttons) {
      expect(button.disabled).toBe(true);
      button.click();
    }
    expect(view.state.doc.toString()).toBe(source);
  });

  it("replaces the displayed registry image and removes stale image data", () => {
    mount("![image1](image1)");
    view.dispatch({ effects: setProseImages.of({ image1: "data:image/png;base64,YQ==" }) });
    expect(view.dom.querySelector("img")?.getAttribute("src")).toBe("data:image/png;base64,YQ==");
    view.dispatch({ effects: setProseImages.of({ image1: "data:image/png;base64,Yg==" }) });
    expect(view.dom.querySelector("img")?.getAttribute("src")).toBe("data:image/png;base64,Yg==");
    view.dispatch({ effects: setProseImages.of({}) });
    expect(view.dom.querySelector("img")).toBeNull();
    expect(view.state.doc.toString()).toBe("![image1](image1)");
  });
});
