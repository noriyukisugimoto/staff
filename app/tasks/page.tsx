import { Role } from "@prisma/client";

import { TaskListClient } from "@/components/task-list-client";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export default async function TasksPage() {
  const session = await requireSession();
  if (!session) {
    return null;
  }
  const isAdmin = session.user.role === Role.ADMIN;

  const [tasks, users] = await Promise.all([
    prisma.task.findMany({
      where: { archivedAt: null },
      include: {
        assignments: {
          orderBy: { sortOrder: "asc" },
          include: {
            user: { select: { id: true, loginId: true, name: true } }
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    }),
    prisma.user.findMany({
      select: { id: true, loginId: true, name: true, department: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <section>
      <h1>タスク進捗</h1>
      <TaskListClient
        initialTasks={tasks.map((task) => ({
          ...task,
          dueDate: task.dueDate?.toISOString() ?? null,
          archivedAt: task.archivedAt?.toISOString() ?? null,
          updatedAt: task.updatedAt.toISOString()
        }))}
        users={users.map((user) => ({
          id: user.id,
          label: `${user.name ?? `ID:${user.loginId}`}${user.department ? ` (${user.department})` : ""}`
        }))}
        isAdmin={isAdmin}
      />
    </section>
  );
}
