const { PrismaClient, Role, TaskStatus } = require("@prisma/client");
const { createHash } = require("node:crypto");

const prisma = new PrismaClient();

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { loginId: "001" },
    update: {},
    create: {
      loginId: "001",
      name: "Admin User",
      department: "管理部",
      role: Role.ADMIN,
      passwordHash: sha256("1234")
    }
  });

  const staff = await prisma.user.upsert({
    where: { loginId: "101" },
    update: {},
    create: {
      loginId: "101",
      name: "Staff User",
      department: "営業部",
      role: Role.STAFF,
      passwordHash: sha256("1234")
    }
  });

  const task = await prisma.task.create({
    data: {
      title: "初期データ: 月次レポート準備",
      description: "提出資料を取りまとめる",
      status: TaskStatus.IN_PROGRESS,
      priority: "HIGH",
      assignments: {
        create: [{ userId: staff.id, sortOrder: 0 }]
      }
    }
  });

  await prisma.taskHistory.create({
    data: {
      taskId: task.id,
      changedById: admin.id,
      fromStatus: null,
      toStatus: TaskStatus.IN_PROGRESS
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
