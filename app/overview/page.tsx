import { Role, TaskStatus } from "@prisma/client";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

export default async function OverviewPage() {
  await requireSession();

  const [todo, inProgress, done, overdue, byAssignee] = await Promise.all([
    prisma.task.count({ where: { status: TaskStatus.TODO, archivedAt: null } }),
    prisma.task.count({ where: { status: TaskStatus.IN_PROGRESS, archivedAt: null } }),
    prisma.task.count({ where: { status: TaskStatus.DONE, archivedAt: null } }),
    prisma.task.count({
      where: {
        archivedAt: null,
        dueDate: { lt: new Date() },
        status: { not: TaskStatus.DONE }
      }
    }),
    prisma.user.findMany({
      select: {
        id: true,
        loginId: true,
        name: true,
        role: true,
        _count: {
          select: {
            taskAssignments: {
              where: { task: { archivedAt: null } }
            }
          }
        }
      },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <section className="grid">
      <h1>全体ビュー</h1>
      <div className="grid cols-3">
        <article className="card">
          <h3>未着手</h3>
          <p>{todo}</p>
        </article>
        <article className="card">
          <h3>進行中</h3>
          <p>{inProgress}</p>
        </article>
        <article className="card">
          <h3>完了</h3>
          <p>{done}</p>
        </article>
      </div>
      <article className="card">
        <h3>期限超過（未完了）</h3>
        <p style={{ color: overdue > 0 ? "crimson" : "inherit" }}>{overdue}</p>
      </article>
      <article className="card">
        <h3>担当者別タスク件数</h3>
        <div className="grid">
          {byAssignee.map((user) => (
            <div className="row" key={user.id} style={{ justifyContent: "space-between" }}>
              <span>
                {user.name ?? `ID:${user.loginId}`} ({user.role === Role.ADMIN ? "管理者" : "一般"})
              </span>
              <strong>{user._count.taskAssignments}件</strong>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
