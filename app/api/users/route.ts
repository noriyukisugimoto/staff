import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requireSession } from "@/lib/session";

const createUserSchema = z.object({
  loginId: z.string().regex(/^\d{3}$/),
  name: z.string().min(1),
  department: z.string().optional(),
  role: z.nativeEnum(Role).default(Role.STAFF),
  password: z.string().min(4)
});

export async function GET() {
  const session = await requireSession(false);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "管理者のみ実行できます。" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      loginId: true,
      name: true,
      department: true,
      role: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await requireSession(false);
  if (!session) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }
  if (session.user.role !== Role.ADMIN) {
    return NextResponse.json({ error: "管理者のみ実行できます。" }, { status: 403 });
  }

  const payload = await request.json();
  const parsed = createUserSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です。" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { loginId: parsed.data.loginId } });
  if (exists) {
    return NextResponse.json({ error: "同じ3桁IDが既に存在します。" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      loginId: parsed.data.loginId,
      name: parsed.data.name,
      department: parsed.data.department,
      role: parsed.data.role,
      passwordHash: hashPassword(parsed.data.password)
    },
    select: {
      id: true,
      loginId: true,
      name: true,
      department: true,
      role: true,
      createdAt: true
    }
  });

  return NextResponse.json({ user }, { status: 201 });
}
