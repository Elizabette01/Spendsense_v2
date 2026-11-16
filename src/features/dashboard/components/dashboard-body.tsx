import { connection } from "next/server";

import { monthStart, shiftMonth } from "@/lib/finance/months";
import { formatMonthYear } from "@/lib/format";

import { getDashboardData, getFirstName } from "../queries";
import { IncomeExpensesSection, SpendingBreakdownSection } from "./chart-sections";
import { AdvisorBar, EmptyDashboard } from "./dashboard-extras";
import { RecurringSection, TopMerchantsSection } from "./list-sections";
import { SummaryCards } from "./summary-cards";

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" });

/** "Welcome back, Elizabette!" plus which month the figures are for. Read the session: inside <Suspense>. */
export async function DashboardHeader() {
  await connection(); // request-time only (see header-auth-actions)
  const [firstName, data] = await Promise.all([getFirstName(), getDashboardData()]);
  return (
    <div>
      <h1 className="text-page-title text-heading">
        Welcome back{firstName ? `, ${firstName}` : ""}!
      </h1>
      <p className="text-body text-foreground-muted">
        {data.hasData
          ? `Your figures for ${formatMonthYear(monthStart(data.month))}, the latest month in your statements`
          : "Upload a statement to get started"}
      </p>
    </div>
  );
}

/** Every dashboard section, or the empty state. Reads the session: inside <Suspense>. */
export async function DashboardBody() {
  await connection();
  const data = await getDashboardData();
  if (!data.hasData) return <EmptyDashboard />;

  const monthName = formatMonthYear(monthStart(data.month));
  const previousMonthName = MONTH.format(monthStart(shiftMonth(data.month, -1)));

  return (
    <div className="flex flex-col gap-6">
      <SummaryCards cards={data.cards} previousMonthName={previousMonthName} />
      <div className="grid gap-6 lg:grid-cols-3">
        <IncomeExpensesSection months={data.incomeVsExpenses} />
        <SpendingBreakdownSection
          monthName={monthName}
          totalMinor={data.spendingBreakdown.totalMinor}
          slices={data.spendingBreakdown.slices}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <RecurringSection
          enoughData={data.recurring.enoughData}
          nextDue={data.recurring.nextDue}
          mostExpensive={data.recurring.mostExpensive}
        />
        <TopMerchantsSection monthName={monthName} merchants={data.topMerchants} />
      </div>
      <AdvisorBar />
    </div>
  );
}
