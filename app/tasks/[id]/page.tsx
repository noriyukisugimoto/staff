import { notFound } from "next/navigation";

import { TaskDetailClient } from "@/components/task-detail-client";
import { prisma } from "@/lib/db";
import { userCanEditTask } from "@/lib/task-assignees";
import { requireSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export default async function TaskDetailPage({ params }: Params) {
  const { id } = await params;
  const session = await requireSession();
  if (!session) {
    return null;
  }

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      assignments: {
        orderBy: { sortOrder: "asc" },
        include: {
          user: { select: { id: true, loginId: true, name: true } }
        }
      },
      histories: {
        orderBy: { changedAt: "desc" },
        include: {
          changedBy: { select: { name: true, loginId: true } }
        }
      }
    }
  });

  if (!task) {
    notFound();
  }

  const assigneeUserIds = task.assignments.map((a) => a.userId);
  const canEdit = userCanEditTask(session.user.role, session.user.id, assigneeUserIds);

  const assigneeLabel =
    task.assignments.length === 0
      ? null
      : task.assignments
          .map((a) => a.user.name ?? `ID:${a.user.loginId}`)
          .join("、");

  const users = await prisma.user.findMany({
    select: { id: true, loginId: true, name: true, department: true },
    orderBy: { name: "asc" }
  });

  return (
    <section>
      <h1>タスク詳細</h1>
      <TaskDetailClient
        task={{
          ...task,
          dueDate: task.dueDate?.toISOString() ?? null,
          assigneeLabel,
          initialAssigneeIds: task.assignments.map((a) => a.userId),
          histories: task.histories.map((history) => ({
            ...history,
            changedAt: history.changedAt.toISOString()
          }))
        }}
        users={users.map((user) => ({
          id: user.id,
          label: `${user.name ?? `ID:${user.loginId}`}${user.department ? ` (${user.department})` : ""}`
        }))}
        canEdit={canEdit}
      />
    </section>
  );
}
