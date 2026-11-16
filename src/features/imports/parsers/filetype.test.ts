import { describe, expect, it } from "vitest";
import { sniffFileKind } from "./filetype";

function bytes(...parts: (number[] | string)[]): Uint8Array {
  const out: number[] = [];
  for (const part of parts) {
    if (typeof part === "string") out.push(...new TextEncoder().encode(part));
    else out.push(...part);
  }
  return new Uint8Array(out);
}

describe("sniffFileKind", () => {
  it("recognises a PDF, even with a little junk before the marker", () => {
    expect(sniffFileKind(bytes("%PDF-1.7\n"))).toBe("pdf");
    expect(sniffFileKind(bytes([0x0a, 0x0a], "%PDF-1.4"))).toBe("pdf");
  });

  it("recognises a zip file, which is what .xlsx is", () => {
    expect(sniffFileKind(bytes([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]))).toBe("xlsx");
  });

  it("recognises an old-style .xls file", () => {
    expect(
      sniffFileKind(bytes([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00])),
    ).toBe("xls");
  });

  it("recognises a web page saved as .xls", () => {
    expect(sniffFileKind(bytes("  <html><table><tr><td>Date</td>"))).toBe("markup");
    expect(sniffFileKind(bytes("\uFEFF<?xml version=\"1.0\"?>"))).toBe("markup");
  });

  it("recognises plain text such as CSV", () => {
    expect(sniffFileKind(bytes("Date,Description,Amount\n"))).toBe("text");
  });

  it("calls anything else unknown", () => {
    expect(sniffFileKind(bytes([0x89, 0x50, 0x4e, 0x47, 0x00, 0x0d]))).toBe("unknown");
  });

  it("doesn't trust the name: a PDF renamed .csv is still a PDF", () => {
    expect(sniffFileKind(bytes("%PDF-1.7"))).not.toBe("text");
  });
});