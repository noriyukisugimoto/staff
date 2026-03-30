"use client";

import { TaskPriority, TaskStatus } from "@prisma/client";
import { useMemo, useState } from "react";

import { taskPriorityLabel, taskStatusLabel } from "@/lib/labels";
import { MAX_TASK_ASSIGNEES, normalizeAssigneeIds } from "@/lib/task-assignees";

type UserOption = {
  id: string;
  label: string;
};

type HistoryItem = {
  id: string;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus;
  changedAt: string;
  changedBy: {
    name: string | null;
    loginId: string;
  };
};

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  assigneeLabel: string | null;
  initialAssigneeIds: string[];
  histories: HistoryItem[];
};

type Props = {
  task: TaskDetail;
  users: UserOption[];
  canEdit: boolean;
};

function slotsFromIds(ids: string[]): [string, string, string] {
  const a = ids[0] ?? "";
  const b = ids[1] ?? "";
  const c = ids[2] ?? "";
  return [a, b, c];
}

export function TaskDetailClient({ task, users, canEdit }: Props) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const initialSlots = useMemo(() => slotsFromIds(task.initialAssigneeIds), [task.initialAssigneeIds]);
  const [slot1, setSlot1] = useState(initialSlots[0]);
  const [slot2, setSlot2] = useState(initialSlots[1]);
  const [slot3, setSlot3] = useState(initialSlots[2]);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setMessage(null);
    const assigneeIds = normalizeAssigneeIds([slot1, slot2, slot3]);
    const response = await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        status,
        priority,
        dueDate: dueDate || null,
        assigneeIds: canEdit ? assigneeIds : undefined
      })
    });
    setMessage(response.ok ? "保存しました。" : "保存に失敗しました。");
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>{canEdit ? "タスク編集" : "タスク詳細（閲覧のみ）"}</h2>
        {canEdit ? (
          <div className="grid">
            <label>
              タイトル
              <input value={title} onChange={(event) => setTitle(event.target.value)} />
            </label>
            <label>
              説明
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
            <div className="row">
              <label>
                状態
                <select value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)}>
                  <option value={TaskStatus.TODO}>{taskStatusLabel[TaskStatus.TODO]}</option>
                  <option value={TaskStatus.IN_PROGRESS}>{taskStatusLabel[TaskStatus.IN_PROGRESS]}</option>
                  <option value={TaskStatus.DONE}>{taskStatusLabel[TaskStatus.DONE]}</option>
                </select>
              </label>
              <label>
                優先度
                <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority)}>
                  <option value={TaskPriority.HIGH}>{taskPriorityLabel[TaskPriority.HIGH]}</option>
                  <option value={TaskPriority.MEDIUM}>{taskPriorityLabel[TaskPriority.MEDIUM]}</option>
                  <option value={TaskPriority.LOW}>{taskPriorityLabel[TaskPriority.LOW]}</option>
                </select>
              </label>
              <label>
                期限
                <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </label>
            </div>
            <div className="grid">
              <span className="muted">担当者（1〜{MAX_TASK_ASSIGNEES}人、重複不可）</span>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <label>
                  担当1
                  <select value={slot1} onChange={(event) => setSlot1(event.target.value)}>
                    <option value="">未設定</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  担当2
                  <select value={slot2} onChange={(event) => setSlot2(event.target.value)}>
                    <option value="">未設定</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  担当3
                  <select value={slot3} onChange={(event) => setSlot3(event.target.value)}>
                    <option value="">未設定</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <button type="button" onClick={save}>
              保存
            </button>
            {message ? <p>{message}</p> : null}
          </div>
        ) : (
          <div className="grid">
            <p>
              <strong>タイトル:</strong> {task.title}
            </p>
            <p>
              <strong>説明:</strong> {task.description || "—"}
            </p>
            <p>
              <strong>状態:</strong> {taskStatusLabel[task.status]}
            </p>
            <p>
              <strong>優先度:</strong> {taskPriorityLabel[task.priority]}
            </p>
            <p>
              <strong>期限:</strong>{" "}
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "未設定"}
            </p>
            <p>
              <strong>担当:</strong>{" "}
              {task.assigneeLabel ? (
                task.assigneeLabel
              ) : (
                <span style={{ color: "crimson" }}>未設定</span>
              )}
            </p>
          </div>
        )}
      </section>

      <section className="card">
        <h2>更新履歴</h2>
        <div className="grid">
          {task.histories.map((history) => (
            <article key={history.id} className="card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span>
                  {history.fromStatus != null ? taskStatusLabel[history.fromStatus] : "新規"} →{" "}
                  {taskStatusLabel[history.toStatus]}
                </span>
                <span>{new Date(history.changedAt).toLocaleString()}</span>
              </div>
              <p className="muted">
                変更者: {history.changedBy.name ?? `ID:${history.changedBy.loginId}`}
              </p>
            </article>
          ))}
          {task.histories.length === 0 ? <p className="muted">履歴はありません。</p> : null}
        </div>
      </section>
    </div>
  );
}
