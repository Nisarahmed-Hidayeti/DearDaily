/** Calendar dates have no timezone. Construct local noon to avoid UTC date shifts. */
export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}
export function formatLocalDate(value: Date): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(value)
}
