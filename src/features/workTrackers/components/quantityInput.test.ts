import { describe, expect, it } from "vitest";
import { sanitizeQuantityInput } from "./quantityInput.logic";

describe("sanitizeQuantityInput", () => {
  it("keeps a half unit intact — 2.5 hours of maintenance", () => {
    expect(sanitizeQuantityInput("2.5")).toEqual({ display: "2.5", value: 2.5 });
  });

  it("accepts a comma as the decimal separator", () => {
    expect(sanitizeQuantityInput("2,5")).toEqual({ display: "2.5", value: 2.5 });
  });

  it("caps the fraction at one digit — the column stores numeric(10,1)", () => {
    expect(sanitizeQuantityInput("2.57")).toEqual({ display: "2.5", value: 2.5 });
  });

  it("keeps a trailing separator so the next digit has somewhere to land", () => {
    expect(sanitizeQuantityInput("2.")).toEqual({ display: "2.", value: 2 });
  });

  it("treats a leading separator as a leading zero", () => {
    expect(sanitizeQuantityInput(".5")).toEqual({ display: "0.5", value: 0.5 });
  });

  it("folds a second separator into the fraction instead of dropping the keystroke", () => {
    expect(sanitizeQuantityInput("1.2.3")).toEqual({ display: "1.2", value: 1.2 });
  });

  it("drops letters and the minus sign — the column checks quantity >= 0", () => {
    expect(sanitizeQuantityInput("-1a3")).toEqual({ display: "13", value: 13 });
  });

  it("strips leading zeros without eating a lone zero", () => {
    expect(sanitizeQuantityInput("007")).toEqual({ display: "7", value: 7 });
    expect(sanitizeQuantityInput("0")).toEqual({ display: "0", value: 0 });
    expect(sanitizeQuantityInput("0.5")).toEqual({ display: "0.5", value: 0.5 });
  });

  it("leaves an emptied field empty rather than fighting the typist with a 0", () => {
    expect(sanitizeQuantityInput("")).toEqual({ display: "", value: 0 });
  });

  it("keeps a whole number whole", () => {
    expect(sanitizeQuantityInput("3")).toEqual({ display: "3", value: 3 });
  });
});
