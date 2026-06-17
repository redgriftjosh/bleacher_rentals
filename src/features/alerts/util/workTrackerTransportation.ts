import { db } from "@/components/providers/SystemProvider";
import { expect, typedGetAll } from "@/lib/powersync/typedQuery";
import { resolveAddress } from "@/utils/resolveAddress";

type BeRow = {
  eventStart: string | null;
  address: string | null;
  eventStatus: string | null;
};

type WtAddrRow = {
  date: string | null;
  dropoffAddress: string | null;
};

export const normalizeStreet = (value: string | null | undefined) =>
  (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");

export function isPickupTransportationMismatch(
  expectedPickupStreet: string | null | undefined,
  pickupStreet: string | null | undefined,
): boolean {
  if (!expectedPickupStreet || !pickupStreet) return false;
  return normalizeStreet(expectedPickupStreet) !== normalizeStreet(pickupStreet);
}

export async function getExpectedPickupStreetForWorkTracker(params: {
  bleacherUuid: string;
  targetDate: string;
  excludeWorkTrackerUuid?: string | null;
}): Promise<string | null> {
  const { bleacherUuid, targetDate, excludeWorkTrackerUuid } = params;

  const beRows = await typedGetAll(
    db
      .selectFrom("BleacherEvents as be")
      .innerJoin("Events as e", "e.id", "be.event_uuid")
      .innerJoin("Addresses as a", "a.id", "e.address_uuid")
      .select([
        "e.event_start as eventStart",
        "a.street as address",
        "e.event_status as eventStatus",
      ])
      .where("be.bleacher_uuid", "=", bleacherUuid)
      .compile(),
    expect<BeRow>(),
  );

  let wtQuery = db
    .selectFrom("WorkTrackers as wt")
    .leftJoin("Addresses as a", "a.id", "wt.dropoff_address_uuid")
    .select(["wt.date as date", "a.street as dropoffAddress"])
    .where("wt.bleacher_uuid", "=", bleacherUuid);

  if (excludeWorkTrackerUuid) {
    wtQuery = wtQuery.where("wt.id", "!=", excludeWorkTrackerUuid);
  }

  const wtRows = await typedGetAll(wtQuery.compile(), expect<WtAddrRow>());

  return resolveAddress(
    {
      bleacherEvents: beRows
        .filter((r) => r.eventStart != null)
        .map((r) => ({
          booked: r.eventStatus === "booked",
          eventStart: r.eventStart!,
          address: r.address ?? "",
        })),
      workTrackers: wtRows,
    },
    targetDate,
  );
}
