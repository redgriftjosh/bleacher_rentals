"use client";
import { WeeksList } from "@/features/scorecard/components/WeeksList";

export default function ScorecardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Scorecard</h1>
      <WeeksList />
    </div>
  );
}
