import { fail, ok } from "@/lib/api-response";
import { isValidPriority, type Priority } from "@/lib/priority";
import { prisma } from "@/lib/prisma";
import { isValidTitle } from "@/lib/validation";

export async function GET() {
  const tasks = await prisma.task.findMany({ orderBy: { createdAt: "asc" } });
  return ok(tasks);
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  const title = body && typeof body === "object" && "title" in body ? (body as { title: unknown }).title : undefined;
  const rawPriority = body && typeof body === "object" && "priority" in body ? (body as { priority: unknown }).priority : undefined;

  if (!isValidTitle(title)) {
    return fail("title은 비어 있지 않은 문자열이어야 합니다.", 400);
  }

  let priority: Priority = "medium";
  if (rawPriority !== undefined) {
    if (!isValidPriority(rawPriority)) {
      return fail("priority는 high, medium, low 중 하나여야 합니다.", 400);
    }
    priority = rawPriority;
  }

  const task = await prisma.task.create({
    data: { title: title.trim(), priority },
  });

  return ok(task, 201);
}
