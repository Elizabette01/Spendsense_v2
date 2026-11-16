import { describe, expect, it } from "vitest";

import { RULES, matchBuiltInRule } from "./rules";

// Every system category id seeded by prisma/seed.ts
const SEEDED = [
  "sys_groceries", "sys_eating_out", "sys_transport", "sys_bills", "sys_housing",
  "sys_subscriptions", "sys_shopping", "sys_entertainment", "sys_personal_care",
  "sys_health_fitness", "sys_holidays", "sys_family", "sys_education", "sys_gifts",
  "sys_charity", "sys_finances", "sys_cash", "sys_expenses", "sys_general",
  "sys_salary", "sys_benefits", "sys_refunds", "sys_other_income", "sys_transfers",
  "sys_savings",
];

const OUT = -1_000;
const IN = 1_000;

describe("matchBuiltInRule: money out", () => {
  it.each([
    ["TESCO STORES 4521 LONDON GB", "sys_groceries"],
    ["SAINSBURYS S/MKTS", "sys_groceries"],
    ["CO-OP GROUP FOOD", "sys_groceries"],
    ["M&S SIMPLY FOOD 123", "sys_groceries"],
    ["PRET A MANGER", "sys_eating_out"],
    ["UBER EATS", "sys_eating_out"],
    ["DELIVEROO", "sys_eating_out"],
    ["UBER TRIP 12/03", "sys_transport"],
    ["TFL TRAVEL CH", "sys_transport"],
    ["TRAINLINE.COM", "sys_transport"],
    ["SHELL 1234 READING", "sys_transport"],
    ["TESCO PETROL", "sys_transport"],
    ["LAMBETH COUNCIL TAX DD", "sys_bills"],
    ["OCTOPUS ENERGY DD", "sys_bills"],
    ["THAMES WATER DD", "sys_bills"],
    ["VODAFONE LTD DD", "sys_bills"],
    ["EE LIMITED", "sys_bills"],
    ["TESCO MOBILE", "sys_bills"],
    ["EON NEXT", "sys_bills"],
    ["VIRGIN MEDIA DD", "sys_bills"],
    ["EXAMPLE LETTINGS LTD RENT", "sys_housing"],
    ["NATIONWIDE MORTGAGE", "sys_housing"],
    ["NETFLIX.COM", "sys_subscriptions"],
    ["SPOTIFY UK", "sys_subscriptions"],
    ["AMAZON PRIME*UK", "sys_subscriptions"],
    ["APPLE.COM/BILL", "sys_subscriptions"],
    ["AMAZON.CO.UK*MK1AB", "sys_shopping"],
    ["PRIMARK", "sys_shopping"],
    ["IKEA LTD WEMBLEY", "sys_shopping"],
    ["NEXT RETAIL", "sys_shopping"],
    ["ODEON CINEMAS", "sys_entertainment"],
    ["STEAM PURCHASE", "sys_entertainment"],
    ["BOOTS 1234", "sys_personal_care"],
    ["SUPERDRUG", "sys_personal_care"],
    ["PUREGYM LTD", "sys_health_fitness"],
    ["DENTAL PRACTICE LTD", "sys_health_fitness"],
    ["RYANAIR DAC", "sys_holidays"],
    ["AIRBNB * HMXYZ", "sys_holidays"],
    ["PETS AT HOME", "sys_family"],
    ["BRIGHT START NURSERY", "sys_family"],
    ["UDEMY", "sys_education"],
    ["MOONPIG", "sys_gifts"],
    ["JUSTGIVING DONATION", "sys_charity"],
    ["ADMIRAL INSURANCE", "sys_finances"],
    ["KLARNA", "sys_finances"],
    ["HMRC SELF ASSESSMENT", "sys_finances"],
    ["CASH ATM LINK 07JUL", "sys_cash"],
    ["TEAM LUNCH EXPENSES", "sys_expenses"],
    ["POST OFFICE COUNTER", "sys_general"],
    ["MONZO POT TRANSFER SAVINGS", "sys_savings"],
    ["TO SAVINGS ACCOUNT", "sys_savings"],
    ["BARCLAYCARD PAYMENT", "sys_transfers"],
    ["TRANSFER TO OWN ACCOUNT", "sys_transfers"],
  ])("%s → %s", (description, expected) => {
    expect(matchBuiltInRule(description, OUT)).toBe(expected);
  });
});

describe("matchBuiltInRule: money in", () => {
  it.each([
    ["ACME WIDGETS LTD SALARY", "sys_salary"],
    ["EXAMPLE CO PAYROLL", "sys_salary"],
    ["DWP UNIVERSAL CREDIT", "sys_benefits"],
    ["HMRC CHILD BENEFIT", "sys_benefits"],
    ["HMRC TAX REFUND", "sys_refunds"],
    ["AMAZON.CO.UK REFUND", "sys_refunds"],
    ["INTEREST PAID", "sys_other_income"],
    ["FROM POT SAVINGS", "sys_savings"],
    ["TRANSFER FROM OWN ACCOUNT", "sys_transfers"],
  ])("%s → %s", (description, expected) => {
    expect(matchBuiltInRule(description, IN)).toBe(expected);
  });

  it("treats money in from a shop or service as a refund", () => {
    expect(matchBuiltInRule("TESCO STORES 4521", IN)).toBe("sys_refunds");
    expect(matchBuiltInRule("RYANAIR DAC", IN)).toBe("sys_refunds");
    expect(matchBuiltInRule("NETFLIX.COM", IN)).toBe("sys_refunds");
  });
});

describe("matchBuiltInRule: signs", () => {
  it("never gives an income category to money out", () => {
    expect(matchBuiltInRule("SALARY ADVANCE REPAYMENT", OUT)).toBeNull();
    expect(matchBuiltInRule("REFUND OF DEPOSIT", OUT)).toBeNull();
  });

  it("treats transfers and savings the same both ways", () => {
    expect(matchBuiltInRule("MONZO POT", OUT)).toBe("sys_savings");
    expect(matchBuiltInRule("MONZO POT", IN)).toBe("sys_savings");
  });
});

describe("matchBuiltInRule: no guessing", () => {
  it.each([
    "TRANSFER FROM J DOE",
    "PAYMENT TO A SMITH",
    "XYZ123 UNKNOWN",
    "THREE HORSESHOES PUB",
    "",
  ])("%j needs review", (description) => {
    expect(matchBuiltInRule(description, OUT)).toBeNull();
    expect(matchBuiltInRule(description, IN)).toBeNull();
  });

  it("matches whole words only", () => {
    expect(matchBuiltInRule("SKYSCANNER", OUT)).toBe("sys_holidays"); // not Sky (bills)
    expect(matchBuiltInRule("JET2 HOLIDAYS", OUT)).toBe("sys_holidays"); // not Jet (fuel)
    expect(matchBuiltInRule("CASHBACK", IN)).toBe("sys_other_income"); // not Cash
    expect(matchBuiltInRule("PARENTAL", OUT)).toBeNull(); // not RENT
  });

  it("ignores case and extra spaces", () => {
    expect(matchBuiltInRule("  tesco   stores ", OUT)).toBe("sys_groceries");
  });
});

describe("RULES", () => {
  it("only uses seeded system category ids", () => {
    for (const rule of RULES) expect(SEEDED).toContain(rule.categoryId);
  });

  it("covers every seeded system category", () => {
    const covered = new Set(RULES.map((rule) => rule.categoryId));
    expect(SEEDED.filter((id) => !covered.has(id as never))).toEqual([]);
  });
});
