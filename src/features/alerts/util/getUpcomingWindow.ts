/** Returns the end of the upcoming window as a local YYYY-MM-DD string (next Sunday). */
export function getUpcomingWindowEnd(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysToAdd = day === 0 ? 7 : 14 - day;
  const end = new Date(now);
  end.setDate(end.getDate() + daysToAdd);
  const y = end.getFullYear();
  const m = String(end.getMonth() + 1).padStart(2, "0");
  const d = String(end.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
