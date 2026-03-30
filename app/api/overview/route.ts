import { TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export async function GET() {
  const session = await requireSession(false);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const [todo, inProgress, done, overdue] = await Promise.all([
    prisma.task.count({ where: { status: TaskStatus.TODO, archivedAt: null } }),
    prisma.task.count({ where: { status: TaskStatus.IN_PROGRESS, archivedAt: null } }),
    prisma.task.count({ where: { status: TaskStatus.DONE, archivedAt: null } }),
    prisma.task.count({
      where: {
        archivedAt: null,
        dueDate: { lt: new Date() },
        status: { not: TaskStatus.DONE }
      }
    })
  ]);

  return NextResponse.json({
    counts: { todo, inProgress, done, overdue }
  });
}
