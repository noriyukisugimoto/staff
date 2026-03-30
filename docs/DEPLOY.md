# 本番デプロイ（Vercel + PostgreSQL / Neon）

## インターネットで使えるようにする（やることの順番）

1. [Vercel](https://vercel.com) にログインする（GitHub アカウントで続行可）。
2. **Add New… → Project** で **Import Git Repository** から **`noriyukisugimoto/staff`**（このリポジトリ）を選ぶ。
3. **Configure Project** の画面で **Environment Variables** を開き、次を追加する（値は自分のものに置き換え）。
   - `DATABASE_URL` — Neon の接続文字列（ローカルの `.env` と同じでよい）
   - `NEXTAUTH_SECRET` — ローカルと別でもよい、**長いランダムな文字列**
   - `NEXTAUTH_URL` — まだ URL が分からなければ、いったん `https://placeholder.vercel.app` のように仮でもよい（後で直す）
4. **Deploy** を押して初回デプロイを待つ。
5. デプロイ完了後に表示される **本番 URL**（`https://xxxx.vercel.app`）をコピーする。
6. Vercel の **Settings → Environment Variables** で **`NEXTAUTH_URL`** を、その **本番 URL**（`https` から始まる、そのまま）に**書き換え**、**Save** したあと **Deployments** から **Redeploy** する。

これでブラウザからその URL にアクセスできるようになります。ログインはローカルと同じユーザー（DB を共有している場合）で試せます。

---

最短ルートの手順です。`prisma/migrations` 内の SQL は SQLite 向けのため、**PostgreSQL では `prisma migrate deploy` は使わず**、スキーマは [`prisma/schema.prisma`](../prisma/schema.prisma) を正として `db push` で同期します。

## 1. GitHub にコードを置く

リポジトリは初期化済み（`git init` と初回コミット済み）です。未連携なら GitHub で空リポジトリを作成し:

```bash
git remote add origin https://github.com/YOUR_USER/YOUR_REPO.git
git branch -M main
git push -u origin main
```

（`YOUR_USER/YOUR_REPO` は置き換え。初回のみ GitHub の認証が必要です。）

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
