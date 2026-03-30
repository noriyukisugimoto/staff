"use client";

import { Role } from "@prisma/client";
import { FormEvent, useState } from "react";

type User = {
  id: string;
  loginId: string;
  name: string | null;
  department: string | null;
  role: Role;
  createdAt: string;
};

type Props = {
  initialUsers: User[];
  currentUserId: string;
};

export function UserManagementClient({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [loginId, setLoginId] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<Role>(Role.STAFF);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function reloadUsers() {
    const response = await fetch("/api/users");
    const data = await response.json();
    setUsers((data.users ?? []).map((u: User) => ({ ...u, createdAt: String(u.createdAt) })));
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const response = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loginId,
        name,
        department: department || undefined,
        role,
        password
      })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "ユーザー作成に失敗しました。");
      return;
    }
    setLoginId("");
    setName("");
    setDepartment("");
    setRole(Role.STAFF);
    setPassword("");
    setMessage("ユーザーを追加しました。");
    await reloadUsers();
  }

  async function handleDelete(user: User) {
    const ok = window.confirm(`ID ${user.loginId} (${user.name ?? "名前未設定"}) を削除しますか？`);
    if (!ok) return;

    setMessage(null);
    const response = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "ユーザー削除に失敗しました。");
      return;
    }
    setMessage("ユーザーを削除しました。");
    await reloadUsers();
  }

  return (
    <div className="grid">
      <section className="card">
        <h2>ユーザー追加</h2>
        <form onSubmit={handleCreate} className="grid">
          <div className="row">
            <input
              placeholder="3桁ID（例: 102）"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              pattern="\d{3}"
              required
            />
            <input placeholder="名前" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="row">
            <input
              placeholder="部門（例: 営業部）"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
            <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value={Role.STAFF}>一般</option>
              <option value={Role.ADMIN}>管理者</option>
            </select>
            <input
              placeholder="初期パスワード（4文字以上）"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit">追加する</button>
          {message ? <p>{message}</p> : null}
        </form>
      </section>

      <section className="card">
        <h2>登録ユーザー一覧</h2>
        <div className="grid">
          {users.map((user) => (
            <article key={user.id} className="card">
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{user.name ?? "(名前未設定)"}</strong>
                <span>ID: {user.loginId}</span>
                <span>{user.role === Role.ADMIN ? "管理者" : "一般"}</span>
              </div>
              <div className="row">
                <span>{user.department ?? "部門未設定"}</span>
                <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(user)}
                  disabled={user.id === currentUserId}
                  title={user.id === currentUserId ? "自分自身は削除できません" : "このユーザーを削除"}
                >
                  削除
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
