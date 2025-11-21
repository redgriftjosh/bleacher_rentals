"use client";

import { useAuth } from "@clerk/nextjs";
import { fetchEventsGroupedByWeek, WeekData } from "../db";
import { useQuery } from "@tanstack/react-query";
import LoadingSpinner from "@/components/LoadingSpinner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { WeekHeader } from "./WeekHeader";
import { WeekTable } from "./WeekTable";

type WeekMetrics = {
  totalQuotes: number;
  totalBooked: number;
  totalLost: number;
  totalQuotedValue: number;
  totalSignedValue: number;
  totalLostValue: number;
};

function calculateWeekMetrics(week: WeekData): WeekMetrics {
  let totalQuotes = 0;
  let totalBooked = 0;
  let totalLost = 0;
  let totalQuotedValue = 0;
  let totalSignedValue = 0;
  let totalLostValue = 0;

  week.events.forEach((event) => {
    if (event.contract_status === "QUOTED") {
      totalQuotes++;
      totalQuotedValue += event.contract_revenue_cents || 0;
    } else if (event.contract_status === "BOOKED") {
      totalBooked++;
      totalSignedValue += event.contract_revenue_cents || 0;
    } else if (event.contract_status === "LOST") {
      totalLost++;
      totalLostValue += event.contract_revenue_cents || 0;
    }
  });

  return {
    totalQuotes,
    totalBooked,
    totalLost,
    totalQuotedValue,
    totalSignedValue,
    totalLostValue,
  };
}

export function WeeksList() {
  const { getToken } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["scorecard-weeks"],
    queryFn: async () => {
      const token = await getToken({ template: "supabase" });
      return fetchEventsGroupedByWeek(token);
    },
  });

  const weeks = data?.weeks ?? [];

  if (error) {
    return (
      <div className="p-4">
        <p>Uh Oh, Something went wrong... 😬</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <LoadingSpinner />
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <div className="p-4">
        <p>No events found.</p>
      </div>
    );
  }

  return (
    <Accordion type="multiple" className="w-full space-y-0 border-t border-gray-400">
      {weeks.map((week, index) => {
        const metrics = calculateWeekMetrics(week);
        return (
          <AccordionItem key={week.weekLabel} value={`week-${index}`} className="border-b-0">
            <AccordionTrigger className="hover:no-underline [&>svg]:hidden py-0 cursor-pointer">
              <WeekHeader week={week} metrics={metrics} />
            </AccordionTrigger>
            <AccordionContent>
              <WeekTable week={week} />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
