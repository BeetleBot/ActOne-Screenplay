import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { foldEffect, unfoldEffect, foldedRanges, foldAll, unfoldAll } from '@codemirror/language';
import { lineTypesField, fountainHighlightPlugin } from '../../src/editor/fountainSyntax';
import { fountainFoldService, fountainFoldTogglePlugin, fountainFoldCodeExtension, getFountainFoldRange } from '../../src/editor/fountainFold';
import { getStructureLinesExtension, getStructureLinesInner, structureLinesCompartment } from '../../src/editor/structureLines';

interface Results { passed: string[]; error?: string; done: boolean }
const results: Results = { passed: [], done: false };
Object.assign(window, { structureResults: results });
const errors: string[] = [];
const originalError = console.error;
console.error = (...args: unknown[]) => { errors.push(args.map(String).join(' ')); originalError(...args); };
window.addEventListener('error', e => errors.push(e.message));
window.addEventListener('unhandledrejection', e => errors.push(String(e.reason)));
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const settle = () => new Promise(resolve => setTimeout(resolve, 120));
const paper = document.querySelector<HTMLElement>('#paper')!;
const text = '# ACT I\n\n## SEQ A\n\nINT. ROOM - DAY\n\nAction in room.\n\n## SEQ B\n\nEXT. PARK - DAY\n\nAction in park.\n\n# ACT II\n\nINT. OFFICE - NIGHT\n\nEnd.';
function create(folds: boolean) {
  return new EditorView({ parent: paper, state: EditorState.create({ doc: text, extensions: [
    lineTypesField, fountainHighlightPlugin, EditorView.lineWrapping,
    ...(folds ? [fountainFoldService, fountainFoldCodeExtension, fountainFoldTogglePlugin] : []),
    getStructureLinesExtension(false),
  ] }) });
}
function headingLeft(view: EditorView, heading: string) {
  const line = [...view.dom.querySelectorAll('.cm-line')].find(el => el.textContent === heading || el.textContent?.endsWith(heading));
  check(line, `Missing heading ${heading}`);
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const offset = node.textContent?.indexOf(heading) ?? -1;
    if (offset < 0) continue;
    const range = document.createRange(); range.setStart(node, offset); range.setEnd(node, offset + heading.length);
    return range.getBoundingClientRect().left;
  }
  throw new Error(`Missing text node ${heading}`);
}
function rails(view: EditorView) { return [...view.dom.querySelectorAll<HTMLElement>('.cm-structure-line')]; }
async function run() {
  await document.fonts.ready;
  for (const zoom of [0.75, 1, 1.5, 2]) {
    paper.style.setProperty('--editor-zoom', String(zoom));
    const baseline = create(false); await settle();
    const baselineLeft = headingLeft(baseline, 'INT. ROOM - DAY'); baseline.destroy();
    const view = create(true); await settle();
    check(Math.abs(headingLeft(view, 'INT. ROOM - DAY') - baselineLeft) < 1, `Fold button shifts scene at zoom ${zoom}`);
    check(!rails(view).length, 'Disabled rails should not render');
    view.dispatch({ effects: structureLinesCompartment.reconfigure(getStructureLinesInner(true)) }); await settle();
    check(rails(view).length === 7, `Expected 7 scopes, got ${rails(view).length}`);
    check(Math.abs(headingLeft(view, 'INT. ROOM - DAY') - baselineLeft) < 1, 'Rails shift scene text');
    const left = view.scrollDOM.getBoundingClientRect().left;
    for (const [kind, offset] of [['section', -96], ['subsection', -88], ['scene', -80]] as const) {
      const rail = view.dom.querySelector<HTMLElement>(`.cm-structure-line-${kind}`)!;
      check(Math.abs(rail.getBoundingClientRect().left - left - offset * zoom) < 1, `${kind} rail not zoom-aligned`);
      check(rail.getBoundingClientRect().height > 0, `${kind} rail has no height`);
      const headingClass = kind === 'section' ? '.cm-fountain-section-1' : kind === 'subsection' ? '.cm-fountain-section-2' : '.cm-fountain-heading';
      check(rail.title === (kind === 'section' ? 'ACT I' : kind === 'subsection' ? 'SEQ A' : 'INT. ROOM - DAY'), 'Rail hover label is incorrect');
      const rect = rail.getBoundingClientRect();
      check(document.elementFromPoint(rect.left + rect.width / 2, rect.top + 5) === rail, `${kind} rail cannot receive hover`);
      const heading = view.dom.querySelector(headingClass)!;
      check(Math.abs(rail.getBoundingClientRect().top - heading.getBoundingClientRect().top - 4) < 1, `${kind} rail top is not aligned with heading`);
    }
    // The number width varies across scenes; controls must stay to its left.
    for (const number of ['0', '12', '123A', '12345678']) {
      const sceneLine = view.state.doc.line(5);
      view.dispatch({ changes: { from: sceneLine.from, to: sceneLine.to, insert: `INT. ROOM - DAY #${number}#` } });
      await settle();
      const heading = view.dom.querySelector<HTMLElement>('.cm-fountain-heading')!;
      const sceneRail = view.dom.querySelector<HTMLElement>('.cm-structure-line-scene')!;
      check(sceneRail.title === `${number} — INT. ROOM - DAY`, 'Scene hover label is stale or missing number');
      const button = heading.querySelector<HTMLElement>('.cm-fountain-fold-toggle')!;
      const pseudo = getComputedStyle(heading, '::before');
      const numberLeft = heading.getBoundingClientRect().right - Number.parseFloat(pseudo.right) - Number.parseFloat(pseudo.width);
      check(button.getBoundingClientRect().right <= numberLeft - 2 * zoom, `Fold icon overlaps scene number ${number} at zoom ${zoom}`);
    }
    for (const [selector, offset] of [['.cm-fountain-section-1', -72], ['.cm-fountain-section-2', -64]] as const) {
      const heading = view.dom.querySelector<HTMLElement>(selector)!;
      check(Math.abs(heading.getBoundingClientRect().left - left - offset * zoom) < 1, 'Section heading does not follow its rail');
      const button = heading.querySelector<HTMLElement>('.cm-fountain-fold-toggle')!;
      check(button.getBoundingClientRect().right < heading.getBoundingClientRect().left, 'Section control overlaps heading');
    }
    const seqRange = getFountainFoldRange(view.state, 3)!;
    view.dispatch({ effects: foldEffect.of(seqRange) }); await settle();
    check(rails(view).length === 5, 'Collapsing sequence must hide its own and child rails');
    const actRange = getFountainFoldRange(view.state, 1)!;
    view.dispatch({ effects: foldEffect.of(actRange) }); await settle();
    check(rails(view).length === 2, 'Collapsing act must hide all its nested rails');
    view.dispatch({ effects: unfoldEffect.of(actRange) }); await settle();
    check(rails(view).length === 5, 'Expanding act must preserve nested sequence fold');
    view.dispatch({ effects: unfoldEffect.of(seqRange) }); await settle();
    check(rails(view).length === 7, 'Expanding sequence must restore all rails');
    foldAll(view); await settle();
    check(rails(view).length === 0, 'Fold all must hide every scope rail');
    unfoldAll(view); await settle();
    check(rails(view).length === 7 && foldedRanges(view.state).size === 0, 'Unfold all did not restore every scope');
    // Real DOM mouse interaction, including placeholder restoration.
    const sceneButton = view.dom.querySelector<HTMLElement>('.cm-fold-toggle-scene')!;
    sceneButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true })); await settle();
    check(foldedRanges(view.state).size === 1, 'Scene chevron did not fold');
    check(rails(view).length === 6, 'Folded scene rail remains visible');
    const badge = view.dom.querySelector<HTMLElement>('.cm-fountain-fold-placeholder')!;
    check(badge.textContent?.includes('line'), 'Missing collapsed line count');
    badge.click(); await settle();
    check(foldedRanges(view.state).size === 0 && rails(view).length === 7, 'Badge did not restore scene');
    view.dispatch({ effects: structureLinesCompartment.reconfigure(getStructureLinesInner(false)) }); await settle();
    check(!rails(view).length, 'Rails remain after disabling');
    check(Math.abs(view.dom.querySelector('.cm-fountain-section-1')!.getBoundingClientRect().left - baselineLeft) < 1, 'Disabled section does not align with scene');
    results.passed.push(`Rendering, margins, toggles and nested folding at ${zoom * 100}% zoom`);
    // Change zoom on a mounted editor: geometry updates must reposition rails.
    view.dispatch({ effects: structureLinesCompartment.reconfigure(getStructureLinesInner(true)) });
    paper.style.setProperty('--editor-zoom', String(zoom + 0.25));
    await settle();
    const liveRail = view.dom.querySelector<HTMLElement>('.cm-structure-line-scene')!;
    check(Math.abs(liveRail.getBoundingClientRect().left - view.scrollDOM.getBoundingClientRect().left + 80 * (zoom + 0.25)) < 1, 'Mounted editor rail did not follow zoom');
    view.destroy();
  }
  paper.style.setProperty('--editor-zoom', '1');
  const scrolling = create(true);
  const longText = '# ACT I\n\n## SEQ A\n\n' + Array.from({ length: 100 }, (_, i) => `INT. ROOM ${i} - DAY\n\nAction ${i}.\n\n`).join('') + '# ACT II\n\nEnd.';
  scrolling.dispatch({ changes: { from: 0, to: scrolling.state.doc.length, insert: longText }, effects: structureLinesCompartment.reconfigure(getStructureLinesInner(true)) });
  await settle();
  const area = document.querySelector<HTMLElement>('.editor-scroll-area')!;
  area.scrollTop = 1800;
  await settle();
  check(rails(scrolling).length > 0, 'Rails disappear after scrolling');
  check(rails(scrolling).length < 102, 'Offscreen scene rails were not culled');
  const sectionRail = scrolling.dom.querySelector<HTMLElement>('.cm-structure-line-section')!;
  check(sectionRail.getBoundingClientRect().top < area.getBoundingClientRect().top, 'Continuing act rail does not span scrolled viewport');
  const position = scrolling.state.doc.line(4).from;
  // A classification change in the visible DOM must remove the matching rail.
  area.scrollTop = 0;
  await settle();
  const before = rails(scrolling).length;
  scrolling.dispatch({ changes: { from: position, insert: 'x' } });
  await settle();
  check(rails(scrolling).length === before - 1, 'Scene rail remains after preceding blank line changes classification');
  scrolling.destroy();
  results.passed.push('Live zoom updates, long-document viewport culling and scrolling');
  check(errors.length === 0, errors.join('\n'));
}
run().catch(error => { results.error = String(error.stack || error); }).finally(() => { results.done = true; });
