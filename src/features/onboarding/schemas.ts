import { z } from "zod";

import { GOAL_VALUES } from "./goals";

/** Highest monthly income we accept, in whole pounds. Anything above is almost certainly a typo. */
export const MAX_MONTHLY_INCOME_POUNDS = 1_000_000;

/**
 * Monthly income as typed: whole pounds, with an optional "£", commas or spaces
 * ("3,200", "£3200"). Becomes pence (an integer), the way all money is stored.
 */
export const monthlyIncomeSchema = z
  .string()
  .max(20)
  .transform((value) => value.replace(/[£,\s]/g, ""))
  .pipe(
    z
      .string()
      .regex(/^\d+$/, "Enter a whole number of pounds, like 3,200.")
      .transform(Number)
      .pipe(
        z
          .number()
          .int()
          .max(MAX_MONTHLY_INCOME_POUNDS, "That looks too high. Enter your monthly income in pounds."),
      ),
  )
  .transform((pounds) => pounds * 100);

export const goalSchema = z.enum(GOAL_VALUES, "Choose a goal to continue.");
