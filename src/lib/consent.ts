// ---------- Settings ----------

export const CONSENT_COOKIE = "ss_consent";
export const CONSENT_VERSION = 1;
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 182; // about 6 months
export const CONSENT_CHANGED_EVENT = "ss:consent-changed";

export type ConsentCategory = "analytics";

export type Consent = {
  version: number;
  analytics: boolean;
  decidedAt: string; // ISO date string
};

// ---------- Creating, saving, reading ----------

export function createConsent(
  choices: { analytics: boolean },
  now: Date = new Date(),
): Consent {
  return {
    version: CONSENT_VERSION,
    analytics: choices.analytics,
    decidedAt: now.toISOString(),
  };
}

export function serializeConsent(consent: Consent): string {
  return encodeURIComponent(JSON.stringify(consent));
}

export function parseConsent(
  raw: string | null | undefined,
  now: Date = new Date(),
): Consent | null {
  if (!raw) return null;

  let value: unknown;
  try {
    value = JSON.parse(decodeURIComponent(raw));
  } catch {
    return null;
  }

  if (typeof value !== "object" || value === null) return null;
  const { version, analytics, decidedAt } = value as Record<string, unknown>;

  if (version !== CONSENT_VERSION) return null;
  if (typeof analytics !== "boolean") return null;
  if (typeof decidedAt !== "string") return null;

  const decidedTime = Date.parse(decidedAt);
  if (Number.isNaN(decidedTime)) return null;
  if (now.getTime() - decidedTime > CONSENT_MAX_AGE_SECONDS * 1000) return null;

  return { version, analytics, decidedAt };
}

export function hasConsent(
  consent: Consent | null,
  category: ConsentCategory,
): boolean {
  return consent?.[category] === true;
}

// ---------- Browser only ----------

export function readConsentFromDocument(): Consent | null {
  if (typeof document === "undefined") return null;
  const prefix = `${CONSENT_COOKIE}=`;
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(prefix));
  return parseConsent(entry?.slice(prefix.length));
}

export function writeConsentToDocument(consent: Consent): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${CONSENT_COOKIE}=${serializeConsent(consent)}` +
    `; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;

  window.dispatchEvent(
    new CustomEvent<Consent>(CONSENT_CHANGED_EVENT, { detail: consent }),
  );
}

export function clearAnalyticsCookies(): void {
  const names = document.cookie
    .split("; ")
    .map((cookie) => cookie.split("=")[0])
    .filter((name) => name === "_ga" || name.startsWith("_ga_") || name === "_gid");

  const host = window.location.hostname;
  const parts = host.split(".");
  const domains: (string | undefined)[] = [undefined];
  for (let i = 0; i < parts.length - 1; i++) {
    domains.push(`.${parts.slice(i).join(".")}`);
  }

  for (const name of names) {
    for (const domain of domains) {
      document.cookie =
        `${name}=; Path=/; Max-Age=0` + (domain ? `; Domain=${domain}` : "");
    }
  }
}