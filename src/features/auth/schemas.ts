import { z } from "zod";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  isValidPasswordLength,
} from "@/lib/password-rules";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform((value) => value.normalize("NFKC"))
  .pipe(z.email("Enter a valid email address").max(254));

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100, "Name is too long"),
  email: emailSchema,
  password: z
    .string()
    .refine(
      isValidPasswordLength,
      `Use between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters`,
    ),
});