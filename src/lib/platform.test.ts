import { describe, expect, it } from "vitest";
import { hasCreateWorkTrackerModifier, isMacPlatformString } from "./platform";

describe("isMacPlatformString", () => {
  it("recognises the platform strings browsers actually report on Apple hardware", () => {
    expect(isMacPlatformString("MacIntel")).toBe(true);
    expect(isMacPlatformString("macOS")).toBe(true);
    expect(isMacPlatformString("Mac")).toBe(true);
  });

  it("is false for everything else, including missing values", () => {
    expect(isMacPlatformString("Win32")).toBe(false);
    expect(isMacPlatformString("Windows")).toBe(false);
    expect(isMacPlatformString("Linux x86_64")).toBe(false);
    expect(isMacPlatformString("")).toBe(false);
    expect(isMacPlatformString(null)).toBe(false);
    expect(isMacPlatformString(undefined)).toBe(false);
  });
});

describe("hasCreateWorkTrackerModifier", () => {
  const click = (over: Partial<Parameters<typeof hasCreateWorkTrackerModifier>[0]> = {}) => ({
    metaKey: false,
    ctrlKey: false,
    button: 0,
    ...over,
  });

  it("accepts Command on mac", () => {
    expect(hasCreateWorkTrackerModifier(click({ metaKey: true }), true)).toBe(true);
  });

  it("ignores Ctrl on mac — there it is the secondary-click gesture, not a shortcut", () => {
    expect(hasCreateWorkTrackerModifier(click({ ctrlKey: true }), true)).toBe(false);
  });

  it("accepts Ctrl off mac", () => {
    expect(hasCreateWorkTrackerModifier(click({ ctrlKey: true }), false)).toBe(true);
  });

  it("ignores the Command key off mac", () => {
    expect(hasCreateWorkTrackerModifier(click({ metaKey: true }), false)).toBe(false);
  });

  it("ignores a plain click on either platform", () => {
    expect(hasCreateWorkTrackerModifier(click(), true)).toBe(false);
    expect(hasCreateWorkTrackerModifier(click(), false)).toBe(false);
  });

  it("ignores non-primary buttons even with the modifier held", () => {
    expect(hasCreateWorkTrackerModifier(click({ metaKey: true, button: 2 }), true)).toBe(false);
    expect(hasCreateWorkTrackerModifier(click({ ctrlKey: true, button: 1 }), false)).toBe(false);
  });
});
