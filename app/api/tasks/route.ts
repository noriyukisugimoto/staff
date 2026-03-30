import { Role, TaskPriority, TaskStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { MAX_TASK_ASSIGNEES, normalizeAssigneeIds, validateUserIdsExist } from "@/lib/task-assignees";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dueDate: z.string().optional(),
  assigneeIds: z.array(z.string()).max(MAX_TASK_ASSIGNEES).optional()
});

export async function GET(request: Request) {
  const session = await requireSession(false);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);

  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const assigneeUserId = searchParams.get("assigneeId");
  const includeArchived = searchParams.get("includeArchived") === "true";

  const where: {
    status?: TaskStatus;
    priority?: TaskPriority;
    archivedAt?: null;
    assignments?: { some: { userId: string } };
  } = {};

  if (status && Object.values(TaskStatus).includes(status as TaskStatus)) {
    where.status = status as TaskStatus;
  }

  if (assigneeUserId) {
    where.assignments = { some: { userId: assigneeUserId } };
  }
  if (priority && Object.values(TaskPriority).includes(priority as TaskPriority)) {
    where.priority = priority as TaskPriority;
  }
  if (!includeArchived) {
    where.archivedAt = null;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      assignments: {
        orderBy: { sortOrder: "asc" },
        include: {
          user: { select: { id: true, loginId: true, name: true } }
        }
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: Request) {
  const session = await requireSession(false);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = createTaskSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です。" }, { status: 400 });
  }

  let assigneeIds = normalizeAssigneeIds(parsed.data.assigneeIds ?? []);
  if (assigneeIds.length === 0) {
    assigneeIds = session.user.role === Role.ADMIN ? [] : [session.user.id];
  }
  if (assigneeIds.length > MAX_TASK_ASSIGNEES) {
    return NextResponse.json({ error: `担当者は最大${MAX_TASK_ASSIGNEES}人までです。` }, { status: 400 });
  }
  if (!(await validateUserIdsExist(assigneeIds))) {
    return NextResponse.json({ error: "担当者が見つかりません。" }, { status: 400 });
  }

  const task = await prisma.task.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      assignments:
        assigneeIds.length > 0
          ? {
              create: assigneeIds.map((userId, sortOrder) => ({ userId, sortOrder }))
            }
          : undefined
    },
    include: {
      assignments: {
        orderBy: { sortOrder: "asc" },
        include: {
          user: { select: { id: true, loginId: true, name: true } }
        }
      }
    }
  });

  await prisma.taskHistory.create({
    data: {
      taskId: task.id,
      changedById: session.user.id,
      fromStatus: null,
      toStatus: task.status
    }
  });

  return NextResponse.json({ task }, { status: 201 });
}
