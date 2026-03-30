import { type Session } from "next-auth";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function requireSession(redirectIfMissing = true): Promise<Session | null> {
  const session = await auth();
  if (!session && redirectIfMissing) {
    redirect("/login");
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "ADMIN") {
    redirect("/tasks");
  }
  return session;
}
