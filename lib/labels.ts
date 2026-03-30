import { TaskPriority, TaskStatus } from "@prisma/client";

export const taskStatusLabel: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "未着手",
  [TaskStatus.IN_PROGRESS]: "進行中",
  [TaskStatus.DONE]: "完了"
};

export const taskPriorityLabel: Record<TaskPriority, string> = {
  [TaskPriority.HIGH]: "高",
  [TaskPriority.MEDIUM]: "中",
  [TaskPriority.LOW]: "低"
};
