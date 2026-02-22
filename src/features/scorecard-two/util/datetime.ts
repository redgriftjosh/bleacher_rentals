/**
 * Get the current day of week (1=Monday, 7=Sunday)
 */
export function getCurrentDayOfWeek(): number {
  const day = new Date().getDay();
  return day === 0 ? 7 : day; // Convert Sunday from 0 to 7
}

export function toLocalDateKey(input: string) {
  const d = new Date(input);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getDateKeys(startIso: string, endIsoExclusive: string) {
  const start = new Date(startIso);
  const end = new Date(endIsoExclusive);
  const keys: string[] = [];

  const cursor = new Date(start);
  while (cursor < end) {
    const yyyy = cursor.getFullYear();
    const mm = String(cursor.getMonth() + 1).padStart(2, "0");
    const dd = String(cursor.getDate()).padStart(2, "0");
    keys.push(`${yyyy}-${mm}-${dd}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export const isWeekdayKey = (dateKey: string) => {
  const d = new Date(`${dateKey}T00:00:00`); // local midnight, no UTC drift
  const day = d.getDay(); // 0=Sun,6=Sat
  return day >= 1 && day <= 5;
};
