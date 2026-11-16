import { decodeText } from "./csv";

export type FileKind = "pdf" | "xlsx" | "xls" | "markup" | "text" | "unknown";

const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const ZIP = [0x50, 0x4b, 0x03, 0x04]; // PK, then two control bytes
const OLE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // old Office files

function startsWith(bytes: Uint8Array, signature: number[], at = 0): boolean {
  return signature.every((byte, i) => bytes[at + i] === byte);
}

/** Works out what a file really is from its first bytes, whatever its name says. */
export function sniffFileKind(bytes: Uint8Array): FileKind {
  // The PDF marker may sit a little way in, so look through the first 1 KB
  const head = bytes.subarray(0, 1024);
  for (let i = 0; i <= head.length - PDF.length; i++) {
    if (startsWith(head, PDF, i)) return "pdf";
  }

  if (startsWith(bytes, ZIP)) return "xlsx";
  if (startsWith(bytes, OLE)) return "xls";

  const text = decodeText(bytes.subarray(0, 512));
  if (text === null) return "unknown";
  return text.trimStart().startsWith("<") ? "markup" : "text";
}