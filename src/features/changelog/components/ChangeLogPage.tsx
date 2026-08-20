"use client";

import { useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { useChangeLog } from "../hooks/useChangeLog";
import { useCurrentUser } from "@/hooks/db/useCurrentUser";
import { markChangelogRead } from "../db/markChangelogRead";
import { ChangeLogMarkdown } from "./ChangeLogMarkdown";
import { toEpochMs } from "../util/timestamps";
import { mergeVersionEntries, type VersionFile } from "../util/mergeVersionEntries";

function formatReleasedAt(value: string): string {
  const ms = toEpochMs(value);
  if (ms === null) return "";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** `files` comes from the server component — the committed versions/*.md bodies. */
export const ChangeLogPage = ({ files = [] }: { files?: VersionFile[] }) => {
  const { entries: rows, isLoading } = useChangeLog();
  const { data: userData } = useCurrentUser();
  const userUuid = userData?.[0]?.id ?? null;

  const entries = mergeVersionEntries(files, rows);

  // Opening the page marks everything up to now as seen.
  useEffect(() => {
    if (!userUuid) return;
    void markChangelogRead(userUuid);
  }, [userUuid]);

  return (
    <main className="h-full overflow-auto p-6" data-testid="changelog-page">
      <div className="mx-auto max-w-3xl">
        <PageHeader title="What's New" subtitle="Everything we've shipped, newest first." />

        {/* The files render immediately; only a cold DB with no files waits. */}
        {isLoading && entries.length === 0 && (
          <p className="mt-8 text-sm text-gray-500">Loading…</p>
        )}

        {!isLoading && entries.length === 0 && (
          <p className="mt-8 text-sm text-gray-500" data-testid="changelog-empty">
            No releases yet. Check back after the next deploy.
          </p>
        )}

        <div className="mt-8 space-y-10">
          {entries.map((entry) => (
            <article key={entry.id} data-testid="changelog-entry" data-version={entry.version}>
              <div className="-mx-16 rounded-md bg-darkBlue px-8 py-4">
                <h2 className="text-3xl font-bold text-white">{entry.version}</h2>
                {/* No date until this environment records the release. */}
                {formatReleasedAt(entry.released_at) && (
                  <p className="mt-0 text-sm font-medium text-white/70">
                    {formatReleasedAt(entry.released_at)}
                  </p>
                )}
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
