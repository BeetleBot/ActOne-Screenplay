import React, { useMemo } from "react";
import { useAppContext } from "../context/AppContext";
import { LineType, ParsedLine } from "../parser/FountainParser";

interface PageBlock {
  lines: ParsedLine[];
  moreDialogue: boolean;
}

const MAX_LINES: Record<string, number> = {
  letter: 50,
  a4: 54,
};

export const ScreenplayPreview: React.FC = () => {
  const { parsedDoc, paperSize, fontFamily } = useAppContext();

  const maxLines = MAX_LINES[paperSize] || 53;

  const titlePageLines = parsedDoc.lines.filter(
    (l) => l.type >= LineType.titlePageTitle && l.type <= LineType.titlePageUnknown
  );

  const scriptLines = parsedDoc.lines.filter(
    (l) => !(l.type >= LineType.titlePageTitle && l.type <= LineType.titlePageUnknown)
  );

  const pages = useMemo(() => {
    const result: PageBlock[] = [];
    let currentPage: ParsedLine[] = [];
    let lineCount = 0;

    const isHeading = (line: ParsedLine) => line.type === LineType.heading || line.type === LineType.shot;

    const startNewPage = () => {
      if (currentPage.length > 0) {
        result.push({ lines: currentPage, moreDialogue: false });
        currentPage = [];
        lineCount = 0;
      }
    };

    for (let i = 0; i < scriptLines.length; i++) {
      const line = scriptLines[i];

      if (line.type === LineType.synopse || line.type === LineType.section) {
        continue;
      }

      if (line.type === LineType.pageBreak) {
        startNewPage();
        continue;
      }

      const isCharacterLine = line.type === LineType.character || line.type === LineType.dualDialogueCharacter;

      if (isHeading(line) && lineCount > 0) {
        const linesNeeded = 4;
        if (lineCount + linesNeeded >= maxLines) {
          startNewPage();
        }
      }

      if (isCharacterLine && lineCount > 0) {
        if (lineCount + 3 >= maxLines) {
          startNewPage();
        }
      }

      if (lineCount >= maxLines) {
        if (isCharacterLine) {
          startNewPage();
        } else if (line.type === LineType.parenthetical || line.type === LineType.dualDialogueParenthetical) {
          startNewPage();
        } else if (line.type === LineType.dialogue || line.type === LineType.dualDialogue) {
          if (currentPage.length > 0) {
            result.push({ lines: currentPage, moreDialogue: false });
            currentPage = [];
            lineCount = 0;

            const moreLine: ParsedLine = {
              id: "more",
              text: "(MORE)",
              type: LineType.character,
              isOutlineElement: false,
            };
            result[result.length - 1].moreDialogue = true;
            result[result.length - 1].lines.push(moreLine);

            const prevLine = scriptLines[i - 1];
            if (prevLine && (prevLine.type === LineType.character || prevLine.type === LineType.dualDialogueCharacter)) {
              currentPage.push({
                ...prevLine,
                text: prevLine.text + " (CONT'D)",
              });
              lineCount++;
            }
          }
        } else {
          startNewPage();
        }
      }

      currentPage.push(line);
      lineCount++;
    }

    if (currentPage.length > 0) {
      result.push({ lines: currentPage, moreDialogue: false });
    }

    return result;
  }, [scriptLines, maxLines]);

  const getLineClassName = (type: LineType) => {
    switch (type) {
      case LineType.heading:
        return "preview-heading";
      case LineType.action:
        return "preview-action";
      case LineType.character:
      case LineType.dualDialogueCharacter:
        return "preview-character";
      case LineType.parenthetical:
      case LineType.dualDialogueParenthetical:
        return "preview-parenthetical";
      case LineType.dialogue:
      case LineType.dualDialogue:
        return "preview-dialogue";
      case LineType.transitionLine:
        return "preview-transition";
      case LineType.centered:
        return "preview-centered";
      case LineType.lyrics:
        return "preview-lyrics";
      case LineType.shot:
        return "preview-shot";
      default:
        return "preview-text";
    }
  };

  const renderTitlePage = () => {
    if (titlePageLines.length === 0) return null;

    let title = "";
    let author = "";
    let credit = "";
    let source = "";
    let contact = "";
    let date = "";

    titlePageLines.forEach((l) => {
      const idx = l.text.indexOf(":");
      if (idx !== -1) {
        const key = l.text.substring(0, idx).trim().toLowerCase();
        const val = l.text.substring(idx + 1).trim();
        if (key === "title") title = val;
        else if (key === "author" || key === "authors") author = val;
        else if (key === "credit") credit = val;
        else if (key === "source") source = val;
        else if (key === "contact") contact = val;
        else if (key === "draft date" || key === "date") date = val;
      }
    });

    return (
      <div className={`preview-page paper-${paperSize} font-${fontFamily} title-page`}>
        <div className="title-page-center">
          {title && <h1 className="title-page-title">{title}</h1>}
          {credit && <p className="title-page-credit">{credit}</p>}
          {author && <p className="title-page-author">{author}</p>}
          {source && <p className="title-page-source">{source}</p>}
        </div>
        <div className="title-page-bottom">
          {contact && <p className="title-page-contact">{contact}</p>}
          {date && <p className="title-page-date">{date}</p>}
        </div>
      </div>
    );
  };

  const hasTitlePage = titlePageLines.length > 0;

  return (
    <div className="preview-workspace-container">
      {renderTitlePage()}
      {pages.map((page, pageIdx) => (
        <div key={pageIdx} className={`preview-page paper-${paperSize} font-${fontFamily}`}>
          {page.lines.some(l => l.id === "more") ? null : (
            <div className="preview-page-header">
              <span className="preview-page-number">
                {hasTitlePage ? pageIdx + 2 : pageIdx + 1}.
              </span>
            </div>
          )}
          <div className="preview-page-content">
            {page.lines.map((line, li) => {
              if (line.id === "more") {
                return (
                  <div key={li} className="preview-line preview-character">
                    (MORE)
                  </div>
                );
              }
              if (line.type === LineType.empty) {
                return <div key={line.id || li} className="preview-empty-line">&nbsp;</div>;
              }
              return (
                <div key={line.id || li} className={`preview-line ${getLineClassName(line.type)}`}>
                  {line.text}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
