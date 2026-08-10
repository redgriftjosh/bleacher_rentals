import { describe, it, expect } from "vitest";
import { checkChangelog, type CheckInput } from "./checkChangelog";

const BODY = "## 1.1.0\n\n- Something genuinely useful shipped in this release.";

const valid: CheckInput = {
  headVersion: "1.1.0",
  baseVersion: "1.0.0",
  fileContents: BODY,
  addedFiles: ["versions/1.1.0.md", "src/foo.ts"],
};

describe("checkChangelog", () => {
  it("passes when version is bumped and notes are added", () => {
    expect(checkChangelog(valid)).toEqual({ ok: true });
  });

  it("fails when the version was not bumped", () => {
    const r = checkChangelog({ ...valid, headVersion: "1.0.0" });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toContain("still 1.0.0");
  });

  it("fails when the version is not semver", () => {
    const r = checkChangelog({ ...valid, headVersion: "1.1" });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toContain("major.minor.patch");
  });

  it("fails when the notes file is missing", () => {
    const r = checkChangelog({ ...valid, fileContents: null });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toContain("does not exist");
  });

  it("fails when the notes file is a stub", () => {
    const r = checkChangelog({ ...valid, fileContents: "# 1.1.0\n" });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toContain("too short");
  });

  it("fails when the notes file exists but was not added by this PR", () => {
    const r = checkChangelog({ ...valid, addedFiles: ["src/foo.ts"] });
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toContain("not added by this pull request");
  });

  it("names the expected path in its failure messages", () => {
    const r = checkChangelog({ ...valid, fileContents: null });
    expect(r.ok === false && r.reason).toContain("versions/1.1.0.md");
  });
});
