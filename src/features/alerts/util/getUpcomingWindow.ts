export function getUpcomingWindowEnd(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysToAdd = day === 0 ? 7 : 14 - day;
  const end = new Date(now);
  end.setDate(end.getDate() + daysToAdd);
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

export function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}
