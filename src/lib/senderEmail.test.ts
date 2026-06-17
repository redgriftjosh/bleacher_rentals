import { describe, it, expect } from "vitest";
import { toSenderEmail } from "./senderEmail";

describe("toSenderEmail", () => {
  it("converts @bleacherrentals.com to @bleacherrentals.app", () => {
    expect(toSenderEmail("max@bleacherrentals.com")).toBe("max@bleacherrentals.app");
  });

  it("leaves @bleacherrentals.app unchanged", () => {
    expect(toSenderEmail("max@bleacherrentals.app")).toBe("max@bleacherrentals.app");
  });

  it("does not change other domains", () => {
    expect(toSenderEmail("user@gmail.com")).toBe("user@gmail.com");
  });

  it("only replaces the domain suffix, not partial matches", () => {
    expect(toSenderEmail("test@notbleacherrentals.com")).toBe("test@notbleacherrentals.com");
  });
});
