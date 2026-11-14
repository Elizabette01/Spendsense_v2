import { describe, expect, it } from "vitest";
import { safeCallbackUrl } from "./redirect";

describe("safeCallbackUrl", () => {
  it("keeps a path on our own site, with its query string", () => {
    expect(safeCallbackUrl("/budgets?month=10")).toBe("/budgets?month=10");
  });

  it("falls back to the dashboard when nothing is given", () => {
    expect(safeCallbackUrl(null)).toBe("/dashboard");
    expect(safeCallbackUrl("")).toBe("/dashboard");
  });

  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
  ])("rejects %j, which would leave the site", (value) => {
    expect(safeCallbackUrl(value)).toBe("/dashboard");
  });

  it("doesn't send people back to the login or signup pages", () => {
    expect(safeCallbackUrl("/login")).toBe("/dashboard");
    expect(safeCallbackUrl("/signup/anything")).toBe("/dashboard");
  });

  it("allows a path that only looks like an auth page", () => {
    expect(safeCallbackUrl("/loginhelp")).toBe("/loginhelp");
  });
});