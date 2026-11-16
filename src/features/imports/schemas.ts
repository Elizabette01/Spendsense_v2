import { z } from "zod";

export const MAX_COLUMNS = 100;
export const MAX_ROW_DECISIONS = 20_000;

const columnIndexSchema = z.number().int().min(0).max(MAX_COLUMNS - 1);

export const columnMappingSchema = z
  .object({
    date: columnIndexSchema.optional(),
    description: columnIndexSchema.optional(),
    amount: columnIndexSchema.optional(),
    moneyIn: columnIndexSchema.optional(),
    moneyOut: columnIndexSchema.optional(),
    balance: columnIndexSchema.optional(),
    externalId: columnIndexSchema.optional(),
  })
  .refine(
    (mapping) => {
      const used = Object.values(mapping).filter((index) => index !== undefined);
      return new Set(used).size === used.length;
    },
    { message: "Each column can only be matched once." },
  );

export const dateOrderSchema = z.enum(["dmy", "mdy"]);

export const duplicateChoiceSchema = z.enum(["skip", "import"]);

const fingerprintSchema = z.string().regex(/^[0-9a-f]{64}$/);

export const duplicateDecisionsSchema = z.object({
  defaultChoice: duplicateChoiceSchema.optional(),
  overrides: z
    .record(fingerprintSchema, duplicateChoiceSchema)
    .refine((overrides) => Object.keys(overrides).length <= MAX_ROW_DECISIONS, {
      message: "Too many row decisions.",
    })
    .default({}),
});

export type ColumnMappingInput = z.infer<typeof columnMappingSchema>;
export type DuplicateChoice = z.infer<typeof duplicateChoiceSchema>;
export type DuplicateDecisions = z.infer<typeof duplicateDecisionsSchema>;