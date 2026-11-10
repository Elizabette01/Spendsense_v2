import "server-only";
import { Resend } from "resend";

let resend: Resend | undefined;

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  resend ??= new Resend(apiKey);
  return resend;
}

function getFrom(): string {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is not set");
  return from;
}

function appUrl(path: string): string {
  const base = process.env.APP_URL;
  if (!base) throw new Error("APP_URL is not set");
  return new URL(path, base).toString();
}

async function send(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const { error } = await getResend().emails.send({
    from: getFrom(),
    ...params,
  });
  if (error) {
    console.error(`[email] send failed: ${error.name}: ${error.message}`);
    throw new Error("Email could not be sent");
  }
}

export async function sendVerificationEmail(
  to: string,
  token: string,
): Promise<void> {
  const url = appUrl(`/verify-email?token=${encodeURIComponent(token)}`);
  await send({
    to,
    subject: "Verify your SpendSense email",
    text: `Welcome to SpendSense.\n\nVerify your email by opening this link:\n${url}\n\nThe link expires in 24 hours. If you didn't create an account, you can ignore this email.`,
    html: `<p>Welcome to SpendSense.</p><p><a href="${url}">Verify your email</a></p><p>The link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>`,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  token: string,
): Promise<void> {
  const url = appUrl(`/reset-password?token=${encodeURIComponent(token)}`);
  await send({
    to,
    subject: "Reset your SpendSense password",
    text: `Someone asked to reset your SpendSense password.\n\nReset it here:\n${url}\n\nThe link expires in 1 hour. If this wasn't you, ignore this email: your password won't change.`,
    html: `<p>Someone asked to reset your SpendSense password.</p><p><a href="${url}">Reset your password</a></p><p>The link expires in 1 hour. If this wasn't you, ignore this email: your password won't change.</p>`,
  });
}

export async function sendAccountExistsEmail(to: string): Promise<void> {
  const signInUrl = appUrl("/login");
  const resetUrl = appUrl("/forgot-password");
  await send({
    to,
    subject: "You already have a SpendSense account",
    text: `Someone tried to create a SpendSense account with this email, but you already have one.\n\nSign in: ${signInUrl}\nForgot your password? ${resetUrl}\n\nIf this wasn't you, you can ignore this email.`,
    html: `<p>Someone tried to create a SpendSense account with this email, but you already have one.</p><p><a href="${signInUrl}">Sign in</a> or <a href="${resetUrl}">reset your password</a>.</p><p>If this wasn't you, you can ignore this email.</p>`,
  });
}

export async function sendPasswordChangedEmail(to: string): Promise<void> {
  const resetUrl = appUrl("/forgot-password");
  await send({
    to,
    subject: "Your SpendSense password was changed",
    text: `Your SpendSense password was just changed, and you've been signed out on all devices.\n\nIf this was you, there's nothing else to do.\n\nIf it wasn't you, reset your password straight away: ${resetUrl}`,
    html: `<p>Your SpendSense password was just changed, and you've been signed out on all devices.</p><p>If this was you, there's nothing else to do.</p><p>If it wasn't you, <a href="${resetUrl}">reset your password straight away</a>.</p>`,
  });
}

export async function sendDeletionScheduledEmail(
  to: string,
  token: string,
  deletionDate: Date,
): Promise<void> {
  const url = appUrl(`/reactivate-account?token=${encodeURIComponent(token)}`);
  const when = deletionDate.toLocaleString("en-GB", {
    timeZone: "Europe/London",
    dateStyle: "full",
    timeStyle: "short",
  });

  await send({
    to,
    subject: "Your SpendSense account is scheduled for deletion",
    text: `Your SpendSense account is scheduled to be permanently deleted on ${when} (UK time). You've been signed out on all devices.\n\nChanged your mind, or didn't ask for this? Reactivate your account here:\n${url}\n\nIf you didn't request this, reactivate your account straight away and secure it by changing your password.\n\nAfter that time, your account and all its data will be deleted and can't be recovered.`,
    html: `<p>Your SpendSense account is scheduled to be permanently deleted on <strong>${when}</strong> (UK time). You've been signed out on all devices.</p><p>Changed your mind, or didn't ask for this? <a href="${url}">Reactivate your account</a>.</p><p>If you didn't request this, reactivate your account straight away and secure it by changing your password.</p><p>After that time, your account and all its data will be deleted and can't be recovered.</p>`,
  });
}