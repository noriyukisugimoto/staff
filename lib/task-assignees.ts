import { Role } from "@prisma/client";

import { prisma } from "@/lib/db";

export const MAX_TASK_ASSIGNEES = 3;

/** 重複除去・最大3人・順序維持 */
export function normalizeAssigneeIds(raw: (string | undefined | null)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of raw) {
    const t = id?.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= MAX_TASK_ASSIGNEES) break;
  }
  return out;
}

export async function validateUserIdsExist(ids: string[]): Promise<boolean> {
  if (ids.length === 0) return true;
  const count = await prisma.user.count({ where: { id: { in: ids } } });
  return count === ids.length;
}

export function userCanEditTask(role: Role, userId: string, assigneeUserIds: string[]): boolean {
  if (role === Role.ADMIN) return true;
  return assigneeUserIds.includes(userId);
}
