import { Suspense } from "react";
import { auth } from "@/auth";

/**
 * Avatar initials, name and email at the top of the app sidebar.
 * auth() reads the request, so it sits behind <Suspense>.
 */
export function SidebarUser() {
  return (
    <Suspense fallback={<UserSkeleton />}>
      <SidebarUserContent />
    </Suspense>
  );
}

async function SidebarUserContent() {
  const session = await auth();
  const name = session?.user?.name ?? "";
  const email = session?.user?.email ?? "";
  if (!name && !email) return <UserSkeleton />;

  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-nav font-semibold text-accent-foreground"
      >
        {initials(name || email)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-nav font-medium text-foreground">{name || email}</p>
        {name && email && <p className="truncate text-label text-foreground-muted">{email}</p>}
      </div>
    </div>
  );
}

/** "Elizabette Awe" → "EA"; a single word → its first letter. */
function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts;
  return letters.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function UserSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3" aria-hidden="true">
      <span className="size-10 rounded-full bg-divider" />
      <span className="h-4 w-32 rounded-icon bg-divider" />
    </div>
  );
}
