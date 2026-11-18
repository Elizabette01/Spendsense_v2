import { describe, expect, it, vi } from "vitest";

import { MAX_FILE_BYTES } from "./server/read-statement";
import { MAX_UPLOAD_BYTES, checkUpload } from "@/components/statement-import/file-rules";

vi.mock("server-only", () => ({}));

describe("checkUpload", () => {
  it("matches the server's size limit", () => {
    expect(MAX_UPLOAD_BYTES).toBe(MAX_FILE_BYTES);
  });

  it.each(["march.csv", "MARCH.CSV", "march.xlsx", "march.xls", "march.pdf"])(
    "accepts %s",
    (name) => {
      expect(checkUpload({ name, size: 100 })).toBeNull();
    },
  );

  it.each(["notes.txt", "march", "march.csv.exe", "march.numbers"])(
    "rejects %s",
    (name) => {
      expect(checkUpload({ name, size: 100 })).toBe("wrong_file_type");
    },
  );

  it("rejects empty and over-limit files", () => {
    expect(checkUpload({ name: "a.csv", size: 0 })).toBe("empty");
    expect(checkUpload({ name: "a.csv", size: MAX_UPLOAD_BYTES })).toBeNull();
    expect(checkUpload({ name: "a.csv", size: MAX_UPLOAD_BYTES + 1 })).toBe("too_large");
  });
});
