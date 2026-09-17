import { prisma } from "@/lib/prisma";
import type { Task } from "@prisma/client";

export function getTasks(): Promise<Task[]> {
  return prisma.task.findMany({ orderBy: { createdAt: "asc" } });
}
