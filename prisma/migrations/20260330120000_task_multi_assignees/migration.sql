-- 担当者を TaskAssignee に移し、Task から assigneeId を削除する。
-- SQLite の制約のため、一度 FK なしでデータ移行し、Task 再作成後に FK 付きで作り直す。
-- archivedAt は過去のマイグレーションに無いため、ここでは NULL で埋める（db push で付いた列があっても移行時は落ちないよう Task からは基本列のみコピー）。

-- 1) 一時テーブル（FK なし）で担当を退避
CREATE TABLE "TaskAssignee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0
);

INSERT INTO "TaskAssignee" ("id", "taskId", "userId", "sortOrder")
SELECT lower(hex(randomblob(16))), "id", "assigneeId", 0
FROM "Task"
WHERE "assigneeId" IS NOT NULL;

CREATE TABLE "_ta_backup" AS SELECT * FROM "TaskAssignee";
DROP TABLE "TaskAssignee";

-- 2) Task を assigneeId なしで作り直し（archivedAt はマイグレーション由来の Task に無いので NULL）
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATETIME,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "new_Task" ("archivedAt", "createdAt", "description", "dueDate", "id", "priority", "status", "title", "updatedAt")
SELECT NULL, "createdAt", "description", "dueDate", "id", "priority", "status", "title", "updatedAt" FROM "Task";

DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";

-- 3) TaskAssignee を FK 付きで再作成
CREATE TABLE "TaskAssignee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "TaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "TaskAssignee" SELECT * FROM "_ta_backup";
DROP TABLE "_ta_backup";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

CREATE INDEX "TaskAssignee_taskId_idx" ON "TaskAssignee"("taskId");
CREATE UNIQUE INDEX "TaskAssignee_taskId_userId_key" ON "TaskAssignee"("taskId", "userId");
