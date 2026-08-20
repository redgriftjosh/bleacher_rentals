import { describe, it, expect } from "vitest";
import { buildPhotoInserts } from "./photoInserts";

describe("buildPhotoInserts", () => {
  it("stamps upload_status: 'uploaded' on every insert payload", () => {
    const inserts = buildPhotoInserts("report-1", ["a.jpg", "b.jpg"]);
    expect(inserts).toHaveLength(2);
    for (const insert of inserts) {
      expect(insert.upload_status).toBe("uploaded");
    }
  });

  it("carries the damage_report_uuid and photo_path through unchanged", () => {
    const inserts = buildPhotoInserts("report-1", ["a.jpg", "b.jpg"]);
    expect(inserts).toEqual([
      { damage_report_uuid: "report-1", photo_path: "a.jpg", upload_status: "uploaded" },
      { damage_report_uuid: "report-1", photo_path: "b.jpg", upload_status: "uploaded" },
    ]);
  });

  it("returns an empty array for an empty photo list", () => {
    expect(buildPhotoInserts("report-1", [])).toEqual([]);
  });
});
