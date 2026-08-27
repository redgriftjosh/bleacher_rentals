"use client";

import { DETRACTOR_MAX_SCORE, type SatisfactionRow } from "../utils/aggregate";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "—";
  return at.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function scoreClass(score: number | null): string {
  if (score === null) return "bg-gray-100 text-gray-600";
  if (score <= DETRACTOR_MAX_SCORE) return "bg-red-100 text-red-700";
  if (score >= 9) return "bg-green-100 text-green-700";
  return "bg-amber-100 text-amber-700";
}

type ResponsesTableProps = {
  rows: SatisfactionRow[];
};

/**
 * Every answer, newest first.
 *
 * The reason column is the point of the page — a score is a number, but the
 * sentence next to a 4 is the thing somebody can act on — so it is given room
 * rather than truncated to a tooltip.
 */
export default function ResponsesTable({ rows }: ResponsesTableProps) {
  if (rows.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-gray-500">
        Nothing matches this filter.
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Driver</th>
              <th className="text-left font-semibold px-4 py-3">Score</th>
              <th className="text-left font-semibold px-4 py-3">Question</th>
              <th className="text-left font-semibold px-4 py-3">What they said</th>
              <th className="text-left font-semibold px-4 py-3">Submitted</th>
              <th className="text-left font-semibold px-4 py-3">App</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.responseId}-${index}`} className="border-t border-gray-100 align-top">
                <td className="px-4 py-3 font-medium text-darkBlue whitespace-nowrap">
                  {row.driverName}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex min-w-8 justify-center rounded-md px-2 py-1 font-bold ${scoreClass(row.score)}`}
                  >
                    {row.score ?? "—"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-xs">{row.prompt}</td>
                <td className="px-4 py-3 text-gray-800 max-w-md whitespace-pre-wrap">
                  {row.reason?.trim() ? row.reason : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {formatDate(row.submittedAt)}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {row.appVersion ?? "—"}
                  {row.appPlatform ? ` · ${row.appPlatform}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
