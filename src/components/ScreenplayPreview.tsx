import React from "react";
import { useScreenplay } from "../context/ScreenplayContext";
import { LineType, ParsedLine } from "../parser/FountainParser";

export const ScreenplayPreview: React.FC = () => {
  const { parsedDoc, paperSize, fontFamily } = useScreenplay();

  const titlePageLines = parsedDoc.lines.filter(
    (l) => l.type >= LineType.titlePageTitle && l.type <= LineType.titlePageUnknown
  );

  const scriptLines = parsedDoc.lines.filter(
    (l) => !(l.type >= LineType.titlePageTitle && l.type <= LineType.titlePageUnknown)
  );

  const pages: ParsedLine[][] = [];
  let currentPage: ParsedLine[] = [];
  let lineCount = 0;

  scriptLines.forEach((line) => {
    if (line.type === LineType.synopse || line.type === LineType.section) {
      return;
    }

    if (line.type === LineType.pageBreak) {
      if (currentPage.length > 0) {
        pages.push(currentPage);
        currentPage = [];
        lineCount = 0;
      }
      return;
    }

    currentPage.push(line);
    lineCount++;

    if (lineCount >= 54) {
      pages.push(currentPage);
      currentPage = [];
      lineCount = 0;
    }
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

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
          {date && <p className="title-page-date">{date}</p>}
          {contact && <p className="title-page-contact">{contact}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="preview-workspace-container">
      {renderTitlePage()}
      {pages.map((page, pageIdx) => (
        <div key={pageIdx} className={`preview-page paper-${paperSize} font-${fontFamily}`}>
          <div className="preview-page-header">
            <span className="preview-page-number">{pageIdx + 1}.</span>
          </div>
          <div className="preview-page-content">
            {page.map((line) => {
              if (line.type === LineType.empty) {
                return <div key={line.id} className="preview-empty-line">&nbsp;</div>;
              }

              return (
                <div key={line.id} className={`preview-line ${getLineClassName(line.type)}`}>
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
