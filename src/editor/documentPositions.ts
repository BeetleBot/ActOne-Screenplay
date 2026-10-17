import { ChangeSet, Text, type ChangeDesc } from "@codemirror/state";
import DiffMatchPatch from "diff-match-patch";

interface Revision {
  before: Text;
  after: Text;
  changes: ChangeDesc;
}

/** Maps parsed sidebar locations through edits that have not reached the parser yet. */
export class DocumentPositions {
  private revisions: Revision[] = [];
  private texts = new WeakMap<Text, string>();
  constructor(private current: Text) {}

  record(before: Text, after: Text, changes: ChangeDesc): void {
    this.revisions.push({ before, after, changes });
    if (this.revisions.length > 128) this.revisions.shift();
    this.current = after;
  }

  private document(text: string): Text {
    const candidates = [
      this.current,
      ...this.revisions
        .slice()
        .reverse()
        .map((revision) => revision.before),
    ];
    for (const doc of candidates) {
      if (doc.length !== text.length) continue;
      let cached = this.texts.get(doc);
      if (cached === undefined) {
        cached = doc.toString();
        this.texts.set(doc, cached);
      }
      if (cached === text) return doc;
    }
    return Text.of(text.split("\n"));
  }

  private between(source: Text, target: Text): ChangeDesc {
    if (source === target) return ChangeSet.empty(source.length).desc;
    let current = source;
    let changes = ChangeSet.empty(source.length).desc;
    for (const revision of this.revisions) {
      if (revision.before !== current) continue;
      changes = changes.composeDesc(revision.changes);
      current = revision.after;
      if (current === target) return changes;
    }
    if (source.eq(target)) return ChangeSet.empty(source.length).desc;
    // Rare fallback after a long suspension or whole-document replacement.
    const diffs = new DiffMatchPatch().diff_main(source.toString(), target.toString());
    const edits: { from: number; to: number; insert: string }[] = [];
    let position = 0;
    for (const [kind, text] of diffs) {
      if (kind === 0) position += text.length;
      else if (kind === -1) {
        edits.push({ from: position, to: position + text.length, insert: "" });
        position += text.length;
      } else edits.push({ from: position, to: position, insert: text });
    }
    return ChangeSet.of(edits, source.length).desc;
  }

  mapper(sourceText: string, targetText?: string): (index: number) => number {
    const source = this.document(sourceText);
    const target = targetText === undefined ? this.current : this.document(targetText);
    const changes = this.between(source, target);
    return (index) => {
      const from = source.line(Math.max(1, Math.min(source.lines, index + 1))).from;
      return target.lineAt(changes.mapPos(from, 1)).number - 1;
    };
  }
}
