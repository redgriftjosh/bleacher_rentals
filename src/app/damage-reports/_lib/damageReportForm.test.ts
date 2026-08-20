import { describe, it, expect } from "vitest";
import {
  MIN_PHOTOS,
  MAX_PHOTOS,
  validateDamageReportForm,
  describePhotoLimit,
  type DamageReportFormValues,
} from "./damageReportForm";

const valid: DamageReportFormValues = {
  bleacherUuid: "bleacher-1",
  seatDamage: "minor",
  haulDamage: null,
  note: "Some damage note",
  photoCount: 1,
};

describe("MIN_PHOTOS / MAX_PHOTOS", () => {
  it("MIN_PHOTOS is 1", () => {
    expect(MIN_PHOTOS).toBe(1);
  });

  it("MAX_PHOTOS matches br_driver's utils/photoLimit.ts MAX_PHOTOS (30)", () => {
    expect(MAX_PHOTOS).toBe(30);
  });
});

describe("validateDamageReportForm", () => {
  it("passes (returns null) for a fully valid form", () => {
    expect(validateDamageReportForm(valid)).toBeNull();
  });

  it("fails when bleacherUuid is null", () => {
    const result = validateDamageReportForm({ ...valid, bleacherUuid: null });
    expect(result).not.toBeNull();
  });

  it("fails when both severities are unanswered (null)", () => {
    const result = validateDamageReportForm({ ...valid, seatDamage: null, haulDamage: null });
    expect(result).not.toBeNull();
  });

  it("passes when only seatDamage is answered", () => {
    const result = validateDamageReportForm({ ...valid, seatDamage: "none", haulDamage: null });
    expect(result).toBeNull();
  });

  it("passes when only haulDamage is answered", () => {
    const result = validateDamageReportForm({ ...valid, seatDamage: null, haulDamage: "none" });
    expect(result).toBeNull();
  });

  it("fails when note is empty", () => {
    const result = validateDamageReportForm({ ...valid, note: "" });
    expect(result).not.toBeNull();
  });

  it("fails when note is only whitespace", () => {
    const result = validateDamageReportForm({ ...valid, note: "   \n\t  " });
    expect(result).not.toBeNull();
  });

  it("fails when photoCount is below MIN_PHOTOS (0)", () => {
    const result = validateDamageReportForm({ ...valid, photoCount: 0 });
    expect(result).not.toBeNull();
  });

  it("fails when photoCount exceeds MAX_PHOTOS (31)", () => {
    const result = validateDamageReportForm({ ...valid, photoCount: 31 });
    expect(result).not.toBeNull();
  });

  it("passes at exactly MAX_PHOTOS (30)", () => {
    const result = validateDamageReportForm({ ...valid, photoCount: 30 });
    expect(result).toBeNull();
  });

  it("passes at exactly MIN_PHOTOS (1)", () => {
    const result = validateDamageReportForm({ ...valid, photoCount: 1 });
    expect(result).toBeNull();
  });
});

describe("describePhotoLimit", () => {
  it("at 0: full headroom, no notice", () => {
    const state = describePhotoLimit(0);
    expect(state.max).toBe(30);
    expect(state.current).toBe(0);
    expect(state.remaining).toBe(30);
    expect(state.atLimit).toBe(false);
    expect(state.notice).toBeNull();
  });

  it("at 29: one slot of headroom left, no notice", () => {
    const state = describePhotoLimit(29);
    expect(state.remaining).toBe(1);
    expect(state.atLimit).toBe(false);
    expect(state.notice).toBeNull();
  });

  it("at 30: no headroom, atLimit true, notice present", () => {
    const state = describePhotoLimit(30);
    expect(state.remaining).toBe(0);
    expect(state.atLimit).toBe(true);
    expect(state.notice).not.toBeNull();
  });

  it("at 35 (over cap): remaining clamped at 0, atLimit true, never negative", () => {
    const state = describePhotoLimit(35);
    expect(state.remaining).toBe(0);
    expect(state.remaining).toBeGreaterThanOrEqual(0);
    expect(state.atLimit).toBe(true);
    expect(state.notice).not.toBeNull();
  });
});
