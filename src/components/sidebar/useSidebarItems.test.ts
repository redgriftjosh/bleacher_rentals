import { describe, it, expect } from "vitest";
import { useSidebarItems } from "./useSidebarItems";

describe("useSidebarItems", () => {
  // ═══ Admin ═══

  it("admin sees all sidebar items including configuration", () => {
    const items = useSidebarItems(["admin"]);
    const keys = items.map((i) => i.key);
    expect(keys).toContain("dashboard");
    expect(keys).toContain("quotes-bookings");
    expect(keys).toContain("team");
    expect(keys).toContain("assets");
    expect(keys).toContain("quality-assurance");
    expect(keys).toContain("work-trackers");
    expect(keys).toContain("scorecard");
    expect(keys).toContain("leaderboard");
    expect(keys).toContain("driver-calendar");
    expect(keys).toContain("configuration");
  });

  // ═══ Viewer ═══

  it("viewer sees team page", () => {
    const items = useSidebarItems(["viewer"]);
    const keys = items.map((i) => i.key);
    expect(keys).toContain("team");
  });

  it("viewer sees dashboard, quotes, assets, work-trackers", () => {
    const items = useSidebarItems(["viewer"]);
    const keys = items.map((i) => i.key);
    expect(keys).toContain("dashboard");
    expect(keys).toContain("quotes-bookings");
    expect(keys).toContain("assets");
    expect(keys).toContain("work-trackers");
  });

  it("viewer does NOT see configuration", () => {
    const items = useSidebarItems(["viewer"]);
    const keys = items.map((i) => i.key);
    expect(keys).not.toContain("configuration");
  });

  it("viewer sees scorecard and leaderboard", () => {
    const items = useSidebarItems(["viewer"]);
    const keys = items.map((i) => i.key);
    expect(keys).toContain("scorecard");
    expect(keys).toContain("leaderboard");
  });

  // ═══ Account Manager ═══

  it("account_manager sees same items as admin", () => {
    const adminItems = useSidebarItems(["admin"]);
    const amItems = useSidebarItems(["account_manager"]);
    expect(amItems.map((i) => i.key)).toEqual(adminItems.map((i) => i.key));
  });

  // ═══ Driver ═══

  it("driver sees no sidebar items", () => {
    const items = useSidebarItems(["driver"]);
    expect(items).toEqual([]);
  });

  // ═══ Multiple roles ═══

  it("viewer + admin merges to show everything (union)", () => {
    const items = useSidebarItems(["viewer", "admin"]);
    const keys = items.map((i) => i.key);
    expect(keys).toContain("configuration");
    expect(keys).toContain("team");
  });

  // ═══ Empty roles ═══

  it("empty roles array returns no items", () => {
    const items = useSidebarItems([]);
    expect(items).toEqual([]);
  });
});
