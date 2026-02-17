/**
 * Get the current day of week (1=Monday, 7=Sunday)
 */
export function getCurrentDayOfWeek(): number {
  const day = new Date().getDay();
  return day === 0 ? 7 : day; // Convert Sunday from 0 to 7
}
