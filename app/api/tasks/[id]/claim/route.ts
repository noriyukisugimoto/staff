import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { MAX_TASK_ASSIGNEES } from "@/lib/task-assignees";

type Params = { params: Promise<{ id: string }> };

const taskInclude = {
  assignments: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      user: { select: { id: true, loginId: true, name: true } }
    }
  }
} as const;

export async function POST(_: Request, { params }: Params) {
  const session = await requireSession(false);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: { assignments: true }
  });

  if (!task) {
    return NextResponse.json({ error: "タスクが見つかりません。" }, { status: 404 });
  }
  if (task.archivedAt) {
    return NextResponse.json({ error: "アーカイブ済みのタスクには引き受けできません。" }, { status: 400 });
  }
  if (task.assignments.length >= MAX_TASK_ASSIGNEES) {
    return NextResponse.json({ error: "担当者は定員に達しています。" }, { status: 400 });
  }
  if (task.assignments.some((a) => a.userId === session.user.id)) {
    return NextResponse.json({ error: "既に担当に含まれています。" }, { status: 409 });
  }

  const maxSortOrder = task.assignments.reduce((max, a) => Math.max(max, a.sortOrder), -1);

  await prisma.taskAssignee.create({
    data: {
      taskId: id,
      userId: session.user.id,
      sortOrder: maxSortOrder + 1
    }
  });

  const updated = await prisma.task.findUnique({
    where: { id },
    include: taskInclude
  });

  return NextResponse.json({ task: updated });
}
