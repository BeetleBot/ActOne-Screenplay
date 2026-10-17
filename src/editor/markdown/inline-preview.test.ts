import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { inlinePreview } from './inline-preview';
import fs from 'fs';
import path from 'path';

describe('inlinePreview - HorizontalRule syntax (---)', () => {
  it('applies cm-prose-hr decoration to inactive horizontal rule lines and removes it when line is active', () => {
    const doc = 'First line\n\n---\n\nThird line';
    const view = new EditorView({
      state: EditorState.create({
        doc,
        selection: EditorSelection.cursor(0), // Cursor on line 1 (First line)
        extensions: [markdown({ base: markdownLanguage }), inlinePreview()],
      }),
    });

    const hrLine = view.state.doc.line(3);
    expect(hrLine.text).toBe('---');

    // Inactive state: cursor is on line 1, line 3 (---) should have cm-prose-hr decoration
    interface PluginWithDecorations {
      decorations: {
        between: (
          from: number,
          to: number,
          f: (from: number, to: number, deco: { spec?: { class?: string } }) => void,
        ) => void;
      };
    }

    const plugin = view.plugin((inlinePreview() as unknown as PluginWithDecorations[])[1]);
    expect(plugin).toBeDefined();

    const decos: Array<{ from: number; to: number; deco: { spec?: { class?: string } } }> = [];
    plugin?.decorations.between(0, view.state.doc.length, (from, to, deco) => {
      decos.push({ from, to, deco });
    });
    const hasHrClass = decos.some(d => d.deco?.spec?.class?.includes('cm-prose-hr'));
    expect(hasHrClass).toBe(true);

    // Active state: simulate focus and move cursor to line 3 (---)
    Object.defineProperty(view, 'hasFocus', { get: () => true, configurable: true });
    view.dispatch({
      selection: EditorSelection.cursor(hrLine.from),
    });

    const activePlugin = view.plugin((inlinePreview() as unknown as PluginWithDecorations[])[1]);
    const activeDecos: Array<{ from: number; to: number; deco: { spec?: { class?: string } } }> = [];
    activePlugin?.decorations.between(0, view.state.doc.length, (from, to, deco) => {
      activeDecos.push({ from, to, deco });
    });
    const hasHrClassActive = activeDecos.some(d => d.deco?.spec?.class?.includes('cm-prose-hr'));
    expect(hasHrClassActive).toBe(false);

    view.destroy();
  });

  it('ensures prose-editor.css styles hr with a single line pseudo-element and no duplicate border-top on line container', () => {
    const cssPath = path.resolve(__dirname, '../../prose-editor.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // ::after should define the horizontal rule border
    expect(css).toMatch(/\.cm-line\.cm-prose-hr::after\s*\{[^}]*border-top:/);

    // .cm-line.cm-prose-hr itself must NOT have a border-top (which would cause a double line)
    const lineRuleMatch = css.match(/\.cm-line\.cm-prose-hr\s*\{([^}]+)\}/g);
    expect(lineRuleMatch).toBeDefined();

    lineRuleMatch?.forEach((rule) => {
      expect(rule).not.toContain('border-top');
    });
  });
});
