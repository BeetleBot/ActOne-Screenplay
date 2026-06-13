import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import {
  AddIcon, CloseIcon, SearchIcon, SaveIcon, SettingsIcon,
  DeleteIcon, UndoIcon, ZoomInIcon, ZoomOutIcon, HelpOutlinedIcon,
  KeyboardArrowDownIcon, MoreVertIcon, BookmarkIcon
} from "./Icons";

const icons = [
  AddIcon, CloseIcon, SearchIcon, SaveIcon, SettingsIcon,
  DeleteIcon, UndoIcon, ZoomInIcon, ZoomOutIcon, HelpOutlinedIcon,
  KeyboardArrowDownIcon, MoreVertIcon, BookmarkIcon
];

describe("Icons", () => {
  for (const Icon of icons) {
    it(`${Icon.name || "Icon"} renders an SVG`, () => {
      const { container } = render(React.createElement(Icon));
      const svg = container.querySelector("svg");
      expect(svg).toBeTruthy();
    });
  }
});
