import { StateEffect, StateField, type EditorState, type Range } from "@codemirror/state";
import { Decoration, EditorView, WidgetType, type DecorationSet } from "@codemirror/view";
import { syntaxTree, ensureSyntaxTree } from "@codemirror/language";
import { splitRowCells } from "./table-widget";
import { proseImagePattern, type ProseImageRegistry } from "../../utils/proseAssets";

export const setProseImages = StateEffect.define<ProseImageRegistry>();
export const proseImagesField = StateField.define<ProseImageRegistry>({
  create: () => ({}),
  update(value, tr) {
    for (const effect of tr.effects) if (effect.is(setProseImages)) return effect.value;
    return value;
  },
});

export function serializeTable(rows: string[][], alignments: string[]): string {
  const row = (cells: string[]) =>
    "| " + cells.map((c) => c.replace(/\r?\n/g, " ").replace(/(?<!\\)\|/g, "\\|")).join(" | ") + " |";
  return [row(rows[0]), row(alignments), ...rows.slice(1).map(row)].join("\n");
}

class ImageWidget extends WidgetType {
  constructor(
    readonly url: string,
    readonly alt: string,
    readonly from: number,
    readonly to: number,
  ) {
    super();
  }
  eq(other: ImageWidget) {
    return other.url === this.url && other.alt === this.alt && other.from === this.from && other.to === this.to;
  }
  toDOM(view: EditorView) {
    const wrap = document.createElement("figure");
    wrap.className = "cm-prose-image";
    const image = document.createElement("img");
    image.src = this.url;
    image.alt = this.alt;
    image.onload = () => view.requestMeasure();
    image.onerror = () => {
      image.hidden = true;
      const message = document.createElement("span");
      message.textContent = `Image unavailable: ${this.alt}`;
      wrap.prepend(message);
      view.requestMeasure();
    };
    wrap.append(image);
    const controls = document.createElement("figcaption");
    for (const label of ["Edit description", "Replace image", "Remove image"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.disabled = view.state.readOnly;
      button.onclick = () => {
        if (view.state.readOnly) return;
        if (label === "Remove image")
          view.dispatch({ changes: { from: this.from, to: this.to }, selection: { anchor: this.from } });
        else if (label === "Replace image") {
          view.dom.dispatchEvent(
            new CustomEvent("actone:replace-prose-image", { bubbles: true, detail: { from: this.from, to: this.to } }),
          );
        } else {
          view.dispatch({ selection: { anchor: this.from + 2, head: this.from + 2 + this.alt.length } });
        }
        view.focus();
      };
      controls.append(button);
    }
    wrap.append(controls);
    return wrap;
  }
  ignoreEvent() {
    return true;
  }
}

// Build display content with DOM nodes, never untrusted HTML.
export function renderCellPreview(text: string): HTMLElement {
  const span = document.createElement("span");
  const tokens = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let from = 0;
  for (const match of text.matchAll(tokens)) {
    span.append(document.createTextNode(text.slice(from, match.index)));
    const element = document.createElement(match[2] ? "strong" : match[3] ? "em" : match[4] ? "code" : "a");
    element.textContent = match[2] || match[3] || match[4] || match[5];
    if (element instanceof HTMLAnchorElement && /^(https?:|mailto:)/i.test(match[6])) {
      element.href = match[6];
      element.target = "_blank";
      element.rel = "noopener noreferrer";
      element.onclick = (event) => event.stopPropagation();
    }
    span.append(element);
    from = match.index + match[0].length;
  }
  span.append(document.createTextNode(text.slice(from).replace(/\\\|/g, "|")));
  return span;
}

function focusTableCell(input: HTMLTextAreaElement | null | undefined): void {
  if (!input) return;
  // Inactive cell sources are display:none, so reveal before focusing.
  input.style.display = "block";
  input.focus();
}

const tableControllers = new WeakMap<HTMLElement, { widget: TableWidget; source: () => string }>();
class TableWidget extends WidgetType {
  constructor(
    public source: string,
    public from: number,
    public to: number,
  ) {
    super();
  }
  eq(other: TableWidget) {
    return this.source === other.source && this.from === other.from;
  }
  updateDOM(dom: HTMLElement) {
    const controller = tableControllers.get(dom);
    if (!controller || controller.source() !== this.source) return false;
    const lines = this.source.split("\n");
    const rows = [splitRowCells(lines[0]), ...lines.slice(2).map(splitRowCells)];
    if (dom.querySelectorAll("tr").length !== rows.length || dom.querySelectorAll("th").length !== rows[0].length)
      return false;
    dom.querySelectorAll<HTMLElement>(".cm-prose-table-cell-preview").forEach((preview, index) => {
      preview.replaceChildren(renderCellPreview(rows[Math.floor(index / rows[0].length)][index % rows[0].length]));
    });
    controller.widget.source = this.source;
    controller.widget.from = this.from;
    controller.widget.to = this.to;
    dom.dataset.from = String(this.from);
    return true;
  }
  toDOM(view: EditorView) {
    const lines = this.source.split("\n");
    const alignments = splitRowCells(lines[1]);
    const rows = [splitRowCells(lines[0]), ...lines.slice(2).map(splitRowCells)].map((row) =>
      alignments.map((_, i) => row[i] || ""),
    );
    const wrap = document.createElement("div");
    wrap.className = "cm-prose-table";
    const table = document.createElement("table");
    table.setAttribute("aria-label", "Prose table");
    table.style.minWidth = `${Math.max(360, alignments.length * 140)}px`;
    const commit = (next: string[][], nextAlign = alignments, focus?: [number, number]) => {
      if (view.state.readOnly || !wrap.isConnected) return;
      const source = serializeTable(next, nextAlign);
      if (source !== this.source)
        view.dispatch({ changes: { from: this.from, to: this.to, insert: source }, userEvent: "input" });
      if (focus)
        requestAnimationFrame(() => {
          const widgets = view.dom.querySelectorAll<HTMLElement>(".cm-prose-table");
          const current = Array.from(widgets).find((w) => w.dataset.from === String(this.from));
          focusTableCell(
            current?.querySelector<HTMLTextAreaElement>(`[data-row="${focus[0]}"][data-col="${focus[1]}"]`),
          );
        });
    };
    tableControllers.set(wrap, { widget: this, source: () => serializeTable(rows, alignments) });
    wrap.dataset.from = String(this.from);
    rows.forEach((row, r) => {
      const tr = document.createElement("tr");
      row.forEach((value, c) => {
        const cell = document.createElement(r === 0 ? "th" : "td");
        const input = document.createElement("textarea");
        input.value = value;
        input.rows = 1;
        input.dataset.row = String(r);
        input.dataset.col = String(c);
        input.setAttribute("aria-label", `Row ${r + 1}, column ${c + 1}`);
        input.readOnly = view.state.readOnly;
        const alignment = alignments[c];
        input.style.textAlign = alignment.endsWith(":") ? (alignment.startsWith(":") ? "center" : "right") : "left";
        cell.style.textAlign = input.style.textAlign;
        const resize = () => {
          input.style.height = "auto";
          input.style.height = `${Math.max(28, input.scrollHeight)}px`;
          view.requestMeasure();
        };
        input.oninput = () => {
          rows[r][c] = input.value;
          commit(rows);
          resize();
        };
        input.onfocus = resize;
        input.onblur = (event) => {
          input.style.removeProperty("display");
          if (input.value !== value) {
            const next = event.relatedTarget;
            const focus: [number, number] | undefined =
              next instanceof HTMLTextAreaElement && wrap.contains(next)
                ? [Number(next.dataset.row), Number(next.dataset.col)]
                : undefined;
            rows[r][c] = input.value;
            commit(rows, alignments, focus);
          }
        };
        input.onkeydown = (event) => {
          if (event.key === "Tab") {
            event.preventDefault();
            event.stopPropagation();
            rows[r][c] = input.value;
            const index = r * row.length + c + (event.shiftKey ? -1 : 1);
            if (index < 0) {
              view.dispatch({ selection: { anchor: this.from } });
              view.focus();
              return;
            }
            if (index >= rows.length * row.length) rows.push(row.map(() => ""));
            commit(rows, alignments, [Math.floor(index / row.length), index % row.length]);
            if (serializeTable(rows, alignments) === this.source)
              focusTableCell(
                wrap.querySelector<HTMLTextAreaElement>(
                  `[data-row="${Math.floor(index / row.length)}"][data-col="${index % row.length}"]`,
                ),
              );
          } else if (event.key === "Escape") {
            event.preventDefault();
            input.blur();
            view.dispatch({ selection: { anchor: Math.min(this.to, view.state.doc.length) } });
            view.focus();
          } else if ((event.ctrlKey || event.metaKey) && ["z", "y"].includes(event.key.toLowerCase())) {
            event.preventDefault();
            input.blur();
            view.focus();
            view.contentDOM.dispatchEvent(
              new KeyboardEvent("keydown", {
                key: event.key,
                ctrlKey: event.ctrlKey,
                metaKey: event.metaKey,
                shiftKey: event.shiftKey,
                bubbles: true,
              }),
            );
          }
        };
        input.oncontextmenu = (event) => {
          event.preventDefault();
          event.stopPropagation();
          document.querySelector(".cm-prose-table-menu")?.remove();
          const menu = document.createElement("div");
          menu.className = "cm-prose-table-menu";
          menu.style.position = "fixed";
          menu.style.left = `${Math.min(event.clientX, window.innerWidth - 190)}px`;
          menu.style.top = `${Math.min(event.clientY, window.innerHeight - 300)}px`;
          const actions: [string, () => void][] = [
            [
              "Insert row below",
              () => {
                rows.splice(
                  r + 1,
                  0,
                  row.map(() => ""),
                );
                commit(rows);
              },
            ],
            [
              "Delete row",
              () => {
                if (r === 0) return;
                rows.splice(r, 1);
                commit(rows);
              },
            ],
            [
              "Insert column right",
              () => {
                rows.forEach((cells) => cells.splice(c + 1, 0, ""));
                alignments.splice(c + 1, 0, "---");
                commit(rows);
              },
            ],
            [
              "Delete column",
              () => {
                if (row.length === 1) return;
                rows.forEach((cells) => cells.splice(c, 1));
                alignments.splice(c, 1);
                commit(rows);
              },
            ],
            ...(["Left", "Center", "Right"] as const).map((label): [string, () => void] => [
              `Align ${label.toLowerCase()}`,
              () => {
                alignments[c] = label === "Left" ? ":---" : label === "Right" ? "---:" : ":---:";
                commit(rows);
              },
            ]),
          ];
          rows[r][c] = input.value;
          for (const [label, action] of actions) {
            const button = document.createElement("button");
            button.className = "cm-prose-table-menu-item";
            button.textContent = label;
            button.disabled =
              view.state.readOnly ||
              (label === "Delete row" && r === 0) ||
              (label === "Delete column" && row.length === 1);
            button.onmousedown = (e) => e.preventDefault();
            button.onclick = () => {
              menu.remove();
              action();
            };
            menu.append(button);
          }
          document.body.append(menu);
          const dismiss = (e: Event) => {
            if (!menu.contains(e.target as Node)) {
              menu.remove();
              document.removeEventListener("pointerdown", dismiss);
            }
          };
          document.addEventListener("pointerdown", dismiss);
        };
        const preview = renderCellPreview(value);
        preview.className = "cm-prose-table-cell-preview";
        preview.onclick = () => focusTableCell(input);
        cell.ondblclick = (event) => {
          if ((event.target as HTMLElement).closest("a")) return;
          focusTableCell(input);
          input.select();
        };
        cell.append(preview, input);
        tr.append(cell);
      });
      const section = r === 0 ? table.createTHead() : table.tBodies[0] || table.createTBody();
      section.append(tr);
    });
    wrap.append(table);
    return wrap;
  }
  ignoreEvent() {
    return true;
  }
}

function mediaDecorations(state: EditorState): DecorationSet {
  const ranges: Range<Decoration>[] = [];
  const tree = ensureSyntaxTree(state, state.doc.length, 100) || syntaxTree(state);
  tree.iterate({
    enter(node) {
      if (node.name === "Table") {
        ranges.push(
          Decoration.replace({
            widget: new TableWidget(state.sliceDoc(node.from, node.to), node.from, node.to),
            block: true,
          }).range(node.from, node.to),
        );
        return false;
      }
      if (node.name === "Paragraph") {
        const source = state.sliceDoc(node.from, node.to);
        const match = new RegExp(`^(?:${proseImagePattern.source})$`).exec(source);
        const selection = state.selection.main;
        const reference = match?.[2];
        const url = reference?.startsWith("data:")
          ? reference
          : reference
            ? state.field(proseImagesField, false)?.[reference]
            : undefined;
        if (match && url?.startsWith("data:image/") && !(selection.from > node.from && selection.from < node.to)) {
          ranges.push(
            Decoration.replace({ widget: new ImageWidget(url, match[1], node.from, node.to), block: true }).range(
              node.from,
              node.to,
            ),
          );
          return false;
        }
      }
    },
  });
  return Decoration.set(ranges, true);
}

export const proseMedia = StateField.define<DecorationSet>({
  create: mediaDecorations,
  update(value, tr) {
    return tr.docChanged || tr.selection || tr.effects.some((effect) => effect.is(setProseImages))
      ? mediaDecorations(tr.state)
      : value;
  },
  provide: (field) => EditorView.decorations.from(field),
});
