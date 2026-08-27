import { describe, expect, it } from "vitest";
import type { Bleacher } from "@/features/dashboard/types";
import { buildWorkTrackerDraft, checkWorkTrackerOpenAccess } from "./createWorkTrackerDraft";

const bleacher = (over: Partial<Bleacher> = {}): Bleacher =>
  ({
    bleacherUuid: "bleacher-1",
    bleacherNumber: 1,
    bleacherRows: 5,
    bleacherSeats: 50,
    summerHomeBase: null,
    winterHomeBase: null,
    bleacherEvents: [],
    blocks: [],
    workTrackers: [],
    maintenanceEvents: [],
    subrentalEvents: [],
    damageReports: [],
    linxupDeviceId: null,
    summerAccountManagerUuid: null,
    winterAccountManagerUuid: null,
    zoneUuid: "zone-a",
    zoneName: "Zone A",
    storageLocationName: null,
    isAccessible: true,
    ...over,
  }) as Bleacher;

const admin = { isAdmin: true, isAccountManager: false, accountManagerZoneIds: [] };
const am = (zones: string[]) => ({
  isAdmin: false,
  isAccountManager: true,
  accountManagerZoneIds: zones,
});

describe("checkWorkTrackerOpenAccess", () => {
  it("lets an admin create anywhere", () => {
    const result = checkWorkTrackerOpenAccess({
      bleacherUuid: "bleacher-1",
      date: "2026-07-04",
      workTrackerUuid: null,
      perms: admin,
      allBleachers: [bleacher({ zoneUuid: "zone-z" })],
    });
    expect(result).toEqual({ allowed: true });
  });

  it("lets an AM create on a bleacher in their own zone", () => {
    const result = checkWorkTrackerOpenAccess({
      bleacherUuid: "bleacher-1",
      date: "2026-07-04",
      workTrackerUuid: null,
      perms: am(["zone-a"]),
      allBleachers: [bleacher()],
    });
    expect(result).toEqual({ allowed: true });
  });

  it("blocks an AM on someone else's bleacher", () => {
    const result = checkWorkTrackerOpenAccess({
      bleacherUuid: "bleacher-1",
      date: "2026-07-04",
      workTrackerUuid: null,
      perms: am(["zone-b"]),
      allBleachers: [bleacher()],
    });
    expect(result).toEqual({
      allowed: false,
      messages: ["You can only create work trackers for bleachers assigned to you."],
    });
  });

  it("blocks an AM on their own bleacher while it is subrented out", () => {
    const result = checkWorkTrackerOpenAccess({
      bleacherUuid: "bleacher-1",
      date: "2026-07-04",
      workTrackerUuid: null,
      perms: am(["zone-a"]),
      allBleachers: [
        bleacher({
          acceptedSubrentalBlocks: [{ eventStart: "2026-07-01", eventEnd: "2026-07-10" }],
        }),
      ],
    });
    expect(result).toEqual({
      allowed: false,
      messages: ["This bleacher is subrented out on this date."],
    });
  });

  it("lets an AM create on a bleacher subrented into their zone for that date", () => {
    const result = checkWorkTrackerOpenAccess({
      bleacherUuid: "bleacher-1",
      date: "2026-07-04",
      workTrackerUuid: null,
      perms: am(["zone-b"]),
      allBleachers: [
        bleacher(),
        bleacher({
          isSubrentalRow: true,
          zoneUuid: "zone-b",
          acceptedSubrentalAccess: [{ eventStart: "2026-07-01", eventEnd: "2026-07-10" }],
        }),
      ],
    });
    expect(result).toEqual({ allowed: true });
  });

  it("does not restrict opening an existing tracker", () => {
    const result = checkWorkTrackerOpenAccess({
      bleacherUuid: "bleacher-1",
      date: "2026-07-04",
      workTrackerUuid: "wt-1",
      perms: am(["zone-b"]),
      allBleachers: [bleacher()],
    });
    expect(result).toEqual({ allowed: true });
  });
});

describe("buildWorkTrackerDraft", () => {
  it("uses the -1 sentinel and leaves the trip fields empty for a new tracker", () => {
    const draft = buildWorkTrackerDraft({ bleacherUuid: "bleacher-1", date: "2026-07-04" });

    expect(draft.id).toBe("-1");
    expect(draft.bleacher_uuid).toBe("bleacher-1");
    expect(draft.date).toBe("2026-07-04");
    expect(draft.status).toBe("draft");
    expect(draft.pickup_address_uuid).toBeNull();
    expect(draft.dropoff_address_uuid).toBeNull();
    expect(draft.pickup_poc_contact_uuid).toBeNull();
    expect(draft.dropoff_poc_contact_uuid).toBeNull();
    expect(draft.setup_required).toBe(false);
    expect(draft.teardown_required).toBe(false);
  });

  it("keeps an existing uuid when the cell already has a tracker", () => {
    const draft = buildWorkTrackerDraft({
      bleacherUuid: "bleacher-1",
      date: "2026-07-04",
      workTrackerUuid: "wt-9",
    });
    expect(draft.id).toBe("wt-9");
  });
});
