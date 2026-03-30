import { UserManagementClient } from "@/components/admin/user-management-client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export default async function AdminUsersPage() {
  const session = await requireAdmin();

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

  return (
    <section className="grid">
      <h1>ユーザー管理</h1>
      <UserManagementClient
        initialUsers={users.map((user) => ({ ...user, createdAt: user.createdAt.toISOString() }))}
        currentUserId={session.user.id}
      />
    </section>
  );
}
