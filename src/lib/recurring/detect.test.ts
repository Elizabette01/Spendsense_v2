import { describe, expect, it } from "vitest";

import {
  activeRecurring,
  detectRecurring,
  mostExpensive,
  nextDue,
  oneMonthLater,
  type RecurringInput,
} from "./detect";

// All data below is invented.
const day = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const pay = (
  merchant: string,
  iso: string,
  amountMinor: number,
  categoryType: RecurringInput["categoryType"] = "EXPENSE",
  categoryId: string | null = "sys_subscriptions",
): RecurringInput => ({ merchant, date: day(iso), amountMinor, categoryType, categoryId });

/** The same payment on the same day for each month given. */
const monthly = (
  merchant: string,
  months: string[],
  dayOfMonth: string,
  amountMinor: number,
  categoryId: string | null = "sys_subscriptions",
) => months.map((month) => pay(merchant, `${month}-${dayOfMonth}`, amountMinor, "EXPENSE", categoryId));

const THREE = ["2026-08", "2026-09", "2026-10"];
const SIX = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

describe("oneMonthLater", () => {
  it.each([
    ["2026-04-15", "2026-05-15"],
    ["2026-01-31", "2026-02-28"],
    ["2026-12-20", "2027-01-20"],
  ])("%s → %s", (from, to) => {
    expect(oneMonthLater(day(from)).toISOString().slice(0, 10)).toBe(to);
  });
});

describe("detectRecurring: the B9 cases", () => {
  it("Netflix monthly for 3 months → recurring", () => {
    const [netflix] = detectRecurring(monthly("Netflix", THREE, "12", -1099));
    expect(netflix).toMatchObject({
      merchantKey: "netflix",
      merchant: "Netflix",
      categoryId: "sys_subscriptions",
      typicalAmountMinor: 1099,
      monthlyCostMinor: 1099,
      dayOfMonth: 12,
    });
    expect(netflix.lastPaid.toISOString().slice(0, 10)).toBe("2026-10-12");
    expect(netflix.nextDue.toISOString().slice(0, 10)).toBe("2026-11-12");
  });

  it("only 2 months → not recurring", () => {
    expect(detectRecurring(monthly("Netflix", ["2026-09", "2026-10"], "12", -1099))).toEqual([]);
  });

  it("the same restaurant amount on the same day for 6 months → not recurring (everyday)", () => {
    expect(detectRecurring(monthly("Zephyr Bistro", SIX, "05", -2450, "sys_eating_out"))).toEqual([]);
  });

  it.each(["sys_groceries", "sys_shopping", "sys_transport", "sys_entertainment"])(
    "never treats %s as recurring",
    (categoryId) => {
      expect(detectRecurring(monthly("Regular Place", SIX, "05", -2450, categoryId))).toEqual([]);
    },
  );

  it("a monthly gym → recurring", () => {
    expect(detectRecurring(monthly("PureGym", THREE, "01", -2999, "sys_health_fitness"))).toHaveLength(1);
  });

  it("a dismissed merchant → not recurring", () => {
    const rows = [...monthly("Netflix", THREE, "12", -1099), ...monthly("PureGym", THREE, "01", -2999)];
    const found = detectRecurring(rows, new Set(["netflix"]));
    expect(found.map((payment) => payment.merchantKey)).toEqual(["puregym"]);
  });

  it("rent to a person by standing order → recurring", () => {
    expect(
      detectRecurring(monthly("J Smith", THREE, "01", -95_000, "sys_people_out")),
    ).toHaveLength(1);
  });

  it("an uncategorised monthly payment → recurring", () => {
    expect(detectRecurring(monthly("Landlord", THREE, "01", -95_000, null))).toHaveLength(1);
  });
});

describe("detectRecurring: checks kept from before", () => {
  it("allows amounts within 10% (a variable energy bill)", () => {
    const found = detectRecurring([
      pay("Octopus Energy", "2026-08-03", -8000, "EXPENSE", "sys_bills"),
      pay("Octopus Energy", "2026-09-03", -8500, "EXPENSE", "sys_bills"),
      pay("Octopus Energy", "2026-10-03", -7700, "EXPENSE", "sys_bills"),
    ]);
    expect(found).toHaveLength(1);
  });

  it("ignores amounts more than 10% apart", () => {
    expect(
      detectRecurring([
        pay("Example Bills", "2026-08-10", -2000),
        pay("Example Bills", "2026-09-10", -4500),
        pay("Example Bills", "2026-10-10", -3100),
      ]),
    ).toEqual([]);
  });

  it("ignores merchants paid many times a month", () => {
    const many = THREE.flatMap((month) =>
      Array.from({ length: 12 }, (_, i) =>
        pay("Parking App", `${month}-${String(i + 1).padStart(2, "0")}`, -280, "EXPENSE", "sys_bills"),
      ),
    );
    expect(detectRecurring(many)).toEqual([]);
  });

  it("ignores money in and transfers", () => {
    expect(
      detectRecurring([
        ...THREE.map((m) => pay("Acme Salary", `${m}-25`, 245_000, "INCOME", "sys_salary")),
        ...THREE.map((m) => pay("Monzo Pot", `${m}-26`, -30_000, "TRANSFER", "sys_savings")),
      ]),
    ).toEqual([]);
  });

  it("ignores a merchant whose amounts only match by chance", () => {
    expect(
      detectRecurring([
        pay("Corner Pharmacy", "2026-08-03", -5000, "EXPENSE", null),
        pay("Corner Pharmacy", "2026-08-17", -1200, "EXPENSE", null),
        pay("Corner Pharmacy", "2026-09-04", -5100, "EXPENSE", null),
        pay("Corner Pharmacy", "2026-09-20", -7300, "EXPENSE", null),
        pay("Corner Pharmacy", "2026-10-05", -4950, "EXPENSE", null),
        pay("Corner Pharmacy", "2026-10-22", -900, "EXPENSE", null),
      ]),
    ).toEqual([]);
  });

  it("ignores similar amounts on very different days of the month", () => {
    expect(
      detectRecurring([
        pay("Steam", "2026-08-02", -2000),
        pay("Steam", "2026-09-27", -2050),
        pay("Steam", "2026-10-14", -2000),
      ]),
    ).toEqual([]);
  });

  it("groups by merchant key, so different spellings are one merchant", () => {
    expect(
      detectRecurring([
        pay("Spotify", "2026-08-14", -1199),
        pay("SPOTIFY", "2026-09-14", -1199),
        pay("spotify", "2026-10-14", -1199),
      ]),
    ).toHaveLength(1);
  });
});

describe("activeRecurring", () => {
  it("leaves out a payment already overdue by the latest transaction", () => {
    const rows = [
      ...monthly("Old Magazine", ["2026-05", "2026-06", "2026-07"], "03", -499),
      ...monthly("Netflix", THREE, "12", -1099),
    ];
    expect(activeRecurring(rows).map((payment) => payment.merchant)).toEqual(["Netflix"]);
  });

  it("leaves out dismissed merchants", () => {
    expect(activeRecurring(monthly("Netflix", THREE, "12", -1099), new Set(["netflix"]))).toEqual([]);
  });

  it("is empty with no rows", () => {
    expect(activeRecurring([])).toEqual([]);
  });
});

describe("sorting", () => {
  const found = detectRecurring([
    ...monthly("Rent", THREE, "01", -95_000, "sys_housing"),
    ...monthly("Netflix", THREE, "12", -1099),
    ...monthly("Gym", THREE, "15", -2999, "sys_health_fitness"),
    ...monthly("Phone", THREE, "07", -1800, "sys_bills"),
  ]);

  it("lists the next three due, soonest first", () => {
    expect(nextDue(found, 3).map((payment) => payment.merchant)).toEqual(["Rent", "Phone", "Netflix"]);
  });

  it("lists the three most expensive", () => {
    expect(mostExpensive(found, 3).map((payment) => payment.merchant)).toEqual(["Rent", "Gym", "Phone"]);
  });
});
