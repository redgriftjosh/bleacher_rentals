"use client";

import { PageHeader } from "@/components/PageHeader";
import { WeeklyLeaderboardPanel } from "@/features/weeklyLeaderboard/components/WeeklyLeaderboardPanel";

export default function LeaderboardPage() {
  return (
    <main className="p-6 space-y-6">
      <PageHeader title="Weekly Leaderboard" subtitle="Booked value this week (Monday - Sunday)" />
      <WeeklyLeaderboardPanel />
    </main>
  );
}
