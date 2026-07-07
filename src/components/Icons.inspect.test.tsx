import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import {
  AddIcon, BookmarkIcon, ArchiveIcon, AutoAwesomeIcon, CameraIcon,
  ContentCopyIcon, DeleteIcon, DescriptionIcon, DownloadIcon, FolderOpenIcon,
  LibraryBooksIcon, MoreHorizIcon, NoteAddIcon, SaveIcon, UploadIcon,
  SearchIcon, CloseIcon, CheckIcon, HomeIcon, PersonIcon
} from "./Icons";

describe("Icons - inspect rendered output", () => {
  it("AddIcon", () => {
    const { container } = render(React.createElement(AddIcon));
    const svg = container.querySelector("svg");
    const path = container.querySelector("path");
    console.log("AddIcon SVG:", svg?.outerHTML);
    console.log("AddIcon PATH:", path?.getAttribute("d"));
  });
  it("BookmarkIcon", () => {
    const { container } = render(React.createElement(BookmarkIcon));
    const path = container.querySelector("path");
    console.log("BookmarkIcon PATH:", path?.getAttribute("d"));
    const svg = container.querySelector("svg");
    console.log("BookmarkIcon fill attr:", svg?.getAttribute("fill"));
    console.log("BookmarkIcon computed fill:", window.getComputedStyle(svg as Element).fill);
    console.log("BookmarkIcon computed color:", window.getComputedStyle(svg as Element).color);
  });
});
