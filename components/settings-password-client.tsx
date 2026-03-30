"use client";

import { FormEvent, useState } from "react";

export function SettingsPasswordClient() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const response = await fetch("/api/me/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, nextPassword })
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? "変更に失敗しました。");
      return;
    }
    setCurrentPassword("");
    setNextPassword("");
    setMessage("パスワードを変更しました。");
  }

  return (
    <section className="card" style={{ maxWidth: 560 }}>
      <h2>パスワード変更</h2>
      <form onSubmit={handleSubmit} className="grid">
        <label>
          現在のパスワード
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>
        <label>
          新しいパスワード（4文字以上）
          <input
            type="password"
            value={nextPassword}
            onChange={(event) => setNextPassword(event.target.value)}
            required
          />
        </label>
        <button type="submit">更新する</button>
        {message ? <p>{message}</p> : null}
      </form>
    </section>
  );
}
