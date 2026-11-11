import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export async function StaleSessionGuard() {
  const session = await getSession();
  if (session?.user) return null;

  const cookieStore = await cookies();
  const hasSessionCookie = cookieStore
    .getAll()
    .some((cookie) => cookie.name.includes("authjs.session-token"));

  if (hasSessionCookie) {
    redirect("/api/session/clear?reason=expired");
  }

  return null;
}