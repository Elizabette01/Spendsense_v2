/**
 * Small helpers that turn raw FormData values into something Zod can check.
 * They never validate on their own: the caller always runs a schema after.
 */

/** A JSON text field: `undefined` when missing or empty, `null` when not valid JSON. */
export function jsonField(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string" || value === "") return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** A plain text field: `undefined` when missing, empty or a file. */
export function textField(value: FormDataEntryValue | null): unknown {
  return typeof value === "string" && value !== "" ? value : undefined;
}
