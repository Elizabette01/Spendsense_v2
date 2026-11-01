import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const systemCategories = [
  // Expense
  { id: "sys_groceries", name: "Groceries", type: "EXPENSE" },
  { id: "sys_eating_out", name: "Eating Out", type: "EXPENSE" },
  { id: "sys_transport", name: "Transport", type: "EXPENSE" },
  { id: "sys_bills", name: "Bills", type: "EXPENSE" },
  { id: "sys_housing", name: "Housing", type: "EXPENSE" },
  { id: "sys_subscriptions", name: "Subscriptions", type: "EXPENSE" },
  { id: "sys_shopping", name: "Shopping", type: "EXPENSE" },
  { id: "sys_entertainment", name: "Entertainment", type: "EXPENSE" },
  { id: "sys_personal_care", name: "Personal Care", type: "EXPENSE" },
  { id: "sys_health_fitness", name: "Health & Fitness", type: "EXPENSE" },
  { id: "sys_holidays", name: "Holidays", type: "EXPENSE" },
  { id: "sys_family", name: "Family", type: "EXPENSE" },
  { id: "sys_education", name: "Education", type: "EXPENSE" },
  { id: "sys_gifts", name: "Gifts", type: "EXPENSE" },
  { id: "sys_charity", name: "Charity", type: "EXPENSE" },
  { id: "sys_finances", name: "Finances", type: "EXPENSE" },
  { id: "sys_cash", name: "Cash Withdrawals", type: "EXPENSE" },
  { id: "sys_expenses", name: "Expenses", type: "EXPENSE" },
  { id: "sys_general", name: "General", type: "EXPENSE" },
  // Income
  { id: "sys_salary", name: "Salary", type: "INCOME" },
  { id: "sys_benefits", name: "Benefits", type: "INCOME" },
  { id: "sys_refunds", name: "Refunds", type: "INCOME" },
  { id: "sys_other_income", name: "Other Income", type: "INCOME" },
  // Transfer
  { id: "sys_transfers", name: "Transfers", type: "TRANSFER" },
  { id: "sys_savings", name: "Savings", type: "TRANSFER" },
] as const;

async function main() {
  for (const category of systemCategories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: { name: category.name, type: category.type },
      create: { ...category, userId: null },
    });
  }
  console.log(`Seeded ${systemCategories.length} system categories`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());