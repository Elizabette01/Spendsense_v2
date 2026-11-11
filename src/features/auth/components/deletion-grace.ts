import { DELETION_GRACE_MS } from "@/lib/account-deletion";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The grace period in words ("2 days"), worked out from DELETION_GRACE_MS so
 * the UI never disagrees with the backend. Used by the delete dialog and the
 * login banner.
 */
export const DELETION_GRACE_DAYS = Math.round(DELETION_GRACE_MS / DAY_MS);
export const DELETION_GRACE_TEXT = `${DELETION_GRACE_DAYS} ${DELETION_GRACE_DAYS === 1 ? "day" : "days"}`;
