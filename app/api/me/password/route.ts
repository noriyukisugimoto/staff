import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requireSession } from "@/lib/session";

const passwordSchema = z
  .object({
    currentPassword: z.string().min(4),
    nextPassword: z.string().min(4)
  })
  .refine((value) => value.currentPassword !== value.nextPassword, {
    message: "新しいパスワードは現在のパスワードと異なる必要があります。"
  });

export async function PATCH(request: Request) {
  const session = await requireSession(false);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const payload = await request.json();
  const parsed = passwordSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です。" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "ユーザーが見つかりません。" }, { status: 404 });
  }
  if (!verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
    return NextResponse.json({ error: "現在のパスワードが違います。" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(parsed.data.nextPassword) }
  });

  return NextResponse.json({ ok: true });
}
