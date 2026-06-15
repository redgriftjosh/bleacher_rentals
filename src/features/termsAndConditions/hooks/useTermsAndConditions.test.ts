import { describe, it, expect } from "vitest";

type Row = {
  id: string;
  name: string | null;
  html_content: string | null;
  created_at: string | null;
  deleted: number | null;
};

type TermsAndConditionsItem = {
  id: string;
  name: string;
  htmlContent: string;
  createdAt: string;
};

function toItem(r: Row): TermsAndConditionsItem {
  return {
    id: r.id,
    name: r.name ?? "",
    htmlContent: r.html_content ?? "",
    createdAt: r.created_at ?? "",
  };
}

describe("toItem", () => {
  it("maps a full row to an item", () => {
    const row: Row = {
      id: "abc-123",
      name: "Standard Agreement",
      html_content: "<p>Terms here</p>",
      created_at: "2026-06-10T12:00:00Z",
      deleted: 0,
    };
    expect(toItem(row)).toEqual({
      id: "abc-123",
      name: "Standard Agreement",
      htmlContent: "<p>Terms here</p>",
      createdAt: "2026-06-10T12:00:00Z",
    });
  });

  it("handles null fields with defaults", () => {
    const row: Row = {
      id: "abc-456",
      name: null,
      html_content: null,
      created_at: null,
      deleted: null,
    };
    expect(toItem(row)).toEqual({
      id: "abc-456",
      name: "",
      htmlContent: "",
      createdAt: "",
    });
  });

  it("preserves HTML content as-is", () => {
    const html = '<h1>Title</h1><p>Bold <strong>text</strong></p><ul><li>Item</li></ul>';
    const row: Row = {
      id: "abc-789",
      name: "With HTML",
      html_content: html,
      created_at: "2026-01-01",
      deleted: 0,
    };
    expect(toItem(row).htmlContent).toBe(html);
  });
});
