/**
 * The four goals on onboarding step 2, in the design's order. Browser-safe:
 * the step-2 screen shows them and `schemas.ts` checks answers against them.
 * The values match the `FinancialGoal` enum in prisma/schema.prisma.
 */
export const GOALS = [
  { value: "SAVE_MORE", title: "Save more money", description: "Build a consistent savings habit" },
  { value: "GET_OUT_OF_DEBT", title: "Get out of debt", description: "Reduce and eliminate what I owe" },
  { value: "UNDERSTAND_SPENDING", title: "Understand my spending", description: "See clearly where my money goes" },
  { value: "BUILD_WEALTH", title: "Build wealth", description: "Invest and grow my money over time" },
] as const;

export type GoalValue = (typeof GOALS)[number]["value"];

export const GOAL_VALUES = GOALS.map((goal) => goal.value) as [GoalValue, ...GoalValue[]];
