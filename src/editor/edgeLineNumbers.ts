import { EditorView, ViewPlugin } from "@codemirror/view";

// Keep the native gutter's vertical measurements, but anchor its horizontal
// position to the workspace rather than the centered screenplay paper.
export const edgeLineNumbers = ViewPlugin.fromClass(class {
  private observer: ResizeObserver;
  constructor(private view: EditorView) {
    this.observer = new ResizeObserver(() => this.measure());
    this.observer.observe(view.dom);
    const workspace = view.dom.closest(".editor-scroll-area");
    if (workspace) this.observer.observe(workspace);
    this.measure();
  }
  update() { this.measure(); }
  measure() {
    this.view.requestMeasure({
      key: this,
      read: view => {
        const workspace = view.dom.closest(".editor-scroll-area");
        return workspace ? workspace.getBoundingClientRect().left - view.scrollDOM.getBoundingClientRect().left + 6 : 0;
      },
      write: offset => this.view.dom.style.setProperty("--line-number-edge", `${offset}px`),
    });
  }
  destroy() { this.observer.disconnect(); }
});
