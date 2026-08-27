import { describe, it, expect } from "vitest";
import { resolvePocContact, type PocEventRow, type PocWorkTrackerRow } from "./resolvePocContact";

type Source = Parameters<typeof resolvePocContact>[0];

/**
 * Events.event_start is a Postgres `date` — a bare "YYYY-MM-DD" with no time and
 * no zone. Fixtures use that exact shape on purpose: timestamps here used to make
 * the tie-break case pass in UTC and fail in every zone behind it.
 */
const ev = (
  eventStart: string,
  contactUuid: string,
  displayName: string,
  booked = true,
): PocEventRow => ({ booked, eventStart, contactUuid, displayName });

/** Neighbour whose POC is linked to a real contact on the given end. */
const linkedWt = (
  date: string | null,
  end: "pickup" | "dropoff",
  contactUuid: string,
  displayName: string,
): PocWorkTrackerRow => ({
  date,
  pickupPoc: end === "pickup" ? displayName : null,
  pickupPocContactUuid: end === "pickup" ? contactUuid : null,
  pickupPocDisplayName: end === "pickup" ? displayName : null,
  dropoffPoc: end === "dropoff" ? displayName : null,
  dropoffPocContactUuid: end === "dropoff" ? contactUuid : null,
  dropoffPocDisplayName: end === "dropoff" ? displayName : null,
});

/** Legacy neighbour: free text on the given end, no contact record behind it. */
const legacyWt = (
  date: string | null,
  end: "pickup" | "dropoff",
  text: string,
): PocWorkTrackerRow => ({
  date,
  pickupPoc: end === "pickup" ? text : null,
  pickupPocContactUuid: null,
  pickupPocDisplayName: null,
  dropoffPoc: end === "dropoff" ? text : null,
  dropoffPocContactUuid: null,
  dropoffPocDisplayName: null,
});

const emptyWt = (date: string | null): PocWorkTrackerRow => ({
  date,
  pickupPoc: null,
  pickupPocContactUuid: null,
  pickupPocDisplayName: null,
  dropoffPoc: null,
  dropoffPocContactUuid: null,
  dropoffPocDisplayName: null,
});

const source = (events: PocEventRow[], workTrackers: PocWorkTrackerRow[] = []): Source => ({
  events,
  workTrackers,
});

const TARGET = "2026-06-15";

describe("resolvePocContact", () => {
  describe('direction "past" — the Pickup POC button', () => {
    it("returns the contact of the latest booked event on or before the target date", () => {
      const s = source([
        ev("2026-01-01", "c-old", "Old Olsen"),
        ev("2026-03-10", "c-mid", "Mid Miller"),
        ev("2026-09-01", "c-future", "Future Fox"),
      ]);

      expect(resolvePocContact(s, TARGET, "past")).toEqual({
        kind: "contact",
        contactUuid: "c-mid",
        displayName: "Mid Miller",
        source: "event",
      });
    });

    it("includes an event falling on the target date itself", () => {
      const s = source([ev("2026-06-15", "c-same", "Same Day Sam")]);

      expect(resolvePocContact(s, TARGET, "past")).toMatchObject({
        kind: "contact",
        contactUuid: "c-same",
      });
    });

    it("ignores unbooked events", () => {
      const s = source([ev("2026-06-10", "c-draft", "Draft Dave", false)]);

      expect(resolvePocContact(s, TARGET, "past")).toBeNull();
    });

    it("reads the DROPOFF end of a neighbouring work tracker", () => {
      const neighbour: PocWorkTrackerRow = {
        date: "2026-06-12",
        pickupPoc: "Wrong End Wendy",
        pickupPocContactUuid: "c-pickup",
        pickupPocDisplayName: "Wrong End Wendy",
        dropoffPoc: "Right End Rita",
        dropoffPocContactUuid: "c-dropoff",
        dropoffPocDisplayName: "Right End Rita",
      };

      expect(resolvePocContact(source([], [neighbour]), TARGET, "past")).toEqual({
        kind: "contact",
        contactUuid: "c-dropoff",
        displayName: "Right End Rita",
        source: "workTracker",
      });
    });

    it("prefers a nearer work tracker over an earlier event", () => {
      const s = source(
        [ev("2026-06-01", "c-event", "Event Ellen")],
        [linkedWt("2026-06-12", "dropoff", "c-wt", "Tracker Tina")],
      );

      expect(resolvePocContact(s, TARGET, "past")).toMatchObject({
        contactUuid: "c-wt",
        source: "workTracker",
      });
    });

    it("prefers the event when an event and a work tracker share the same date", () => {
      const s = source(
        [ev("2026-06-12", "c-event", "Event Ellen")],
        [linkedWt("2026-06-12", "dropoff", "c-wt", "Tracker Tina")],
      );

      expect(resolvePocContact(s, TARGET, "past")).toMatchObject({
        contactUuid: "c-event",
        source: "event",
      });
    });

    it("returns null when nothing falls on or before the target date", () => {
      const s = source(
        [ev("2026-09-01", "c-future", "Future Fox")],
        [linkedWt("2026-09-02", "dropoff", "c-wt", "Tracker Tina")],
      );

      expect(resolvePocContact(s, TARGET, "past")).toBeNull();
    });
  });

  describe('direction "future" — the Dropoff POC button', () => {
    it("returns the contact of the earliest booked event on or after the target date", () => {
      const s = source([
        ev("2026-01-01", "c-old", "Old Olsen"),
        ev("2026-07-01", "c-next", "Next Nolan"),
        ev("2026-09-01", "c-later", "Later Lane"),
      ]);

      expect(resolvePocContact(s, TARGET, "future")).toEqual({
        kind: "contact",
        contactUuid: "c-next",
        displayName: "Next Nolan",
        source: "event",
      });
    });

    it("reads the PICKUP end of a neighbouring work tracker", () => {
      const neighbour: PocWorkTrackerRow = {
        date: "2026-06-20",
        pickupPoc: "Right End Rita",
        pickupPocContactUuid: "c-pickup",
        pickupPocDisplayName: "Right End Rita",
        dropoffPoc: "Wrong End Wendy",
        dropoffPocContactUuid: "c-dropoff",
        dropoffPocDisplayName: "Wrong End Wendy",
      };

      expect(resolvePocContact(source([], [neighbour]), TARGET, "future")).toEqual({
        kind: "contact",
        contactUuid: "c-pickup",
        displayName: "Right End Rita",
        source: "workTracker",
      });
    });

    it("prefers a nearer work tracker over a later event", () => {
      const s = source(
        [ev("2026-08-01", "c-event", "Event Ellen")],
        [linkedWt("2026-06-20", "pickup", "c-wt", "Tracker Tina")],
      );

      expect(resolvePocContact(s, TARGET, "future")).toMatchObject({
        contactUuid: "c-wt",
        source: "workTracker",
      });
    });

    it("prefers the event when an event and a work tracker share the same date", () => {
      const s = source(
        [ev("2026-06-20", "c-event", "Event Ellen")],
        [linkedWt("2026-06-20", "pickup", "c-wt", "Tracker Tina")],
      );

      expect(resolvePocContact(s, TARGET, "future")).toMatchObject({
        contactUuid: "c-event",
        source: "event",
      });
    });

    it("returns null when nothing falls on or after the target date", () => {
      const s = source([ev("2026-01-01", "c-old", "Old Olsen")]);

      expect(resolvePocContact(s, TARGET, "future")).toBeNull();
    });
  });

  describe("legacy free-text neighbours (D5)", () => {
    it('reports "unlinked" when the nearest neighbour has POC text but no contact record', () => {
      const s = source([], [legacyWt("2026-06-12", "dropoff", "Bob from the school")]);

      expect(resolvePocContact(s, TARGET, "past")).toEqual({
        kind: "unlinked",
        displayName: "Bob from the school",
        source: "workTracker",
      });
    });

    it("does NOT fall back to a more distant linked neighbour", () => {
      const s = source(
        [ev("2026-01-01", "c-distant", "Distant Dana")],
        [legacyWt("2026-06-12", "dropoff", "Bob from the school")],
      );

      expect(resolvePocContact(s, TARGET, "past")).toMatchObject({ kind: "unlinked" });
    });

    it("treats blank POC text as no POC at all", () => {
      const s = source(
        [ev("2026-01-01", "c-distant", "Distant Dana")],
        [legacyWt("2026-06-12", "dropoff", "   ")],
      );

      expect(resolvePocContact(s, TARGET, "past")).toMatchObject({
        kind: "contact",
        contactUuid: "c-distant",
      });
    });

    it("skips a neighbour carrying no POC and lets a further linked one win", () => {
      const s = source(
        [],
        [emptyWt("2026-06-14"), linkedWt("2026-06-10", "dropoff", "c-wt", "Tracker Tina")],
      );

      expect(resolvePocContact(s, TARGET, "past")).toMatchObject({
        kind: "contact",
        contactUuid: "c-wt",
      });
    });

    it("skips a neighbour with a null date", () => {
      const s = source([], [linkedWt(null, "dropoff", "c-undated", "Undated Uma")]);

      expect(resolvePocContact(s, TARGET, "past")).toBeNull();
    });
  });

  describe("display name freshness", () => {
    it("prefers the joined contact name over the neighbour's stored text", () => {
      const renamed: PocWorkTrackerRow = {
        date: "2026-06-12",
        pickupPoc: null,
        pickupPocContactUuid: null,
        pickupPocDisplayName: null,
        dropoffPoc: "Jane Old-Surname",
        dropoffPocContactUuid: "c-jane",
        dropoffPocDisplayName: "Jane New-Surname",
      };

      expect(resolvePocContact(source([], [renamed]), TARGET, "past")).toMatchObject({
        displayName: "Jane New-Surname",
      });
    });

    it("falls back to the stored text when the joined contact name is missing", () => {
      const orphaned: PocWorkTrackerRow = {
        date: "2026-06-12",
        pickupPoc: null,
        pickupPocContactUuid: null,
        pickupPocDisplayName: null,
        dropoffPoc: "Jane Stored",
        dropoffPocContactUuid: "c-jane",
        dropoffPocDisplayName: null,
      };

      expect(resolvePocContact(source([], [orphaned]), TARGET, "past")).toMatchObject({
        kind: "contact",
        displayName: "Jane Stored",
      });
    });
  });
});
