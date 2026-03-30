# 本番デプロイ（Vercel + PostgreSQL / Neon）

最短ルートの手順です。`prisma/migrations` 内の SQL は SQLite 向けのため、**PostgreSQL では `prisma migrate deploy` は使わず**、スキーマは [`prisma/schema.prisma`](../prisma/schema.prisma) を正として `db push` で同期します。

## 1. GitHub にコードを置く

プロジェクトルートで（未初期化なら）:

```bash
git init
git add .
git commit -m "Initial commit"
```

GitHub で空リポジトリを作成し、表示されたコマンドで `remote` を追加して `push` してください。

## 2. Neon で PostgreSQL を用意

1. [Neon](https://neon.tech) でプロジェクト作成
2. 接続文字列（`DATABASE_URL`）をコピー（`?sslmode=require` が付いていればそのまま）

## 3. ローカルで DB にスキーマを載せる

`.env` に `DATABASE_URL` を設定（`.env.example` を参考）。

```bash
npm.cmd install
npx.cmd prisma generate
npx.cmd prisma db push
npm.cmd run prisma:seed
```

動作確認:

```bash
npm.cmd run dev
```

## 4. Vercel にデプロイ

1. [Vercel](https://vercel.com) にログインし、GitHub リポジトリを Import
2. **Environment Variables** に以下を設定:
   - `DATABASE_URL` — Neon の接続文字列（手順 2 と同じ）
   - `NEXTAUTH_URL` — デプロイ完了後に表示される URL（例: `https://xxx.vercel.app`）。初回は仮 URLでデプロイし、後から更新して Redeploy してもよい
   - `NEXTAUTH_SECRET` — 本番用の長いランダム文字列

3. **Build Command** はリポジトリの `package.json` の `build`（`prisma generate && next build`）をそのまま利用

4. Deploy 後、**本番 URL が確定したら** `NEXTAUTH_URL` をその URL に合わせ、必要なら Redeploy

## 5. 本番スモークテスト

- ログイン（初期ユーザーはシード済みの場合）
- タスク一覧・作成・詳細

## 注意

- 初期シードのパスワードは本番で変更するか、本番ではシードを流さない運用を推奨します。
- スキーマ変更後は、ローカルで `npx prisma db push` を Neon に対して実行してから、再デプロイしてください。
