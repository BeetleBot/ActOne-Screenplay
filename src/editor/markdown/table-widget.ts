import { syntaxTree } from '@codemirror/language';
import type { SyntaxNode } from '@lezer/common';
import {
  Facet,
  Prec,
  StateField,
  type EditorState,
  type Extension,
} from '@codemirror/state';
import {
  Decoration,
  EditorView,
  WidgetType,
  keymap,
} from '@codemirror/view';

// Clean, rock-solid Markdown Table Syntax, Ghost Suggestions & Alignment on Navigation/Blur.
//
// Invariants:
// 1. In a new line after table, only ONE inactive '|' ghost suggestion is shown next to cursor.
// 2. Pressing Tab makes it active ('| '), places cursor past it, and reveals the next single inactive '|'.
// 3. On the final column of the row, pressing Tab automatically does Enter+Tab (starts new row with '| ').
// 4. On cell exit (Tab navigation or clicking away to another cell/outside), the table automatically
//    fits and formats column widths so columns align cleanly across all rows.

class TableGhostWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  eq(other: TableGhostWidget) {
    return other.text === this.text;
  }
  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-ghost-text';
    span.textContent = this.text;
    span.style.opacity = '0.35';
    span.style.pointerEvents = 'none';
    span.style.fontFamily = 'inherit';
    return span;
  }
  ignoreEvent() {
    return true;
  }
}

interface TableSuggestion {
  text: string;
  pos: number;
  isLastPipeOfRow: boolean;
}

export function splitRowCells(line: string): string[] {
  let s = line.trim();
  if (s.startsWith('|')) s = s.slice(1);
  if (s.endsWith('|')) s = s.slice(0, -1);

  const cells: string[] = [];
  let buf = '';
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\' && i + 1 < s.length) {
      buf += ch + s[i + 1];
      i++;
      continue;
    }
    if (ch === '|') {
      cells.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  cells.push(buf.trim());
  return cells;
}

// Count unescaped pipes in a line
function countPipes(text: string): number {
  let pipes = 0;
  let inEscape = false;
  for (let i = 0; i < text.length; i++) {
    if (inEscape) {
      inEscape = false;
      continue;
    }
    if (text[i] === '\\') {
      inEscape = true;
      continue;
    }
    if (text[i] === '|') pipes++;
  }
  return pipes;
}

// Calculate max width per column for a table
export function getTableColumnWidths(lines: string[]): number[] {
  let maxCols = 0;
  const parsedRows: string[][] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    const cells = splitRowCells(trimmed);
    parsedRows.push(cells);
    if (cells.length > maxCols) maxCols = cells.length;
  }

  if (maxCols === 0) return [];

  const colWidths: number[] = new Array(maxCols).fill(3);

  parsedRows.forEach((row, rowIdx) => {
    if (rowIdx === 1) return; // delimiter row
    row.forEach((cell, cIdx) => {
      const len = cell.length;
      if (len > colWidths[cIdx]) {
        colWidths[cIdx] = len;
      }
    });
  });

  return colWidths;
}

// Format a single markdown table text so columns and pipes match
export function formatTableMarkdown(tableText: string): string {
  const lines = tableText.split('\n');
  if (lines.length < 2) return tableText;

  const colWidths = getTableColumnWidths(lines);
  if (colWidths.length === 0) return tableText;

  const formattedLines = lines.map((line, rowIdx) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return line;
    const cells = splitRowCells(trimmed);

    if (rowIdx === 1 && cells.every((c) => c.replace(/:/g, '').replace(/-/g, '') === '')) {
      // Delimiter row
      const delimCells = colWidths.map((w, cIdx) => {
        const rawCell = cells[cIdx] ?? '---';
        const isLeft = rawCell.startsWith(':');
        const isRight = rawCell.endsWith(':');
        const count = Math.max(3, w);
        if (isLeft && isRight) return ':' + '-'.repeat(Math.max(1, count - 2)) + ':';
        if (isLeft) return ':' + '-'.repeat(Math.max(2, count - 1));
        if (isRight) return '-'.repeat(Math.max(2, count - 1)) + ':';
        return '-'.repeat(count);
      });
      return '| ' + delimCells.join(' | ') + ' |';
    }

    const paddedCells = colWidths.map((w, cIdx) => {
      const cellText = cells[cIdx] ?? '';
      return cellText.padEnd(w, ' ');
    });
    return '| ' + paddedCells.join(' | ') + ' |';
  });

  return formattedLines.join('\n');
}

// Format table under cursor command
export function formatActiveTable(view: EditorView, targetPos?: number): boolean {
  const { state } = view;
  const sel = state.selection.main;
  const pos = targetPos ?? sel.head;
  const tree = syntaxTree(state);
  let tableNode: SyntaxNode | null = null;

  tree.iterate({
    from: pos > 0 ? pos - 1 : 0,
    to: pos,
    enter: (n) => {
      if (n.name === 'Table') tableNode = n.node;
    },
  });

  if (!tableNode) return false;

  const tNode = tableNode as SyntaxNode;
  const originalText = state.doc.sliceString(tNode.from, tNode.to);
  const formattedText = formatTableMarkdown(originalText);

  if (originalText !== formattedText) {
    const headOffsetInTable = sel.head - tNode.from;
    view.dispatch({
      changes: { from: tNode.from, to: tNode.to, insert: formattedText },
      selection: { anchor: Math.min(tNode.from + headOffsetInTable, tNode.from + formattedText.length) },
    });
    return true;
  }
  return false;
}

// ---- Single Ghost Pipe Suggestion ------------------------------------

function getTableGhostSuggestion(state: EditorState): TableSuggestion | null {
  const sel = state.selection.main;
  if (!sel.empty) return null;

  const line = state.doc.lineAt(sel.head);
  if (sel.head !== line.to) return null;
  if (line.number === 1) return null;

  const prevLine = state.doc.line(line.number - 1);
  const prevText = prevLine.text.trim();

  if (prevText.startsWith('|') && prevText.endsWith('|')) {
    const tree = syntaxTree(state);
    let isTable = false;

    tree.iterate({
      from: prevLine.from,
      to: prevLine.to,
      enter: (n) => {
        if (n.name === 'Table') isTable = true;
      },
    });

    if (isTable) {
      const prevPipes = countPipes(prevText);
      const currentPipes = countPipes(line.text);

      if (currentPipes < prevPipes) {
        const isFirstPipeOfLine = currentPipes === 0;
        const isClosingPipe = currentPipes === prevPipes - 1;

        // Show only ONE inactive '|' right next to cursor
        let suggestionText = '|';
        if (!isFirstPipeOfLine && !line.text.endsWith(' ') && !line.text.endsWith('|')) {
          suggestionText = ' |';
        }

        return {
          text: suggestionText,
          pos: line.to,
          isLastPipeOfRow: isClosingPipe,
        };
      }
    }
  }
  return null;
}

const tableGhostField = StateField.define<TableSuggestion | null>({
  create: (state) => getTableGhostSuggestion(state),
  update: (value, tr) => {
    if (tr.docChanged || tr.selection) {
      return getTableGhostSuggestion(tr.state);
    }
    return value;
  },
  provide: (f) =>
    EditorView.decorations.from(f, (suggestion) => {
      if (!suggestion) return Decoration.none;
      return Decoration.set([
        Decoration.widget({
          widget: new TableGhostWidget(suggestion.text),
          side: 1,
        }).range(suggestion.pos),
      ]);
    }),
});

const acceptTableGhost = (view: EditorView) => {
  const suggestion = view.state.field(tableGhostField, false);
  if (suggestion) {
    if (suggestion.isLastPipeOfRow) {
      // Last pipe of the row -> close row with '|'
      const insertText = (suggestion.text.startsWith(' ') ? ' ' : '') + '|\n| ';
      view.dispatch({
        changes: { from: suggestion.pos, insert: insertText },
        selection: { anchor: suggestion.pos + insertText.length },
      });
      // Format the completed row above
      const prevLinePos = suggestion.pos;
      formatActiveTable(view, prevLinePos);
      return true;
    } else {
      // Normal pipe -> activate this single '| ' and place cursor right after it
      const insertText = suggestion.text + (suggestion.text.endsWith(' ') ? '' : ' ');
      view.dispatch({
        changes: { from: suggestion.pos, insert: insertText },
        selection: { anchor: suggestion.pos + insertText.length },
      });
      return true;
    }
  }
  return false;
};

// ---- Keymap & Navigation --------------------------------------------

const tabNavigation = (dir: 1 | -1) => (view: EditorView) => {
  const { state } = view;
  const sel = state.selection.main;
  if (!sel.empty) return false;

  // Format table columns to fit content when pressing Tab to exit/switch cell
  formatActiveTable(view);

  const freshState = view.state;
  const freshSel = freshState.selection.main;
  const tree = syntaxTree(freshState);
  let tableNode: SyntaxNode | null = null;
  tree.iterate({
    from: freshSel.head > 0 ? freshSel.head - 1 : 0,
    to: freshSel.head,
    enter: (n) => {
      if (n.name === 'Table') tableNode = n.node;
    },
  });

  if (!tableNode) return false;

  const tNode = tableNode as SyntaxNode;
  const tableText = freshState.doc.sliceString(tNode.from, tNode.to);
  const pipes: number[] = [];
  let inEscape = false;

  for (let i = 0; i < tableText.length; i++) {
    if (inEscape) {
      inEscape = false;
      continue;
    }
    if (tableText[i] === '\\') {
      inEscape = true;
      continue;
    }
    if (tableText[i] === '|') {
      pipes.push(tNode.from + i);
    }
  }

  if (pipes.length === 0) return false;

  let prevPipe = -1;
  let nextPipe = -1;
  for (const p of pipes) {
    if (p < freshSel.head) prevPipe = p;
    if (p > freshSel.head && nextPipe === -1) nextPipe = p;
  }

  if (dir === 1) {
    if (nextPipe !== -1) {
      view.dispatch({ selection: { anchor: nextPipe + 1 } });
      return true;
    } else {
      // Reached the absolute end of the table. Automatic Enter + Tab: new row with '| '
      const newRowStart = '\n| ';
      view.dispatch({
        changes: { from: tNode.to, insert: newRowStart },
        selection: { anchor: tNode.to + newRowStart.length },
      });
      return true;
    }
  } else {
    if (prevPipe !== -1) {
      if (freshSel.head === prevPipe + 1 || freshSel.head === prevPipe + 2) {
        const prevPrevIndex = pipes.indexOf(prevPipe) - 1;
        if (prevPrevIndex >= 0) {
          view.dispatch({ selection: { anchor: pipes[prevPrevIndex] + 1 } });
          return true;
        }
      } else {
        view.dispatch({ selection: { anchor: prevPipe + 1 } });
        return true;
      }
    }
  }

  return false;
};

// Selection listener: format table when cursor clicks / navigates to another cell or outside
const tableBlurFormatField = EditorView.updateListener.of((update) => {
  if (update.selectionSet && !update.docChanged) {
    const prevHead = update.startState.selection.main.head;
    const curHead = update.state.selection.main.head;
    if (prevHead !== curHead && prevHead <= update.startState.doc.length) {
      const prevLineText = update.startState.doc.lineAt(prevHead).text;
      if (!prevLineText.includes('|')) return;

      // Check if previous position was in a table
      const tree = syntaxTree(update.startState);
      let prevTable: SyntaxNode | null = null;
      tree.iterate({
        from: prevHead > 0 ? prevHead - 1 : 0,
        to: prevHead,
        enter: (n) => {
          if (n.name === 'Table') prevTable = n.node;
        },
      });

      if (prevTable) {
        // Format the table that was just modified/exited
        setTimeout(() => {
          if (update.view.dom.isConnected) {
            formatActiveTable(update.view, prevHead);
          }
        }, 10);
      }
    }
  }
});

// ---- Extension Export -----------------------------------------------

export interface TablesConfig {
  onLinkClick?: (url: string) => void;
}

const defaultLinkOpener = (url: string): void => {
  try {
    window.open(url, '_blank', 'noopener,noreferrer');
  } catch {}
};

export const tableLinkClickFacet = Facet.define<
  (url: string) => void,
  (url: string) => void
>({
  combine: (values) => values[0] ?? defaultLinkOpener,
});

export function tables(config: TablesConfig = {}): Extension {
  return [
    tableGhostField,
    tableBlurFormatField,
    ...(config.onLinkClick ? [tableLinkClickFacet.of(config.onLinkClick)] : []),
    Prec.high(
      keymap.of([
        { key: 'Tab', run: acceptTableGhost },
        { key: 'Tab', run: tabNavigation(1) },
        { key: 'Shift-Tab', run: tabNavigation(-1) },
      ]),
    ),
  ];
}
