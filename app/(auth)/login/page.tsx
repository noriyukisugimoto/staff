"use client";

import type { Route } from "next";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/tasks";

  const [loginId, setLoginId] = useState("101");
  const [password, setPassword] = useState("1234");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      loginId,
      password,
      callbackUrl,
      redirect: false
    });

    setLoading(false);
    if (result?.error) {
      setError("ログインに失敗しました。3桁IDとパスワードを確認してください。");
      return;
    }

    router.push((result?.url ?? callbackUrl) as Route);
    router.refresh();
  }

  return (
    <section className="card" style={{ maxWidth: 460, margin: "32px auto" }}>
      <h1>ログイン</h1>
      <p className="muted">初期ユーザー: 101 / 1234</p>
      <form onSubmit={handleSubmit} className="grid">
        <label>
          3桁ID
          <input
            value={loginId}
            inputMode="numeric"
            pattern="\d{3}"
            onChange={(event) => setLoginId(event.target.value)}
            required
          />
        </label>
        <label>
          パスワード（4文字以上）
          <input value={password} type="password" onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
        <button type="submit" disabled={loading}>
          {loading ? "送信中..." : "ログイン"}
        </button>
      </form>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <section className="card" style={{ maxWidth: 460, margin: "32px auto" }}>
          <h1>ログイン</h1>
          <p className="muted">読み込み中...</p>
        </section>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
