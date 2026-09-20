import { describe, it, expect, vi } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { extractTitlePage, buildTitlePage, TitlePageEditorModal } from "./TitlePageEditorModal";

const mockSetRawText = vi.fn();
let mockRawText = "";

vi.mock("../context", () => ({
  useFile: () => ({
    rawText: mockRawText,
    setRawText: mockSetRawText,
  }),
}));

describe("extractTitlePage", () => {
  it("does not treat scene heading as title page when script has no title page", () => {
    const script = "INT. LIVING ROOM - DAY\n\nBob sits on the sofa.\nHe looks around.";
    const result = extractTitlePage(script);

    expect(result.header).toBe("");
    expect(result.fields).toEqual({});
    expect(result.body).toBe(script);
  });

  it("does not treat scene heading containing colons as title page", () => {
    const script = "INT. OFFICE - 10:00 AM\n\nAlice types rapidly.";
    const result = extractTitlePage(script);

    expect(result.header).toBe("");
    expect(result.fields).toEqual({});
    expect(result.body).toBe(script);
  });

  it("does not treat transitions as title page", () => {
    const script = "FADE IN:\n\nEXT. DESERT - DAY\n\nThe sun beats down.";
    const result = extractTitlePage(script);

    expect(result.header).toBe("");
    expect(result.fields).toEqual({});
    expect(result.body).toBe(script);
  });

  it("does not treat dialogue or action lines as title page", () => {
    const script = "BOB\nHello world!\n\nINT. ROOM - NIGHT";
    const result = extractTitlePage(script);

    expect(result.header).toBe("");
    expect(result.fields).toEqual({});
    expect(result.body).toBe(script);
  });

  it("correctly extracts title page fields and body when title page is present", () => {
    const script = "Title: The Great Movie\nAuthor: Jane Doe\nCredit: Written by\n\nINT. SPACE STATION - NIGHT\n\nStars visible outside.";
    const result = extractTitlePage(script);

    expect(result.header).toBe("Title: The Great Movie\nAuthor: Jane Doe\nCredit: Written by");
    expect(result.fields).toEqual({
      title: "The Great Movie",
      author: "Jane Doe",
      credit: "Written by",
    });
    expect(result.body).toBe("INT. SPACE STATION - NIGHT\n\nStars visible outside.");
  });

  it("handles multi-line indented fields like contact information", () => {
    const script = "Title: My Film\nContact:\n  123 Main St\n  Hollywood, CA\n\nINT. BAR - NIGHT";
    const result = extractTitlePage(script);

    expect(result.fields.title).toBe("My Film");
    expect(result.fields.contact).toBe("123 Main St\nHollywood, CA");
    expect(result.body).toBe("INT. BAR - NIGHT");
  });

  it("handles document containing only a title page and no body", () => {
    const script = "Title: Solo Script\nAuthor: Lone Writer";
    const result = extractTitlePage(script);

    expect(result.header).toBe("Title: Solo Script\nAuthor: Lone Writer");
    expect(result.fields).toEqual({
      title: "Solo Script",
      author: "Lone Writer",
    });
    expect(result.body).toBe("");
  });
});

describe("buildTitlePage", () => {
  it("builds formatted Fountain title page with standard order", () => {
    const fields = {
      author: "Jane Doe",
      title: "Starfall",
      contact: "agent@agency.com",
    };
    const output = buildTitlePage(fields);
    expect(output).toBe("Title: Starfall\nAuthor: Jane Doe\nContact: agent@agency.com\n\n");
  });

  it("returns empty string when all fields are empty", () => {
    expect(buildTitlePage({})).toBe("");
    expect(buildTitlePage({ title: "", author: "   " })).toBe("");
  });
});

describe("TitlePageEditorModal Component", () => {
  it("adds title page above first line without deleting the first scene heading", () => {
    mockRawText = "INT. LIVING ROOM - DAY\n\nBob enters.";
    mockSetRawText.mockClear();

    const onClose = vi.fn();
    render(<TitlePageEditorModal onClose={onClose} />);

    // Enter a Title
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "My Great Script" } });

    // Click Apply Changes
    const applyButton = screen.getByRole("button", { name: /Apply Changes/i });
    fireEvent.click(applyButton);

    expect(mockSetRawText).toHaveBeenCalledTimes(1);
    const updatedText = mockSetRawText.mock.calls[0][0];

    // Ensure title page is added and first scene heading is fully preserved
    expect(updatedText).toContain("Title: My Great Script");
    expect(updatedText).toContain("INT. LIVING ROOM - DAY\n\nBob enters.");
    expect(updatedText.startsWith("Title: My Great Script\n\nINT. LIVING ROOM - DAY")).toBe(true);
    expect(onClose).toHaveBeenCalled();
  });

  it("replaces existing title page without altering the body", () => {
    mockRawText = "Title: Old Title\nAuthor: Old Author\n\nINT. LIVING ROOM - DAY\n\nBob enters.";
    mockSetRawText.mockClear();

    const onClose = vi.fn();
    render(<TitlePageEditorModal onClose={onClose} />);

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "New Title" } });

    const applyButton = screen.getByRole("button", { name: /Apply Changes/i });
    fireEvent.click(applyButton);

    expect(mockSetRawText).toHaveBeenCalledTimes(1);
    const updatedText = mockSetRawText.mock.calls[0][0];

    expect(updatedText).toContain("Title: New Title");
    expect(updatedText).not.toContain("Old Title");
    expect(updatedText).toContain("Author: Old Author");
    expect(updatedText).toContain("INT. LIVING ROOM - DAY\n\nBob enters.");
  });

  it("clears title page and leaves body starting at line 1", () => {
    mockRawText = "Title: Old Title\nAuthor: Old Author\n\nINT. LIVING ROOM - DAY\n\nBob enters.";
    mockSetRawText.mockClear();

    const onClose = vi.fn();
    render(<TitlePageEditorModal onClose={onClose} />);

    const clearButton = screen.getByRole("button", { name: /Clear Title Page/i });
    fireEvent.click(clearButton);

    const applyButton = screen.getByRole("button", { name: /Apply Changes/i });
    fireEvent.click(applyButton);

    expect(mockSetRawText).toHaveBeenCalledTimes(1);
    const updatedText = mockSetRawText.mock.calls[0][0];

    expect(updatedText).toBe("INT. LIVING ROOM - DAY\n\nBob enters.");
  });
});
