"use client";

import { TaskPriority, TaskStatus } from "@prisma/client";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";

import { taskPriorityLabel, taskStatusLabel } from "@/lib/labels";
import { MAX_TASK_ASSIGNEES, normalizeAssigneeIds } from "@/lib/task-assignees";

type UserOption = {
  id: string;
  label: string;
};

type TaskItem = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  archivedAt?: string | null;
  assignments: Array<{
    userId: string;
    user: { id: string; loginId: string; name: string | null };
  }>;
  updatedAt: string;
};

type Props = {
  initialTasks: TaskItem[];
  users: UserOption[];
  isAdmin: boolean;
};

function assigneeNames(task: TaskItem): string {
  if (task.assignments.length === 0) return "";
  return task.assignments.map((a) => a.user.name ?? `ID:${a.user.loginId}`).join("、");
}

export function TaskListClient({ initialTasks, users, isAdmin }: Props) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  function canMutateTask(task: TaskItem) {
    if (isAdmin) return true;
    return task.assignments.some((a) => a.userId === currentUserId);
  }

  function canClaimTask(task: TaskItem) {
    if (!currentUserId || task.archivedAt) return false;
    if (task.assignments.length >= MAX_TASK_ASSIGNEES) return false;
    if (task.assignments.some((a) => a.userId === currentUserId)) return false;
    return true;
  }

  const [tasks, setTasks] = useState(initialTasks);
  const [statusFilter, setStatusFilter] = useState<"ALL" | TaskStatus>("ALL");
  const [assigneeFilter, setAssigneeFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | TaskPriority>("ALL");
  const [includeArchived, setIncludeArchived] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [dueDate, setDueDate] = useState("");
  const [slot1, setSlot1] = useState("");
  const [slot2, setSlot2] = useState("");
  const [slot3, setSlot3] = useState("");
  const [error, setError] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== "ALL" && task.status !== statusFilter) return false;
      if (priorityFilter !== "ALL" && task.priority !== priorityFilter) return false;
      if (assigneeFilter !== "ALL" && !task.assignments.some((a) => a.userId === assigneeFilter))
        return false;
      if (!includeArchived && task.archivedAt) return false;
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, assigneeFilter, includeArchived]);

  async function reloadTasks() {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
    if (assigneeFilter !== "ALL") params.set("assigneeId", assigneeFilter);
    if (includeArchived) params.set("includeArchived", "true");
    const response = await fetch(`/api/tasks?${params.toString()}`);
    const data = await response.json();
    setTasks(data.tasks ?? []);
  }

  async function createTask() {
    setError(null);
    const assigneeIds = normalizeAssigneeIds([slot1, slot2, slot3]);
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || undefined,
        status,
        priority,
        dueDate: dueDate || undefined,
        assigneeIds: assigneeIds.length ? assigneeIds : undefined
      })
    });

    if (!response.ok) {
      setError("タスク作成に失敗しました。");
      return;
    }

    setTitle("");
    setDescription("");
    setStatus(TaskStatus.TODO);
    setPriority(TaskPriority.MEDIUM);
    setDueDate("");
    setSlot1("");
    setSlot2("");
    setSlot3("");
    await reloadTasks();
  }

  async function updateStatus(taskId: string, nextStatus: TaskStatus) {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus })
    });
    if (!response.ok) {
      setError("ステータス更新に失敗しました。");
      return;
    }
    await reloadTasks();
  }

  async function archiveTask(task: TaskItem) {
    const message = `タスク「${task.title}」をアーカイブしますか？`;
    const ok = window.confirm(message);
    if (!ok) return;

    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      setError("タスクのアーカイブに失敗しました。");
      return;
    }
    await reloadTasks();
  }

  async function unarchiveTask(task: TaskItem) {
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false })
    });
    if (!response.ok) {
      setError("タスクの復元に失敗しました。");
      return;
    }
    await reloadTasks();
  }

  async function claimTask(task: TaskItem) {
    setError(null);
    const response = await fetch(`/api/tasks/${task.id}/claim`, {
      method: "POST"
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "引き受けに失敗しました。");
      return;
    }
    await reloadTasks();
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>タスク作成</h2>
        <div className="grid">
          <input
            placeholder="タイトル"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
          <textarea
            placeholder="説明"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="row">
            <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
              <option value={TaskStatus.TODO}>{taskStatusLabel[TaskStatus.TODO]}</option>
              <option value={TaskStatus.IN_PROGRESS}>{taskStatusLabel[TaskStatus.IN_PROGRESS]}</option>
              <option value={TaskStatus.DONE}>{taskStatusLabel[TaskStatus.DONE]}</option>
            </select>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
            >
              <option value={TaskPriority.HIGH}>{taskPriorityLabel[TaskPriority.HIGH]}</option>
              <option value={TaskPriority.MEDIUM}>{taskPriorityLabel[TaskPriority.MEDIUM]}</option>
              <option value={TaskPriority.LOW}>{taskPriorityLabel[TaskPriority.LOW]}</option>
            </select>
            <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
          <p className="muted" style={{ margin: 0 }}>
            担当者（最大{MAX_TASK_ASSIGNEES}人・未選択も可）
          </p>
          <div className="row" style={{ flexWrap: "wrap" }}>
            <select value={slot1} onChange={(event) => setSlot1(event.target.value)}>
              <option value="">担当1</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.label}
                </option>
              ))}
            </select>
            <select value={slot2} onChange={(event) => setSlot2(event.target.value)}>
              <option value="">担当2</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.label}
                </option>
              ))}
            </select>
            <select value={slot3} onChange={(event) => setSlot3(event.target.value)}>
              <option value="">担当3</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.label}
                </option>
              ))}
            </select>
            <button type="button" onClick={createTask} disabled={!title}>
              作成
            </button>
          </div>
          {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
        </div>
      </section>

      <section className="card">
        <h2>進捗一覧</h2>
        <div className="row">
          <select
            value={statusFilter}
            onChange={async (event) => {
              setStatusFilter(event.target.value as "ALL" | TaskStatus);
            }}
          >
            <option value="ALL">すべての状態</option>
            <option value={TaskStatus.TODO}>{taskStatusLabel[TaskStatus.TODO]}</option>
            <option value={TaskStatus.IN_PROGRESS}>{taskStatusLabel[TaskStatus.IN_PROGRESS]}</option>
            <option value={TaskStatus.DONE}>{taskStatusLabel[TaskStatus.DONE]}</option>
          </select>
          <select
            value={priorityFilter}
            onChange={async (event) => {
              setPriorityFilter(event.target.value as "ALL" | TaskPriority);
            }}
          >
            <option value="ALL">すべての優先度</option>
            <option value={TaskPriority.HIGH}>{taskPriorityLabel[TaskPriority.HIGH]}</option>
            <option value={TaskPriority.MEDIUM}>{taskPriorityLabel[TaskPriority.MEDIUM]}</option>
            <option value={TaskPriority.LOW}>{taskPriorityLabel[TaskPriority.LOW]}</option>
          </select>
          <select
            value={assigneeFilter}
            onChange={async (event) => {
              setAssigneeFilter(event.target.value);
            }}
          >
            <option value="ALL">すべての担当者</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={reloadTasks}>
            再読込
          </button>
          <label className="row">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(event) => setIncludeArchived(event.target.checked)}
            />
            アーカイブを表示
          </label>
        </div>
        <div className="grid" style={{ marginTop: 12 }}>
          {filteredTasks.map((task) => {
            const mutable = canMutateTask(task);
            const showClaim = canClaimTask(task);
            const names = assigneeNames(task);
            return (
              <article key={task.id} className="card">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <strong>{task.title}</strong>
                  <Link href={`/tasks/${task.id}`}>詳細</Link>
                </div>
                <p className="muted">{task.description || "説明なし"}</p>
                <div className="row">
                  <span>
                    状態: {taskStatusLabel[task.status]}
                  </span>
                  <span>
                    優先度: {taskPriorityLabel[task.priority]}
                  </span>
                  <span>
                    担当:{" "}
                    {names ? (
                      names
                    ) : (
                      <span style={{ color: "crimson" }}>未設定</span>
                    )}
                  </span>
                  <span>期限: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "未設定"}</span>
                  <span>{task.archivedAt ? "アーカイブ済み" : "有効"}</span>
                </div>
                <div className="row">
                  {showClaim ? (
                    <button type="button" onClick={() => claimTask(task)}>
                      引き受ける
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!mutable}
                    title={!mutable ? "担当者または管理者のみ操作できます" : undefined}
                    onClick={() => updateStatus(task.id, TaskStatus.TODO)}
                  >
                    未着手
                  </button>
                  <button
                    type="button"
                    disabled={!mutable}
                    title={!mutable ? "担当者または管理者のみ操作できます" : undefined}
                    onClick={() => updateStatus(task.id, TaskStatus.IN_PROGRESS)}
                  >
                    進行中
                  </button>
                  <button
                    type="button"
                    disabled={!mutable}
                    title={!mutable ? "担当者または管理者のみ操作できます" : undefined}
                    onClick={() => updateStatus(task.id, TaskStatus.DONE)}
                  >
                    完了
                  </button>
                  {task.archivedAt ? (
                    <button
                      type="button"
                      disabled={!mutable}
                      title={!mutable ? "担当者または管理者のみ操作できます" : undefined}
                      onClick={() => unarchiveTask(task)}
                    >
                      復元
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={!mutable}
                      title={!mutable ? "担当者または管理者のみ操作できます" : undefined}
                      onClick={() => archiveTask(task)}
                    >
                      アーカイブ
                    </button>
                  )}
                </div>
              </article>
            );
          })}
          {filteredTasks.length === 0 ? <p className="muted">表示するタスクがありません。</p> : null}
        </div>
      </section>
    </div>
  );
}
