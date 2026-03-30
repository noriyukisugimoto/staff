import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_: Request, { params }: Params) {
  const session = await requireSession(false);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "管理者のみ実行できます。" }, { status: 403 });
  }

  const { id } = await params;
  if (session.user.id === id) {
    return NextResponse.json({ error: "自分自身は削除できません。" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true }
  });
  if (!target) {
    return NextResponse.json({ error: "ユーザーが見つかりません。" }, { status: 404 });
  }

  if (target.role === Role.ADMIN) {
    const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "最後の管理者は削除できません。" }, { status: 400 });
    }
  }

  await prisma.$transaction([
    prisma.taskAssignee.deleteMany({
      where: { userId: id }
    }),
    prisma.taskHistory.deleteMany({
      where: { changedById: id }
    }),
    prisma.user.delete({
      where: { id }
    })
  ]);

  return NextResponse.json({ ok: true });
}
