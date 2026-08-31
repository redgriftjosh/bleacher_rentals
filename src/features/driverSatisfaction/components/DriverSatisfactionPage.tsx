"use client";

import { useMemo, useState } from "react";
import { MessageSquareWarning, Star, ThumbsUp, Users } from "lucide-react";
import {
  useActiveDriverCount,
  useSatisfactionRows,
  useSurveyOptions,
} from "../hooks/useSatisfactionRows";
import { DETRACTOR_MAX_SCORE, PROMOTER_MIN_SCORE, scoreTrend, summarize } from "../utils/aggregate";
import { formatAverageScore, formatScore } from "../utils/formatScore";
import {
  DEFAULT_PERIOD,
  describePeriod,
  filterByPeriod,
  type PeriodSelection,
} from "../utils/period";
import {
  applyScoreFilter,
  DEFAULT_SCORE_FILTER,
  describeScoreFilter,
  type ScoreFilter,
} from "../utils/scoreFilter";
import PeriodControl from "./PeriodControl";
import ResponsesTable from "./ResponsesTable";
import ScoreFilterControl from "./ScoreFilterControl";
import ScoreTrendChart from "./ScoreTrendChart";
import StatTile from "./StatTile";

/**
 * Driver Satisfaction Score.
 *
 * Reads straight from the local PowerSync database — the same rows the phones
 * wrote — so the page is live without a refresh and works from whatever has
 * already synced.
 *
 * TWO FILTERS, TWO SCOPES — and the split is deliberate.
 *
 * The **period** at the top is page-wide: tiles, trend and list all describe the
 * same slice of time, which is the only way "average 8.2" and the line above it
 * can be read together.
 *
 * The **score filter** sits inside the answers card and narrows that list
 * alone. Making it page-wide would produce tiles that cannot say anything: the
 * average of "6/10 and below" is a restatement of the filter, and "promoters"
 * under it is 0 by construction. The interesting question is the opposite one —
 * how do the low scores sit inside the whole picture — and that needs the tiles
 * to keep describing everything while the list narrows.
 */
export default function DriverSatisfactionPage() {
  const surveys = useSurveyOptions();
  const [surveyId, setSurveyId] = useState<string | undefined>(undefined);
  const [period, setPeriod] = useState<PeriodSelection>(DEFAULT_PERIOD);
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>(DEFAULT_SCORE_FILTER);

  const { rows, isLoading } = useSatisfactionRows(surveyId);
  const activeDrivers = useActiveDriverCount();

  // One clock for the whole render, so the period cannot resolve differently
  // between the tiles and the list.
  const [now] = useState(() => Date.now());

  const periodRows = useMemo(() => filterByPeriod(rows, period, now), [rows, period, now]);
  const summary = useMemo(() => summarize(periodRows), [periodRows]);
  const trend = useMemo(
    () => scoreTrend(periodRows, period.granularity),
    [periodRows, period.granularity],
  );
  const visibleRows = useMemo(
    () => applyScoreFilter(periodRows, scoreFilter),
    [periodRows, scoreFilter],
  );

  const periodLabel = describePeriod(period, now);
  const coverage = activeDrivers === 0 ? "—" : `${summary.driverCount} of ${activeDrivers}`;

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <div className="text-5xl text-darkBlue font-bold">Driver Satisfaction</div>
          <div className="text-2xl text-gray-500 font-medium">
            What drivers say about the app · {periodLabel}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {surveys.length > 1 && (
            <select
              value={surveyId ?? ""}
              onChange={(event) =>
                setSurveyId(event.target.value === "" ? undefined : event.target.value)
              }
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white text-darkBlue font-semibold"
              aria-label="Survey"
            >
              <option value="">All surveys</option>
              {surveys.map((survey) => (
                <option key={survey.id} value={survey.id}>
                  {survey.title ?? "Untitled survey"}
                </option>
              ))}
            </select>
          )}

          <PeriodControl value={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <StatTile
          label="Average score"
          value={formatAverageScore(summary.averageScore)}
          hint={`${summary.scoredCount} scored answers`}
          icon={<Star className="w-5 h-5" />}
        />
        <StatTile
          label="Needs a follow-up"
          value={summary.detractors.toString()}
          hint={`${formatScore(DETRACTOR_MAX_SCORE)} or below — each one wrote why`}
          tone={summary.detractors > 0 ? "bad" : "neutral"}
          icon={<MessageSquareWarning className="w-5 h-5" />}
        />
        <StatTile
          label="Promoters"
          value={summary.promoters.toString()}
          hint={
            summary.nps === null
              ? "No answers yet"
              : `${formatScore(PROMOTER_MIN_SCORE)} or above · NPS ${summary.nps}`
          }
          tone={summary.promoters > 0 ? "good" : "neutral"}
          icon={<ThumbsUp className="w-5 h-5" />}
        />
        <StatTile
          label="Drivers heard from"
          value={coverage}
          hint="Active drivers who answered in this period"
          icon={<Users className="w-5 h-5" />}
        />
      </div>

      <div className="mb-6">
        <ScoreTrendChart points={trend} granularity={period.granularity} />
      </div>

      {isLoading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500">
          Loading answers…
        </div>
      ) : (
        <ResponsesTable
          rows={visibleRows}
          totalInPeriod={periodRows.length}
          filterLabel={describeScoreFilter(scoreFilter)}
          filterControl={<ScoreFilterControl value={scoreFilter} onChange={setScoreFilter} />}
        />
      )}
    </div>
  );
}
