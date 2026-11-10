import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { auth } from "@/auth";

/**
 * Defence in depth for the signed-in area: if there's no valid session,
 * send the visitor to /login. The proxy normally catches this first; this
 * guard means an app page never renders for a signed-out visitor even if a
 * route is missing from the proxy's list. Renders nothing.
 */
export function RequireSession() {
  return (
    <Suspense fallback={null}>
      <SessionCheck />
    </Suspense>
  );
}

async function SessionCheck() {
  await connection(); // request-time only (see header-auth-actions)
  const session = await auth();
  if (!session?.user) redirect("/login");
  return null;
}
