/**
 * Upload rules the browser checks before sending a file. Browser-safe.
 * The server checks again (`server/read-statement.ts`); a test keeps the
 * two limits equal.
 *
 * Why check in the browser at all: a request over the Server Actions body
 * limit (4.5 MB in next.config.ts) is rejected before the action runs, so
 * the action could never explain it. The browser must.
 */

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls", ".pdf"] as const;

/** For the file input's `accept` attribute. */
export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

export type UploadProblem = "wrong_file_type" | "too_large" | "empty";

/** What's wrong with a chosen file, or null if it can be sent. */
export function checkUpload(file: { name: string; size: number }): UploadProblem | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension))) {
    return "wrong_file_type";
  }
  if (file.size === 0) return "empty";
  if (file.size > MAX_UPLOAD_BYTES) return "too_large";
  return null;
}
