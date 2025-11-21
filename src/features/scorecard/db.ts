import { createErrorToast } from "@/components/toasts/ErrorToast";
import { getSupabaseClient } from "@/utils/supabase/getSupabaseClient";

export type EventWithUser = {
  event_id: number;
  event_name: string;
  created_at: string;
  event_start: string;
  event_end: string;
  contract_revenue_cents: number | null;
  contract_status: string;
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

export async function fetchEventsGroupedByWeek(token: string | null): Promise<{
  weeks: WeekData[];
}> {
  if (!token) {
    createErrorToast(["No token found"]);
    return { weeks: [] };
  }

  const supabase = await getSupabaseClient(token);

  // Fetch events with their account manager data
  const { data: events, error } = await supabase
    .from("Events")
    .select(
      `
      event_id,
      event_name,
      created_at,
      event_start,
      event_end,
      contract_revenue_cents,
      contract_status,
      created_by_user_id,
      Users!Events_created_by_user_id_fkey (
        first_name,
        last_name,
        clerk_user_id
      )
    `
    )
    .order("event_start", { ascending: false });

  if (error) {
    createErrorToast(["Failed to fetch Events.", error.message]);
    return { weeks: [] };
  }

  // Group events by week
  const weekMap = new Map<string, EventWithUser[]>();

  events?.forEach((event) => {
    const eventStartDate = new Date(event.event_start);
    const weekStart = getWeekStart(eventStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekLabel = formatWeekLabel(weekStart, weekEnd);

    const eventWithUser: EventWithUser = {
      event_id: event.event_id,
      event_name: event.event_name,
      created_at: event.created_at,
      event_start: event.event_start,
      event_end: event.event_end,
      contract_revenue_cents: event.contract_revenue_cents,
      contract_status: event.contract_status,
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

  // If same month, only show month once
  //   if (startMonth === endMonth) {
  //     return `${startMonth} ${startDay} - ${endDay}`;
  //   }

  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}
