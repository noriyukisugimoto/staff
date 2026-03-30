import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { MAX_TASK_ASSIGNEES, normalizeAssigneeIds, userCanEditTask, validateUserIdsExist } from "@/lib/task-assignees";

type Params = { params: Promise<{ id: string }> };

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  archived: z.boolean().optional(),
  dueDate: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).max(MAX_TASK_ASSIGNEES).nullable().optional()
});

const taskInclude = {
  assignments: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      user: { select: { id: true, loginId: true, name: true } }
    }
  }
} as const;

async function authorizeTaskWrite(taskId: string) {
  const session = await requireSession(false);
  if (!session) {
    return { session: null, task: null, denied: false };
  }
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { assignments: true }
  });

  if (!task) {
    return { session, task: null, denied: false };
  }
  const assigneeUserIds = task.assignments.map((a) => a.userId);
  if (!userCanEditTask(session.user.role, session.user.id, assigneeUserIds)) {
    return { session, task, denied: true };
  }
  return { session, task, denied: false };
}

export async function GET(_: Request, { params }: Params) {
  const { id } = await params;
  const session = await requireSession(false);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const existing = await prisma.task.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "タスクが見つかりません。" }, { status: 404 });
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      ...taskInclude,
      histories: {
        orderBy: { changedAt: "desc" },
        include: { changedBy: { select: { id: true, loginId: true, name: true } } }
      }
    }
  });

  return NextResponse.json({ task });
}

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await authorizeTaskWrite(id);
  if (!auth.session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  if (!auth.task) {
    return NextResponse.json({ error: "タスクが見つかりません。" }, { status: 404 });
  }
  if (auth.denied) {
    return NextResponse.json({ error: "アクセス権限がありません。" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = updateTaskSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です。" }, { status: 400 });
  }

  const current = auth.task;
  const nextStatus = parsed.data.status ?? current.status;

  const assigneeUserIds = current.assignments.map((a) => a.userId);
  const canChangeAssignees =
    auth.session.user.role === Role.ADMIN ||
    assigneeUserIds.includes(auth.session.user.id);

  if (parsed.data.assigneeIds !== undefined) {
    if (!canChangeAssignees) {
      return NextResponse.json({ error: "担当者を変更する権限がありません。" }, { status: 403 });
    }
    const nextIds =
      parsed.data.assigneeIds === null ? [] : normalizeAssigneeIds(parsed.data.assigneeIds);
    if (nextIds.length > MAX_TASK_ASSIGNEES) {
      return NextResponse.json({ error: `担当者は最大${MAX_TASK_ASSIGNEES}人までです。` }, { status: 400 });
    }
    if (!(await validateUserIdsExist(nextIds))) {
      return NextResponse.json({ error: "担当者が見つかりません。" }, { status: 400 });
    }
    await prisma.$transaction([
      prisma.taskAssignee.deleteMany({ where: { taskId: id } }),
      ...(nextIds.length
        ? [
            prisma.taskAssignee.createMany({
              data: nextIds.map((userId, sortOrder) => ({
                taskId: id,
                userId,
                sortOrder
              }))
            })
          ]
        : [])
    ]);
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      title: parsed.data.title ?? current.title,
      description: parsed.data.description ?? current.description,
      status: nextStatus,
      priority: parsed.data.priority ?? current.priority,
      archivedAt:
        parsed.data.archived === undefined
          ? current.archivedAt
          : parsed.data.archived
            ? new Date()
            : null,
      dueDate:
        parsed.data.dueDate === undefined
          ? current.dueDate
          : parsed.data.dueDate
            ? new Date(parsed.data.dueDate)
            : null
    },
    include: taskInclude
  });

  if (nextStatus !== current.status) {
    await prisma.taskHistory.create({
      data: {
        taskId: id,
        changedById: auth.session.user.id,
        fromStatus: current.status,
        toStatus: nextStatus
      }
    });
  }

  return NextResponse.json({ task: updated });
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const auth = await authorizeTaskWrite(id);
  if (!auth.session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
  if (!auth.task) {
    return NextResponse.json({ error: "タスクが見つかりません。" }, { status: 404 });
  }
  if (auth.denied) {
    return NextResponse.json({ error: "アクセス権限がありません。" }, { status: 403 });
  }

  await prisma.task.update({
    where: { id },
    data: { archivedAt: new Date() }
  });

  return NextResponse.json({ ok: true });
}
