import { describe, expect, it } from "vitest";
import { sanitizePercentInput } from "./InputPercents.logic";

describe("sanitizePercentInput", () => {
  it("keeps a three-decimal rate intact — Quebec is 14.975 %", () => {
    expect(sanitizePercentInput("14.975")).toEqual({ display: "14.975", value: 14.975 });
  });

  it("accepts a comma as the decimal separator", () => {
    expect(sanitizePercentInput("14,975")).toEqual({ display: "14.975", value: 14.975 });
  });

  it("caps the fraction at three digits", () => {
    expect(sanitizePercentInput("14.97531")).toEqual({ display: "14.975", value: 14.975 });
  });

  it("keeps a trailing separator so the next digit has somewhere to land", () => {
    expect(sanitizePercentInput("14.")).toEqual({ display: "14.", value: 14 });
  });

  it("treats a leading separator as a leading zero", () => {
    expect(sanitizePercentInput(".5")).toEqual({ display: "0.5", value: 0.5 });
  });

  it("folds a second separator into the fraction instead of dropping the keystroke", () => {
    expect(sanitizePercentInput("1.2.3")).toEqual({ display: "1.23", value: 1.23 });
  });

  it("drops letters and signs", () => {
    expect(sanitizePercentInput("-1a3%")).toEqual({ display: "13", value: 13 });
  });

  it("strips leading zeros without eating a lone zero", () => {
    expect(sanitizePercentInput("007")).toEqual({ display: "7", value: 7 });
    expect(sanitizePercentInput("0")).toEqual({ display: "0", value: 0 });
    expect(sanitizePercentInput("0.5")).toEqual({ display: "0.5", value: 0.5 });
  });

  it("falls back to zero on an empty field", () => {
    expect(sanitizePercentInput("")).toEqual({ display: "0", value: 0 });
  });

  it("clamps above one hundred", () => {
    expect(sanitizePercentInput("150")).toEqual({ display: "100", value: 100 });
    expect(sanitizePercentInput("100.5")).toEqual({ display: "100", value: 100 });
  });
});
