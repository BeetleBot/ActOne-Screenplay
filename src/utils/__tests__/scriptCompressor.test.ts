import { describe, it, expect } from 'vitest';
import { compressSceneToStructuredText, detectQueryIntent, formatCompactIndex, buildScreenplayContext } from '../scriptCompressor';
import { FountainDocument, LineType } from '../../parser/FountainParser';
import { ScreenplayIndex, SceneIndexEntry } from '../sceneIndexer';

describe('scriptCompressor', () => {
  const sampleDoc: FountainDocument = {
    lines: [
      { type: LineType.heading, text: 'INT. COFFEE SHOP - DAY', sceneNumber: '1' },
      { type: LineType.action, text: 'John walks in, looking exhausted after a long sleepless night. He sits down at the counter and checks his watch repeatedly.' },
      { type: LineType.character, text: 'JOHN' },
      { type: LineType.parenthetical, text: '(whispering)' },
      { type: LineType.dialogue, text: 'I need coffee. Strong.' },
      { type: LineType.character, text: 'WAITRESS' },
      { type: LineType.dialogue, text: 'Coming right up, honey. Just give me one minute.' },
    ],
    titlePage: [],
    pageBreaks: [],
    dualDialogues: [],
    screenplayText: '',
  };

  const sampleScenes: SceneIndexEntry[] = [
    {
      id: 1,
      heading: 'INT. COFFEE SHOP - DAY',
      startLine: 1,
      endLine: 7,
      sceneNumber: '1',
      characters: ['JOHN', 'WAITRESS'],
    },
    {
      id: 2,
      heading: 'EXT. STREET - NIGHT',
      startLine: 8,
      endLine: 11,
      sceneNumber: '2',
      characters: ['MARY'],
    },
  ];

  const sampleIndex: ScreenplayIndex = {
    totalScenes: 2,
    totalLines: 11,
    characters: ['JOHN', 'MARY', 'WAITRESS'],
    scenes: sampleScenes,
  };

  it('compresses scene to structured format with significant token/character savings', () => {
    const compressed = compressSceneToStructuredText(sampleDoc, sampleScenes[0]);

    expect(compressed).toContain('S1|INT. COFFEE SHOP - DAY|JOHN,WAITRESS');
    expect(compressed).toContain('A:John walks in, looking exhausted after a long sleepless night. He sits down at the counter and checks his watch repeatedly.');
    expect(compressed).toContain('JOHN:(whispering) I need coffee. Strong.');
    expect(compressed).toContain('WAITRESS:Coming right up, honey. Just give me one minute.');
    
    // Heading lines and character cue lines are consolidated into prefixes
    expect(compressed.split('\n').length).toBe(4);
  });

  it('detects character filter intent when prompt asks about a character', () => {
    const intent = detectQueryIntent('Tell me about John and what he does', sampleIndex);
    expect(intent.reason).toBe('character_filter');
    expect(intent.matchedCharacters).toEqual(['JOHN']);
    expect(intent.targetSceneIds).toEqual([1]);
  });

  it('detects scene numbers when prompt mentions scene 2', () => {
    const intent = detectQueryIntent('What happens in scene 2?', sampleIndex);
    expect(intent.reason).toBe('scene_numbers');
    expect(intent.targetSceneIds).toEqual([2]);
  });

  it('detects scene ranges (e.g. scenes 1 to 2)', () => {
    const intent = detectQueryIntent('Summarize scenes 1 to 2', sampleIndex);
    expect(intent.reason).toBe('scene_numbers');
    expect(intent.targetSceneIds).toEqual([1, 2]);
  });

  it('detects cursor active scene keyword', () => {
    const intent = detectQueryIntent('What do you think of this scene?', sampleIndex, 3);
    expect(intent.reason).toBe('cursor');
    expect(intent.targetSceneIds).toEqual([1]);
  });

  it('formats compact index cleanly', () => {
    const compact = formatCompactIndex(sampleIndex);
    expect(compact).toContain('SCREENPLAY INDEX (2 Scenes');
    expect(compact).toContain('S1 (L1-7): INT. COFFEE SHOP - DAY [Chars: JOHN, WAITRESS]');
    expect(compact).toContain('S2 (L8-11): EXT. STREET - NIGHT [Chars: MARY]');
  });

  it('builds dynamic context with targeted character scenes', () => {
    const context = buildScreenplayContext(sampleDoc, sampleIndex, 'Read only scenes with Mary');
    expect(context).toContain('SCENES WITH MARY');
    expect(context).toContain('S2|EXT. STREET - NIGHT|MARY');
    expect(context).not.toContain('S1|INT. COFFEE SHOP - DAY');
  });
});
