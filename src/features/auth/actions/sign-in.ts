"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";
import { safeCallbackUrl } from "../redirect";

export type SignInState =
  | { status: "idle" }
  | { status: "error"; message: string };

const MESSAGES: Record<string, string> = {
  email_not_verified:
    "Please verify your email first. Check your inbox, or request a new link.",
  rate_limited: "Too many attempts. Please try again in 15 minutes.",
};

export async function signInWithPassword(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: safeCallbackUrl("/"),
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return {
        status: "error",
        message: MESSAGES[error.code] ?? "Email or password is incorrect.",
      };
    }
    if (error instanceof AuthError) {
      return {
        status: "error",
        message: "Something went wrong. Please try again.",
      };
    }
    throw error;
  }
  return { status: "idle" };
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  await signIn("google", {
    redirectTo: safeCallbackUrl(formData.get("callbackUrl")),
  });
}