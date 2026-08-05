import { Compartment } from "@codemirror/state";
import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";
import { getScriptSwitchToken } from "./useCodeMirror";

export const typewriterCompartment = new Compartment();

export const typewriterScrollPlugin = ViewPlugin.fromClass(
  class {
    scheduled = false;

    update(update: ViewUpdate) {
      if (!(update.docChanged || update.selectionSet)) return;
      if (!update.state.selection.main.empty) return;
      
      // If the selection change was caused by a mouse click (pointer event),
      // we do not scroll to center. This prevents jarring jumps when clicking.
      const isPointerEvent = update.transactions.some(tr => tr.isUserEvent("select.pointer"));
      if (isPointerEvent) return;

      if (this.scheduled) return;
      this.scheduled = true;
      
      const token = getScriptSwitchToken();
      const view = update.view;
      
      requestAnimationFrame(() => {
        this.scheduled = false;
        if (getScriptSwitchToken() !== token) return;
        if (!view.state.selection.main.empty) return;
        
        view.dispatch({
          effects: EditorView.scrollIntoView(view.state.selection.main.head, { y: "center" })
        });
      });
    }
  }
);
