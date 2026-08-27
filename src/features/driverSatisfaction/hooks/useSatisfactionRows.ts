"use client";

import { useMemo } from "react";
import { db } from "@/components/providers/SystemProvider";
import { expect, useTypedQuery } from "@/lib/powersync/typedQuery";
import type { SatisfactionRow } from "../utils/aggregate";

type SatisfactionQueryRow = {
  answerId: string;
  submissionId: string | null;
  driverUuid: string | null;
  firstName: string | null;
  lastName: string | null;
  score: number | null;
  reason: string | null;
  prompt: string | null;
  submittedAt: string | null;
  appVersion: string | null;
  appPlatform: string | null;
};

function displayName(first: string | null, last: string | null): string {
  const name = [first, last].filter(Boolean).join(" ").trim();
  // A driver whose Users row has no name still has answers worth reading.
  return name === "" ? "Unnamed driver" : name;
}

/**
 * Every survey answer, newest first, with the driver who gave it.
 *
 * One row per *answer*, which is exactly how the table is stored — there is no
 * submission parent, so this is one join (to Drivers/Users, for the name)
 * rather than two. Rows written together share a `submission_uuid`; with a
 * single question that is one row apiece, and when next quarter's surveys carry
 * several the table still reads as "who said what about which question".
 *
 * The question text comes from the answer's own `prompt_snapshot` rather than
 * from a join to `DriverSurveyQuestions`. Once the wording is editable in this
 * app, a join would re-label every historical answer with a question that was
 * never asked — the snapshot is what keeps last quarter's numbers honest.
 */
export function useSatisfactionRows(surveyId?: string): {
  rows: SatisfactionRow[];
  isLoading: boolean;
} {
  const compiled = useMemo(() => {
    let query = db
      .selectFrom("DriverSurveyResponses as r")
      .leftJoin("Drivers as d", "d.id", "r.driver_uuid")
      .leftJoin("Users as u", "u.id", "d.user_uuid")
      .select([
        "r.id as answerId",
        "r.submission_uuid as submissionId",
        "r.driver_uuid as driverUuid",
        "u.first_name as firstName",
        "u.last_name as lastName",
        "r.score as score",
        "r.reason_text as reason",
        "r.prompt_snapshot as prompt",
        "r.submitted_at as submittedAt",
        "r.app_version as appVersion",
        "r.app_platform as appPlatform",
      ])
      .orderBy("r.submitted_at", "desc");

    if (surveyId) {
      query = query.where("r.survey_uuid", "=", surveyId);
    }

    return query.compile();
  }, [surveyId]);

  const { data, isLoading } = useTypedQuery(compiled, expect<SatisfactionQueryRow>());

  const rows = useMemo<SatisfactionRow[]>(
    () =>
      (data ?? []).map((row) => ({
        responseId: row.submissionId ?? row.answerId,
        driverUuid: row.driverUuid,
        driverName: displayName(row.firstName, row.lastName),
        score: row.score,
        reason: row.reason,
        prompt: row.prompt ?? "",
        submittedAt: row.submittedAt,
        appVersion: row.appVersion,
        appPlatform: row.appPlatform,
      })),
    [data],
  );

  return { rows, isLoading };
}

export type SurveyOption = { id: string; title: string | null };

/** The surveys that have been defined, for the page's filter. */
export function useSurveyOptions(): SurveyOption[] {
  const compiled = useMemo(
    () =>
      db.selectFrom("DriverSurveys").select(["id", "title"]).orderBy("sort_order", "asc").compile(),
    [],
  );

  const { data = [] } = useTypedQuery(compiled, expect<SurveyOption>());
  return data;
}

/**
 * How many active drivers exist, as the denominator for "who has answered".
 *
 * Deliberately every active driver rather than every driver who was *asked*:
 * the app asks each driver on its own schedule, so "asked" is a moving target
 * and the honest headline is coverage of the fleet.
 */
export function useActiveDriverCount(): number {
  const compiled = useMemo(
    () => db.selectFrom("Drivers").select(["id"]).where("is_active", "=", 1).compile(),
    [],
  );

  const { data = [] } = useTypedQuery(compiled, expect<{ id: string }>());
  return data.length;
}
