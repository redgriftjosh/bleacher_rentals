"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useChangeLog } from "../hooks/useChangeLog";
import { useCurrentUser } from "@/hooks/db/useCurrentUser";
import { markChangelogRead } from "../db/markChangelogRead";
import { ChangeLogMarkdown } from "./ChangeLogMarkdown";
import { toEpochMs } from "../util/timestamps";

function formatReleasedAt(value: string): string {
  const ms = toEpochMs(value);
  if (ms === null) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const ChangeLogPage = () => {
  const { entries, isLoading } = useChangeLog();
  const { data: userData } = useCurrentUser();
  const userUuid = userData?.[0]?.id ?? null;

  // Opening the page marks everything up to now as seen.
  useEffect(() => {
    if (!userUuid) return;
    void markChangelogRead(userUuid);
  }, [userUuid]);

  return (
    <main className="h-full overflow-auto p-6" data-testid="changelog-page">
      <div className="mx-auto max-w-3xl">
        <PageHeader title="What's New" subtitle="Everything we've shipped, newest first." />

        {isLoading && <p className="mt-8 text-sm text-gray-500">Loading…</p>}

        {!isLoading && entries.length === 0 && (
          <p className="mt-8 text-sm text-gray-500" data-testid="changelog-empty">
            No releases yet. Check back after the next deploy.
          </p>
        )}

        <div className="mt-8 space-y-10">
          {entries.map((entry) => (
            <article key={entry.id} data-testid="changelog-entry" data-version={entry.version}>
              <div className="flex items-baseline gap-3 border-b border-gray-200 pb-2">
                <h2 className="text-lg font-semibold text-darkBlue">{entry.version}</h2>
                <span className="text-sm text-gray-500">{formatReleasedAt(entry.released_at)}</span>
              </div>
              <div className="pt-4">
                <ChangeLogMarkdown body={entry.body_md} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
};
