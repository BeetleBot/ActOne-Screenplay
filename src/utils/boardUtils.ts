import { ParsedLine, LineType } from "../parser";

export interface ScriptBlock {
  type: 'section' | 'subsection' | 'scene' | 'preamble';
  id: string;
  titleLine: ParsedLine;
  synopsisLine?: ParsedLine;
  lines: ParsedLine[];
}

export function parseBlocks(lines: ParsedLine[]): ScriptBlock[] {
  const blocks: ScriptBlock[] = [];
  
  let currentBlock: ScriptBlock = {
    type: 'preamble',
    id: 'preamble',
    titleLine: { id: 'preamble', text: '', type: LineType.empty, isOutlineElement: false },
    lines: []
  };
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isSection = line.type === LineType.section;
    const isHeading = line.type === LineType.heading;
    
    if (isSection) {
      const depth = line.sectionDepth || 0;
      if (depth === 1) {
        if (currentBlock.type !== 'preamble' || currentBlock.lines.length > 0 || currentBlock.titleLine.text !== '') {
          blocks.push(currentBlock);
        }
        currentBlock = {
          type: 'section',
          id: line.id,
          titleLine: line,
          lines: []
        };
      } else if (depth === 2) {
        if (currentBlock.type !== 'preamble' || currentBlock.lines.length > 0 || currentBlock.titleLine.text !== '') {
          blocks.push(currentBlock);
        }
        currentBlock = {
          type: 'subsection',
          id: line.id,
          titleLine: line,
          lines: []
        };
      } else {
        currentBlock.lines.push(line);
      }
    } else if (isHeading) {
      if (currentBlock.type !== 'preamble' || currentBlock.lines.length > 0 || currentBlock.titleLine.text !== '') {
        blocks.push(currentBlock);
      }
      currentBlock = {
        type: 'scene',
        id: line.id,
        titleLine: line,
        lines: []
      };
    } else if (line.type === LineType.synopse) {
      if (!currentBlock.synopsisLine) {
        currentBlock.synopsisLine = line;
      } else {
        currentBlock.lines.push(line);
      }
    } else {
      currentBlock.lines.push(line);
    }
  }
  
  blocks.push(currentBlock);
  return blocks.filter(b => b.type !== 'preamble' || b.lines.length > 0 || b.titleLine.text !== '');
}

export function serializeBlocks(blocks: ScriptBlock[]): string {
  const lines: string[] = [];
  for (const block of blocks) {
    if (block.type !== 'preamble' && block.titleLine.text) {
      lines.push(block.titleLine.text);
    }
    if (block.synopsisLine && block.synopsisLine.text) {
      lines.push(block.synopsisLine.text);
    }
    for (const l of block.lines) {
      lines.push(l.text);
    }
  }
  return lines.join("\n");
}
