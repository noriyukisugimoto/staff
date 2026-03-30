"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();
  const isAdmin = session?.user.role === "ADMIN";

  return (
    <header className="card" style={{ marginBottom: 0, borderRadius: 0 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row">
          <strong>スタッフ進捗共有</strong>
          <Link href="/tasks">タスク一覧</Link>
          <Link href="/overview">全体ビュー</Link>
          {isAdmin ? <Link href="/admin/users">ユーザー管理</Link> : null}
          <Link href="/settings">設定</Link>
        </div>
        <div className="row">
          <span className="muted">{session ? `ID: ${session.user.loginId}` : "未ログイン"}</span>
          {session ? (
            <button type="button" onClick={() => signOut({ callbackUrl: "/login" })}>
              ログアウト
            </button>
          ) : (
            <Link href="/login">ログイン</Link>
          )}
        </div>
      </div>
    </header>
  );
}
