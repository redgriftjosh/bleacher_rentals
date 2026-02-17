"use client";

import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import { useMemo } from "react";
import { getCurrentWeekEnd, getCurrentWeekStart, getWeekRange } from "../dateUtils";
import type { AccountManagerScorecard } from "../types";

type EventRow = {
  id: string;
  eventName: string | null;
  createdAt: string | null;
  eventStart: string | null;
  eventStatus: string | null;
  contractRevenueCents: number | null;
  createdByUserUuid: string | null;
};

type BleacherRow = {
  id: string;
};

type BleacherAssignmentRow = {
  bleacherUuid: string | null;
  eventStart: string | null;
  eventStatus: string | null;
};

export type ReportRow = {
  eventId: string;
  eventName: string;
  managerName: string;
  managerUuid: string;
  status: string;
  eventStart: string;
  createdAt: string;
  revenueCents: number;
};

export type UtilizationPoint = {
  label: string;
  bookedBleacherDays: number;
  availableBleacherDays: number;
  utilizationPct: number;
};

const eventsQuery = db
  .selectFrom("Events as e")
  .select([
    "e.id as id",
    "e.event_name as eventName",
    "e.created_at as createdAt",
    "e.event_start as eventStart",
    "e.event_status as eventStatus",
    "e.contract_revenue_cents as contractRevenueCents",
    "e.created_by_user_uuid as createdByUserUuid",
  ])
  .compile();

const bleachersQuery = db.selectFrom("Bleachers as b").select(["b.id as id"]).compile();

const bleacherAssignmentsQuery = db
  .selectFrom("BleacherEvents as be")
  .innerJoin("Events as e", "e.id", "be.event_uuid")
  .select([
    "be.bleacher_uuid as bleacherUuid",
    "e.event_start as eventStart",
    "e.event_status as eventStatus",
  ])
  .compile();

function isInRange(dateStr: string | null, start: string, end: string): boolean {
  if (!dateStr) return false;
  const dateOnly = dateStr.substring(0, 10);
  return dateOnly >= start && dateOnly <= end;
}

function toUtilizationPoint(
  label: string,
  start: string,
  end: string,
  assignments: BleacherAssignmentRow[],
  bleacherCount: number,
): UtilizationPoint {
  const bookedBleacherDays = assignments.reduce((sum, a) => {
    if (a.eventStatus !== "booked") return sum;
    return isInRange(a.eventStart, start, end) ? sum + 1 : sum;
  }, 0);

  const availableBleacherDays = Math.max(bleacherCount * 7, 1);
  const utilizationPct = (bookedBleacherDays / availableBleacherDays) * 100;

  return {
    label,
    bookedBleacherDays,
    availableBleacherDays,
    utilizationPct,
  };
}

export function useScorecardInsights(scorecards: AccountManagerScorecard[]) {
  const { data: eventRows } = useTypedQuery(eventsQuery, expect<EventRow>());
  const { data: bleacherRows } = useTypedQuery(bleachersQuery, expect<BleacherRow>());
  const { data: assignmentRows } = useTypedQuery(
    bleacherAssignmentsQuery,
    expect<BleacherAssignmentRow>(),
  );

  const reportRows = useMemo<ReportRow[]>(() => {
    const managerByUuid = new Map(
      scorecards.map((sc) => [
        sc.manager.userUuid,
        `${sc.manager.firstName ?? ""} ${sc.manager.lastName ?? ""}`.trim() || "Unknown",
      ]),
    );

    return (eventRows ?? []).map((row) => ({
      eventId: row.id,
      eventName: row.eventName ?? "Untitled Event",
      managerName: managerByUuid.get(row.createdByUserUuid ?? "") ?? "Unknown",
      managerUuid: row.createdByUserUuid ?? "unknown",
      status: row.eventStatus ?? "unknown",
      eventStart: row.eventStart?.substring(0, 10) ?? "",
      createdAt: row.createdAt?.substring(0, 10) ?? "",
      revenueCents: row.contractRevenueCents ?? 0,
    }));
  }, [eventRows, scorecards]);

  const utilization = useMemo(() => {
    const bleacherCount = bleacherRows?.length ?? 0;
    const assignments = assignmentRows ?? [];
    const weekStart = getCurrentWeekStart();
    const weekEnd = getCurrentWeekEnd();

    const currentWeek = toUtilizationPoint(
      "This Week",
      weekStart,
      weekEnd,
      assignments,
      bleacherCount,
    );

    const recentWeeks: UtilizationPoint[] = [];
    for (let i = -7; i <= 0; i++) {
      const range = getWeekRange(i);
      recentWeeks.push(
        toUtilizationPoint(range.start, range.start, range.end, assignments, bleacherCount),
      );
    }

    return {
      currentWeek,
      recentWeeks,
      bleacherCount,
    };
  }, [assignmentRows, bleacherRows]);

  return {
    reportRows,
    utilization,
    isLoading: !eventRows || !bleacherRows || !assignmentRows,
  };
}
