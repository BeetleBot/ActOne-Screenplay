import { parseScreenplay, LineType } from "../../parser";
import { useEffect, useRef, useState } from "react";
import { Alert, Box, LinearProgress, Typography } from "@mui/material";
import type { EditorView } from "@codemirror/view";
import type { PromptConfig } from "../../hooks/usePromptConfig";
import { nativeTransform, isUrAIDesktop, EMPTY_CONTEXT } from "../../lib/urai";
import { setRephraseRangeEffect } from "../../editor/rephraseState";

interface Proposal {
  source: string;
  from: number;
  to: number;
  revision: unknown;
  view: EditorView;
  operation: "rephrase" | "translate";
  instruction: string;
  language: string;
}

export function useUrAITransform(config: PromptConfig) {
  const [status, setStatus] = useState<{ proposal: Proposal; error?: string } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const serialRef = useRef(0);

  useEffect(() => () => {
    serialRef.current++;
    abortRef.current?.abort();
  }, []);

  const start = (
    view: EditorView,
    from: number,
    to: number,
    operation: "rephrase" | "translate",
    instruction = "",
    language = "",
  ) => {
    abortRef.current?.abort();
    const serial = ++serialRef.current;
    const proposal: Proposal = {
      view, from, to, source: view.state.doc.sliceString(from, to),
      revision: view.state.doc, operation, instruction, language,
    };
    setStatus({ proposal });
    view.dispatch({ effects: setRephraseRangeEffect.of({ from, to }) });
    void (async () => {
      if (!isUrAIDesktop()) {
        setStatus({ proposal, error: "UrAI writing actions run in the desktop app." });
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const lines = proposal.source.split("\n");
        const parsed = parseScreenplay(view.state.doc.toString());
        const firstLine = view.state.doc.lineAt(from).number - 1;
        const protectedTypes = new Set([LineType.character, LineType.dualDialogueCharacter, LineType.empty, LineType.pageBreak]);
        const elements = lines.flatMap((text, i) => {
          const kind = parsed.lines[firstLine + i]?.type;
          if (!text.trim() || (kind !== undefined && protectedTypes.has(kind))) return [];
          return [{ id: String(i), text, kind: String(kind ?? "text"), speaker: "" }];
        });
        if (!elements.length) throw new Error("Select dialogue, action, or prose to transform. Character cues and empty lines are preserved.");
        const replacements = await nativeTransform(config, operation, elements, {
          language,
          instructions: [instruction, operation === "translate" ? config.translatePrompt : "", "Preserve all Fountain/Markdown markers, character cues, line types and inline formatting exactly."].filter(Boolean).join("\n"),
          context: EMPTY_CONTEXT,
          signal: controller.signal,
        });
        if (serial !== serialRef.current || controller.signal.aborted) return;
        const byId = new Map(replacements.map((replacement) => [replacement.id, replacement.text]));
        const text = lines.map((line, i) => byId.get(String(i)) ?? line).join("\n");
        if (view.state.doc !== proposal.revision) throw new Error("The document changed while UrAI was working. The suggestion was not applied; select the text again.");
        const reconstructed = view.state.doc.sliceString(0, from) + text + view.state.doc.sliceString(to);
        const checked = parseScreenplay(reconstructed);
        for (let i = firstLine; i < firstLine + lines.length; i++) {
          if (parsed.lines[i]?.type !== checked.lines[i]?.type) throw new Error("This suggestion changed the document structure. Try a smaller selection.");
        }
        view.dispatch({ changes: { from, to, insert: text }, selection: { anchor: from + text.length }, effects: setRephraseRangeEffect.of({ from, to: from + text.length }) });
        view.focus();
        window.setTimeout(() => {
          if (!view.dom.isConnected) return;
          view.dispatch({ effects: setRephraseRangeEffect.of(null) });
        }, 1400);
        setStatus(null);
      } catch (error) {
        if (!controller.signal.aborted && serial === serialRef.current) {
          setStatus({ proposal, error: error instanceof Error ? error.message : String(error) });
          view.dispatch({ effects: setRephraseRangeEffect.of(null) });
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }
    })();
  };

  const dismiss = () => {
    serialRef.current++;
    abortRef.current?.abort();
    status?.proposal.view.dispatch({ effects: setRephraseRangeEffect.of(null) });
    setStatus(null);
  };

  const dialog = status && (
    <Box sx={{ position: "fixed", zIndex: 1400, left: "50%", bottom: 24, transform: "translateX(-50%)", width: "min(440px, calc(100vw - 32px))", p: 1.25, border: "1px solid", borderColor: "divider", borderRadius: 2, bgcolor: "background.paper", boxShadow: 6 }} role={status.error ? "alert" : "status"}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {status.error ? (status.proposal.operation === "translate" ? "Translation not applied" : "Rephrase not applied") : (status.proposal.operation === "translate" ? `Translating to ${status.proposal.language}…` : "Rephrasing with UrAI…")}
      </Typography>
      {status.error ? <><Alert severity="error" sx={{ mt: 0.75 }}>{status.error}</Alert><Box sx={{ textAlign: "right", mt: 0.5 }}><Typography component="button" onClick={dismiss} sx={{ border: 0, bgcolor: "transparent", color: "text.secondary", cursor: "pointer" }}>Dismiss</Typography></Box></> : <LinearProgress sx={{ mt: 1 }} />}
    </Box>
  );
  return { start, dialog };
}
