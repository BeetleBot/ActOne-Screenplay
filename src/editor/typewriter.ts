import { Compartment } from "@codemirror/state";
import { ViewPlugin, ViewUpdate, EditorView } from "@codemirror/view";
import { getScriptSwitchToken } from "./useCoreCodeMirror";

export const typewriterCompartment = new Compartment();

let lastPointerInteractionTime = 0;

export const typewriterScrollPlugin = ViewPlugin.fromClass(
  class {
    scheduled = false;

    update(update: ViewUpdate) {
      if (!(update.docChanged || update.selectionSet)) return;
      if (!update.state.selection.main.empty) return;
      
      const isPointerEvent = update.transactions.some(tr => 
        tr.isUserEvent("select.pointer") || 
        tr.isUserEvent("select.drop") ||
        tr.isUserEvent("input.drop") ||
        tr.isUserEvent("drop")
      );
      if (isPointerEvent) return;

      if (Date.now() - lastPointerInteractionTime < 400) return;

      if (this.scheduled) return;
      this.scheduled = true;
      
      const token = getScriptSwitchToken();
      const view = update.view;
      
      requestAnimationFrame(() => {
        this.scheduled = false;
        if (getScriptSwitchToken() !== token) return;
        if (!view.state.selection.main.empty) return;
        if (Date.now() - lastPointerInteractionTime < 400) return;
        
        view.dispatch({
          effects: EditorView.scrollIntoView(view.state.selection.main.head, { y: "center" })
        });
      });
    }
  },
  {
    eventHandlers: {
      pointerdown: () => {
        lastPointerInteractionTime = Date.now();
      },
      mousedown: () => {
        lastPointerInteractionTime = Date.now();
      },
      contextmenu: () => {
        lastPointerInteractionTime = Date.now();
      },
    }
  }
);
