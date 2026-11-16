/**
 * Turns a raw bank description into a clean merchant name, and a key for
 * matching. Pure: text in, text out. Shared by imports, transactions and the
 * dashboard, so it lives in `src/lib/`.
 *
 *   "TESCO STORES 4521 LONDON GB"   → "Tesco Stores"
 *   "CARD PAYMENT TO PRET A MANGER" → "Pret A Manger"
 *   "AMAZON.CO.UK*MK1AB"            → "Amazon"
 */

/** Payment-processor and payment-type words at the start of a description. */
const PREFIXES = [
  /^CARD PAYMENT TO\s+/,
  /^CARD PAYMENT\s+/,
  /^CARD TRANSACTION\s+/,
  /^CONTACTLESS( PAYMENT)?\s+/,
  /^DIRECT DEBIT( PAYMENT)?( TO)?\s+/,
  /^STANDING ORDER( TO)?\s+/,
  /^FASTER PAYMENTS?( TO| FROM)?\s+/,
  /^BANK GIRO CREDIT\s+/,
  /^(POS|VIS|DD|SO|STO|BGC|FPO|FPI|BP|CHG|DEB|CR|DR|TFR)\s+/,
  /^(SQ|SUMUP|ZETTLE_?|IZ|SP|PAYPAL|CRV|GOOGLE|APPLE PAY)\s*\*\s*/,
];

/** Words that carry no merchant information wherever they appear at the end. */
const TRAILING_NOISE =
  /\s+(DD|SO|STO|BGC|FPO|FPI|POS|VIS|DEB|REF|REFUND|PAYMENT|ONLINE|CONTACTLESS|LTD|LIMITED|PLC|DAC|INC|LLC|GB|GBR|UK|IE|IRL|US|USA|NL|NLD|LU|LUX|FR|FRA|DE|DEU|ES|ESP|LONDON|MANCHESTER|BIRMINGHAM|LEEDS|GLASGOW|EDINBURGH|BRISTOL|LIVERPOOL|CARDIFF|BELFAST|SHEFFIELD|NEWCASTLE|NOTTINGHAM|LEICESTER|BRIGHTON|OXFORD|CAMBRIDGE|READING|WEMBLEY|CROYDON)$/;

const MONTHS = "JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC";

const NOISE = [
  // Masked card numbers and card suffixes: "CARD 1234", "XXXX1234", "****1234"
  /\bCARD\s+(NO\.?\s*)?[X*]*\d{4}\b/g,
  /[X*]{2,}\d{2,}/g,
  // Dates: 12/03, 12/03/2026, 2026-03-12, 07JUL, 07 JUL 26, ON 12 MAR
  /\bON\s+\d{1,2}\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\b/g,
  /\b\d{1,4}[/.-]\d{1,2}(?:[/.-]\d{2,4})?\b/g,
  new RegExp(`\\b\\d{1,2}\\s*(?:${MONTHS})[A-Z]*(?:\\s*\\d{2,4})?\\b`, "g"),
  // Times: 14:32
  /\b\d{1,2}:\d{2}(?::\d{2})?\b/g,
  // References: "REF 12345", "REF: AB12CD"
  /\bREF(?:ERENCE)?[:.]?\s*[A-Z0-9-]+\b/g,
  // Any remaining word that contains a digit and is 3+ characters (store numbers, IDs)
  /\b(?=[A-Z0-9-]*\d)[A-Z0-9-]{3,}\b/g,
  // Amounts in another currency: "12.50 EUR", "@ 1.17"
  /@\s*[\d.,]+/g,
];

/** Domains: "NETFLIX.COM" → "NETFLIX", "AMAZON.CO.UK" → "AMAZON". */
const DOMAIN = /\.(COM|CO\.UK|UK|NET|ORG|IO|IE)\b/g;

/** Kept in capitals when they're a whole word. */
const ACRONYMS = new Set([
  "AA", "ATM", "BP", "BT", "DVLA", "EE", "HMRC", "HSBC", "IKEA", "ISA", "JD",
  "KFC", "NHS", "NS&I", "RAC", "TFL", "TSB", "TV", "UK", "H&M", "M&S", "B&Q",
  "O2", "DWP", "AXA", "BUPA",
]);

function titleCase(text: string): string {
  return text
    .split(" ")
    .map((word) => {
      if (ACRONYMS.has(word)) return word === "TFL" ? "TfL" : word;
      return word
        .toLowerCase()
        .replace(/(^|[^a-z'])([a-z])/g, (_m, before: string, letter: string) =>
          `${before}${letter.toUpperCase()}`,
        );
    })
    .join(" ");
}

function squash(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/** A clean display name for the merchant behind a bank description. Never empty. */
export function deriveMerchant(description: string): string {
  const original = squash(description.normalize("NFKC").toUpperCase());
  let text = original;

  // 1. Payment-type and processor prefixes (repeat: "CARD PAYMENT TO SQ *CAFE")
  for (let pass = 0; pass < 3; pass++) {
    const before = text;
    for (const prefix of PREFIXES) text = text.replace(prefix, "");
    if (text === before) break;
  }

  // 2. "MERCHANT*REFERENCE": keep the merchant part
  const star = text.indexOf("*");
  if (star > 0) text = text.slice(0, star);
  text = text.replace(/\*/g, " ");

  // 3. Domains, dates, references, card numbers, store numbers
  text = text.replace(DOMAIN, " ");
  for (const pattern of NOISE) text = text.replace(pattern, " ");
  text = squash(text.replace(/[,;#]+/g, " "));

  // 4. Trailing countries, cities, legal suffixes and payment words
  for (let pass = 0; pass < 5; pass++) {
    const trimmed = text.replace(TRAILING_NOISE, "");
    if (trimmed === text) break;
    text = trimmed;
  }
  text = squash(text.replace(/[-/&.]+$/, ""));

  // 5. Nothing useful left: fall back to the description itself
  if (!/[A-Z]/.test(text)) text = original;
  if (!/[A-Z0-9]/.test(text)) return "Unknown";

  return titleCase(text).slice(0, 100);
}

/** The key merchant rules are stored and matched by: lowercase, letters and digits only. */
export function merchantKey(merchant: string): string {
  return squash(
    merchant
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[^a-z0-9&]+/g, " "),
  );
}
