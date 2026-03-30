# スタッフ進捗共有アプリ (MVP)

小規模チーム向けに、タスク進捗を共有するPC向けWEBアプリです。

## 主な機能

- ログイン/ログアウト（NextAuth Credentials）
- ユーザーロール（一般/管理者）
- タスク作成・編集・状態更新（TODO / IN_PROGRESS / DONE）
- 進捗一覧と状態フィルタ
- 管理者向け全体ビュー（状態別件数、期限超過、担当者別件数）
- タスク状態変更履歴（TaskHistory）

## 技術構成

- Next.js (App Router) + TypeScript
- Prisma + **PostgreSQL**（開発・本番とも接続文字列で指定）
- NextAuth

## セットアップ

1. Node.js 20+ をインストール
2. 依存インストール

```bash
npm install
```

3. 環境変数作成

```bash
copy .env.example .env
```

`.env` の `DATABASE_URL` に **PostgreSQL の接続文字列**を設定します（無料枠なら [Neon](https://neon.tech) などで作成）。**SQLite の `file:...` のままでは動きません。**

4. Prisma 生成・スキーマ反映・シード

```bash
npm run prisma:generate
npx prisma db push
npm run prisma:seed
```

5. 開発サーバ起動

```bash
npm run dev
```

`prisma/migrations` は過去の SQLite 用履歴です。**PostgreSQL では `migrate dev` ではなく `db push` でスキーマを同期**してください。

## 本番デプロイ（Vercel + Neon）

手順は [docs/DEPLOY.md](docs/DEPLOY.md) を参照してください。

## 初期ログインユーザー（3桁ID）

- 管理者: `001` / `1234`
- 一般: `101` / `1234`

（シード実行後。本番ではパスワード変更を推奨します。）

## テスト

```bash
npm run test
```

## 主要パス

- `app/(auth)/login/page.tsx`
- `app/tasks/page.tsx`
- `app/tasks/[id]/page.tsx`
- `app/overview/page.tsx`
- `app/api/tasks/route.ts`
- `app/api/tasks/[id]/route.ts`
- `prisma/schema.prisma`
