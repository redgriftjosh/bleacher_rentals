"use client";

import { useMemo, useState } from "react";
import { MessageSquareWarning, Star, ThumbsUp, Users } from "lucide-react";
import {
  useActiveDriverCount,
  useSatisfactionRows,
  useSurveyOptions,
} from "../hooks/useSatisfactionRows";
import {
  DETRACTOR_MAX_SCORE,
  monthlyTrend,
  summarize,
  type SatisfactionRow,
} from "../utils/aggregate";
import ResponsesTable from "./ResponsesTable";
import ScoreTrendChart from "./ScoreTrendChart";
import StatTile from "./StatTile";

type Band = "all" | "detractors" | "with_reason";

const BANDS: { value: Band; label: string }[] = [
  { value: "all", label: "All answers" },
  { value: "detractors", label: `${DETRACTOR_MAX_SCORE} and below` },
  { value: "with_reason", label: "With a written reason" },
];

function applyBand(rows: SatisfactionRow[], band: Band): SatisfactionRow[] {
  if (band === "detractors") {
    return rows.filter((row) => row.score !== null && row.score <= DETRACTOR_MAX_SCORE);
  }
  if (band === "with_reason") {
    return rows.filter((row) => (row.reason ?? "").trim() !== "");
  }
  return rows;
}

/**
 * Driver Satisfaction Score.
 *
 * Reads straight from the local PowerSync database — the same rows the phones
 * wrote — so the page is live without a refresh and works from whatever has
 * already synced.
 *
 * The headline is the average, but the tile worth looking at is "needs a
 * follow-up": every score at or below the threshold came with a written reason,
 * because the app would not let the driver submit without one. That column is
 * the whole return on making the survey undismissable.
 */
export default function DriverSatisfactionPage() {
  const surveys = useSurveyOptions();
  const [surveyId, setSurveyId] = useState<string | undefined>(undefined);
  const [band, setBand] = useState<Band>("all");

  const { rows, isLoading } = useSatisfactionRows(surveyId);
  const activeDrivers = useActiveDriverCount();

  const summary = useMemo(() => summarize(rows), [rows]);
  const trend = useMemo(() => monthlyTrend(rows), [rows]);
  const visibleRows = useMemo(() => applyBand(rows, band), [rows, band]);

  const coverage = activeDrivers === 0 ? "—" : `${summary.driverCount} of ${activeDrivers}`;

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-5xl text-darkBlue font-bold">Driver Satisfaction</div>
          <div className="text-2xl text-gray-500 font-medium">What drivers say about the app</div>
        </div>

        <div className="flex flex-wrap gap-2">
          {surveys.length > 1 && (
            <select
              value={surveyId ?? ""}
              onChange={(event) =>
                setSurveyId(event.target.value === "" ? undefined : event.target.value)
              }
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-darkBlue font-semibold"
            >
              <option value="">All surveys</option>
              {surveys.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {survey.title ?? "Untitled survey"}
                </option>
              ))}
            </select>
          )}

          <select
            value={band}
            onChange={(event) => setBand(event.target.value as Band)}
            className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-darkBlue font-semibold"
          >
            {BANDS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <StatTile
          label="Average score"
          value={summary.averageScore === null ? "—" : summary.averageScore.toFixed(1)}
          hint={`${summary.scoredCount} scored answers`}
          icon={<Star className="w-5 h-5" />}
        />
        <StatTile
          label="Needs a follow-up"
          value={summary.detractors.toString()}
          hint={`${DETRACTOR_MAX_SCORE} or below — each one wrote why`}
          tone={summary.detractors > 0 ? "bad" : "neutral"}
          icon={<MessageSquareWarning className="w-5 h-5" />}
        />
        <StatTile
          label="Promoters"
          value={summary.promoters.toString()}
          hint={summary.nps === null ? "No answers yet" : `NPS ${summary.nps}`}
          tone={summary.promoters > 0 ? "good" : "neutral"}
          icon={<ThumbsUp className="w-5 h-5" />}
        />
        <StatTile
          label="Drivers heard from"
          value={coverage}
          hint="Active drivers who have answered at least once"
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      <div className="mb-6">
        <ScoreTrendChart points={trend} />
      </div>

      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500">
          Loading answers…
        </div>
      ) : (
        <ResponsesTable rows={visibleRows} />
      )}
    </div>
  );
}
