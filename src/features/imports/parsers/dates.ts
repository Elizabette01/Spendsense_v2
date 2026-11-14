export type DateOrder = "dmy" | "mdy";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function toIsoDate(year: number, month: number, day: number): string | null {
  if (year < 1900 || year > 2100) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  const unchanged =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!unchanged) return null;

  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

function expandYear(text: string): number {
  return text.length === 2 ? 2000 + Number(text) : Number(text);
}

/** Turns bank text such as "31/01/2026" or "15 Mar 2026" into "2026-01-31", or null. */
export function parseDate(
  input: string,
  order: DateOrder = "dmy",
): string | null {
  const text = input.trim();

  // 2026-01-31, optionally followed by a time
  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(text);
  if (match) {
    return toIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
  }

  // 31/01/2026, 31-01-2026, 31.01.26
  match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4}|\d{2})$/.exec(text);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const [day, month] = order === "dmy" ? [first, second] : [second, first];
    return toIsoDate(expandYear(match[3]), month, day);
  }

  // 15 Mar 2026, 15-Mar-26, 3 September 2026
  match = /^(\d{1,2})[ -]([A-Za-z]{3,9})[ -](\d{4}|\d{2})$/.exec(text);
  if (match) {
    const month = MONTHS[match[2].slice(0, 3).toLowerCase()];
    if (!month) return null;
    return toIsoDate(expandYear(match[3]), month, Number(match[1]));
  }

  return null;
}

/** For saving: a calendar day as a Date at midnight UTC. */
export function isoDateToUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}