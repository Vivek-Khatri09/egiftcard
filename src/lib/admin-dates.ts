/** Today's date in Nepal (UTC+05:45) as YYYY-MM-DD. */
export function nepalToday(offsetDays = 0): string {
  return new Date(Date.now() + (5 * 60 + 45) * 60_000 + offsetDays * 86_400_000).toISOString().slice(0, 10);
}

export const isDateStr = (s: string | undefined): s is string => Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)));
