import "server-only";

import type { FileType, StatementStatus } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

export type StatementListItem = {
  id: string;
  fileName: string;
  fileType: FileType;
  bankName: string | null;
  createdAt: Date;
  importedCount: number;
  status: StatementStatus;
  periodStart: Date | null;
  periodEnd: Date | null;
};

/** The signed-in user's statements, newest first. Empty when signed out. */
export async function getStatements(): Promise<StatementListItem[]> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) return [];

  return db.statement.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      fileType: true,
      bankName: true,
      createdAt: true,
      importedCount: true,
      status: true,
      periodStart: true,
      periodEnd: true,
    },
  });
}
