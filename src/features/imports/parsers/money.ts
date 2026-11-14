const MAX_MINOR = 2_147_483_647; // largest value a Postgres INTEGER can hold
const GROUPED = /^\d{1,3}(,\d{3})+(\.\d+)?$/;
const PLAIN = /^(\d+)(?:\.(\d{1,2}))?$/;

/** Turns bank text such as "£1,234.56" or "(5.00)" into whole pence, or null. */
export function parseMoneyToMinor(input: string): number | null {
  let text = input.trim().replace(/\u2212/g, "-");
  let negative = false;

  // (12.34) means money out
  if (text.startsWith("(") && text.endsWith(")")) {
    negative = true;
    text = text.slice(1, -1);
  }

  text = text.replace(/[£\s]/g, "");

  // Sign at the front, or a minus at the end
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1);
  } else if (text.startsWith("+")) {
    text = text.slice(1);
  } else if (text.endsWith("-")) {
    negative = true;
    text = text.slice(0, -1);
  }

  // Thousands separators must be in the right places
  if (text.includes(",")) {
    if (!GROUPED.test(text)) return null;
    text = text.replace(/,/g, "");
  }

  const match = PLAIN.exec(text);
  if (!match) return null;

  const pounds = Number(match[1]);
  const pence = Number((match[2] ?? "").padEnd(2, "0"));
  const minor = pounds * 100 + pence;
  if (minor > MAX_MINOR) return null;

  return negative && minor !== 0 ? -minor : minor;
}