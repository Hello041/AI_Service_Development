import { Prisma } from "@prisma/client";

import { fail, ok } from "@/lib/api-response";
import { isValidPriority, type Priority } from "@/lib/priority";
import { prisma } from "@/lib/prisma";
import { isValidCompleted } from "@/lib/validation";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body: unknown = await request.json().catch(() => null);
  const hasCompleted = !!(body && typeof body === "object" && "completed" in body);
  const hasPriority = !!(body && typeof body === "object" && "priority" in body);

  if (!hasCompleted && !hasPriority) {
    return fail("completed 또는 priority 중 하나 이상을 포함해야 합니다.", 400);
  }

  const data: { completed?: boolean; priority?: Priority } = {};

  if (hasCompleted) {
    const rawCompleted = (body as { completed: unknown }).completed;
    if (!isValidCompleted(rawCompleted)) {
      return fail("completed는 boolean 값이어야 합니다.", 400);
    }
    data.completed = rawCompleted;
  }

  if (hasPriority) {
    const rawPriority = (body as { priority: unknown }).priority;
    if (!isValidPriority(rawPriority)) {
      return fail("priority는 high, medium, low 중 하나여야 합니다.", 400);
    }
    data.priority = rawPriority;
  }

  try {
    const task = await prisma.task.update({
      where: { id },
      data,
    });
    return ok(task);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return fail("해당 id의 할 일을 찾을 수 없습니다.", 404);
    }
    throw error;
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  try {
    await prisma.task.delete({ where: { id } });
    return ok({ id });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return fail("해당 id의 할 일을 찾을 수 없습니다.", 404);
    }
    throw error;
  }
}
