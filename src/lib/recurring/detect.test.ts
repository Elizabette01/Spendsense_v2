import { describe, expect, it } from "vitest";

import {
  detectRecurring,
  mostExpensive,
  nextDue,
  oneMonthLater,
  type RecurringInput,
} from "./detect";

const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const pay = (
  merchant: string,
  iso: string,
  amountMinor: number,
  categoryType: RecurringInput["categoryType"] = "EXPENSE",
): RecurringInput => ({ merchant, date: day(iso), amountMinor, categoryType });

describe("oneMonthLater", () => {
  it.each([
    ["2026-04-15", "2026-05-15"],
    ["2026-01-31", "2026-02-28"],
    ["2026-12-20", "2027-01-20"],
  ])("%s → %s", (from, to) => {
    expect(oneMonthLater(day(from)).toISOString().slice(0, 10)).toBe(to);
  });
});

describe("detectRecurring", () => {
  it("finds a monthly payment with the same amount", () => {
    const [netflix] = detectRecurring([
      pay("Netflix", "2026-08-12", -1099),
      pay("Netflix", "2026-09-12", -1099),
      pay("Netflix", "2026-10-12", -1099),
    ]);
    expect(netflix).toMatchObject({
      merchant: "Netflix",
      typicalAmountMinor: 1099,
      monthlyCostMinor: 1099,
      dayOfMonth: 12,
    });
    expect(netflix.lastPaid.toISOString().slice(0, 10)).toBe("2026-10-12");
    expect(netflix.nextDue.toISOString().slice(0, 10)).toBe("2026-11-12");
  });

  it("allows amounts within 10% (a variable energy bill)", () => {
    const found = detectRecurring([
      pay("Octopus Energy", "2026-08-03", -8000),
      pay("Octopus Energy", "2026-09-03", -8500),
      pay("Octopus Energy", "2026-10-03", -7700),
    ]);
    expect(found).toHaveLength(1);
  });

  it("needs two different months", () => {
    expect(
      detectRecurring([pay("Gym", "2026-10-01", -2999), pay("Gym", "2026-10-15", -2999)]),
    ).toEqual([]);
  });

  it("ignores amounts more than 10% apart", () => {
    expect(
      detectRecurring([pay("Argos", "2026-09-10", -2000), pay("Argos", "2026-10-10", -4500)]),
    ).toEqual([]);
  });

  it("ignores merchants paid many times a month (bus fares, coffee)", () => {
    const fares = ["2026-09", "2026-10"].flatMap((month) =>
      Array.from({ length: 12 }, (_, i) =>
        pay("TfL Travel", `${month}-${String(i + 1).padStart(2, "0")}`, -280),
      ),
    );
    expect(detectRecurring(fares)).toEqual([]);
  });

  it("ignores money in and transfers", () => {
    expect(
      detectRecurring([
        pay("Acme Salary", "2026-09-25", 245_000, "INCOME"),
        pay("Acme Salary", "2026-10-25", 245_000, "INCOME"),
        pay("Monzo Pot", "2026-09-26", -30_000, "TRANSFER"),
        pay("Monzo Pot", "2026-10-26", -30_000, "TRANSFER"),
      ]),
    ).toEqual([]);
  });

  it("ignores a shop whose amounts only match by chance", () => {
    expect(
      detectRecurring([
        pay("Tesco", "2026-09-03", -5000),
        pay("Tesco", "2026-09-17", -1200),
        pay("Tesco", "2026-10-04", -5100),
        pay("Tesco", "2026-10-20", -7300),
      ]),
    ).toEqual([]);
  });

  it("ignores similar amounts on very different days of the month", () => {
    expect(
      detectRecurring([pay("Steam", "2026-09-02", -2000), pay("Steam", "2026-10-27", -2050)]),
    ).toEqual([]);
  });

  it("counts uncategorised payments", () => {
    expect(
      detectRecurring([pay("Landlord", "2026-09-01", -95_000, null), pay("Landlord", "2026-10-01", -95_000, null)]),
    ).toHaveLength(1);
  });

  it("matches merchant names case-insensitively", () => {
    expect(
      detectRecurring([pay("Spotify", "2026-09-14", -1199), pay("SPOTIFY", "2026-10-14", -1199)]),
    ).toHaveLength(1);
  });
});

describe("sorting", () => {
  const found = detectRecurring([
    pay("Rent", "2026-09-01", -95_000),
    pay("Rent", "2026-10-01", -95_000),
    pay("Netflix", "2026-09-12", -1099),
    pay("Netflix", "2026-10-12", -1099),
    pay("Gym", "2026-09-15", -2999),
    pay("Gym", "2026-10-15", -2999),
    pay("Phone", "2026-09-07", -1800),
    pay("Phone", "2026-10-07", -1800),
  ]);

  it("lists the next three due, soonest first", () => {
    expect(nextDue(found, 3).map((payment) => payment.merchant)).toEqual(["Rent", "Phone", "Netflix"]);
  });

  it("lists the three most expensive", () => {
    expect(mostExpensive(found, 3).map((payment) => payment.merchant)).toEqual(["Rent", "Gym", "Phone"]);
  });
});
