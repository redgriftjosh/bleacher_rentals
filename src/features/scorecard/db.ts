import { createErrorToast } from "@/components/toasts/ErrorToast";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../../../database.types";

export type EventWithUser = {
  event_id: string;
  event_name: string;
  created_at: string;
  event_start: string;
  event_end: string;
  contract_revenue_cents: number | null;
  contract_status: string | null;
  account_manager: {
    first_name: string;
    last_name: string;
    clerk_user_id: string | null;
  } | null;
};

export type WeekData = {
  weekLabel: string;
  weekStart: Date;
  weekEnd: Date;
  startDate: string;
  events: EventWithUser[];
};

export async function fetchEventsGroupedByWeek(
  supabase: SupabaseClient<Database>,
): Promise<{
  weeks: WeekData[];
}> {
  // Fetch events with their account manager data
  const { data: events, error } = await supabase
    .from("Events")
    .select(
      `
      id,
      event_name,
      created_at,
      event_start,
      event_end,
      contract_revenue_cents,
      event_status,
      created_by_user_uuid,
      Users!Events_created_by_user_uuid_fkey (
        first_name,
        last_name,
        clerk_user_id
      )
    `,
    )
    .order("event_start", { ascending: false });

  if (error) {
    createErrorToast(["Failed to fetch Events.", error.message]);
    return { weeks: [] };
  }

  // Group events by week
  const weekMap = new Map<string, EventWithUser[]>();

  events?.forEach((event: (typeof events)[number]) => {
    const eventStartDate = new Date(event.event_start);
    const weekStart = getWeekStart(eventStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekLabel = formatWeekLabel(weekStart, weekEnd);

    const eventWithUser: EventWithUser = {
      event_id: event.id,
      event_name: event.event_name,
      created_at: event.created_at,
      event_start: event.event_start,
      event_end: event.event_end,
      contract_revenue_cents: event.contract_revenue_cents,
      contract_status: event.event_status,
      account_manager: Array.isArray(event.Users) ? event.Users[0] : event.Users,
    };

    if (!weekMap.has(weekLabel)) {
      weekMap.set(weekLabel, []);
    }
    weekMap.get(weekLabel)!.push(eventWithUser);
  });

  // Convert map to array of WeekData
  const weeks: WeekData[] = Array.from(weekMap.entries()).map(([weekLabel, events]) => {
    const weekStart = getWeekStart(new Date(events[0].event_start));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6); // Sunday is 6 days after Monday

    return {
      weekLabel: formatWeekLabel(weekStart, weekEnd),
      weekStart,
      weekEnd,
      startDate: events[0].event_start,
      events,
    };
  });

  // Sort weeks by start date (most recent first)
  weeks.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return { weeks };
}

// Get the start of the week (Monday) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, else go to Monday
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Format week label like "Nov 17 - Nov 23"
function formatWeekLabel(weekStart: Date, weekEnd: Date): string {
  const startMonth = weekStart.toLocaleDateString("en-US", { month: "short" });
  const startDay = weekStart.getDate();
  const endMonth = weekEnd.toLocaleDateString("en-US", { month: "short" });
  const endDay = weekEnd.getDate();

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

export async function fetchYearToDateRevenue(
  supabase: SupabaseClient<Database>,
): Promise<number> {
  // Get the start of the current year
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1); // January 1st

  // Fetch all signed events from this year
  const { data: events, error } = await supabase
    .from("Events")
    .select("contract_revenue_cents")
    .eq("event_status", "booked")
    .gte("event_start", yearStart.toISOString());

  if (error) {
    createErrorToast(["Failed to fetch year-to-date revenue.", error.message]);
    return 0;
  }

  // Sum up the revenue (convert from cents to dollars)
  const totalCents =
    events?.reduce(
      (sum: number, event: { contract_revenue_cents: number | null }) =>
        sum + (event.contract_revenue_cents || 0),
      0,
    ) || 0;
  return totalCents / 100; // Convert cents to dollars
}

export type MonthlyRevenueData = {
  month: string;
  revenue: number;
  eventCount: number;
};

export async function fetchMonthlyRevenue(
  supabase: SupabaseClient<Database>,
): Promise<MonthlyRevenueData[]> {
  // Get the start of the current year
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1); // January 1st

  // Fetch all booked events from this year
  const { data: events, error } = await supabase
    .from("Events")
    .select("contract_revenue_cents, event_start")
    .eq("event_status", "booked")
    .gte("event_start", yearStart.toISOString())
    .order("event_start", { ascending: true });

  if (error) {
    createErrorToast(["Failed to fetch monthly revenue.", error.message]);
    return [];
  }

  // Group by month
  const monthMap = new Map<string, { revenue: number; count: number }>();

  events?.forEach(
    (event: { contract_revenue_cents: number | null; event_start: string }) => {
      const eventDate = new Date(event.event_start);
      const monthKey = eventDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { revenue: 0, count: 0 });
      }

      const monthData = monthMap.get(monthKey)!;
      monthData.revenue += (event.contract_revenue_cents || 0) / 100; // Convert to dollars
      monthData.count += 1;
    },
  );

  // Convert to array and fill in missing months
  const monthlyData: MonthlyRevenueData[] = [];
  const currentMonth = now.getMonth();

  for (let i = 0; i <= currentMonth; i++) {
    const date = new Date(now.getFullYear(), i, 1);
    const monthKey = date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    const data = monthMap.get(monthKey);

    monthlyData.push({
      month: date.toLocaleDateString("en-US", { month: "short" }),
      revenue: data?.revenue || 0,
      eventCount: data?.count || 0,
    });
  }

  return monthlyData;
}
