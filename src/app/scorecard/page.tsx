"use client";

import { ScorecardStatsProvider } from "@/features/scorecard/hooks/ScorecardStatsContext";
import { ScorecardContent } from "@/features/scorecard/components/ScorecardContent";

export default function ScorecardPage() {
  return (
    <ScorecardStatsProvider>
      <ScorecardContent />
    </ScorecardStatsProvider>
  );
}
