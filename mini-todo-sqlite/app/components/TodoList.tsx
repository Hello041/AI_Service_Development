"use client";

import type { Task } from "@prisma/client";
import { useRouter } from "next/navigation";

import { isValidPriority, PRIORITIES, PRIORITY_LABELS, type Priority } from "@/lib/priority";

type TodoListProps = {
  tasks: Task[];
};

const PRIORITY_BADGE_CLASSES: Record<Priority, string> = {
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  low: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100",
};

function taskPriority(task: Task): Priority {
  return isValidPriority(task.priority) ? task.priority : "medium";
}

export function TodoList({ tasks }: TodoListProps) {
  const router = useRouter();

  if (tasks.length === 0) {
    return <p>할 일이 없습니다.</p>;
  }

  async function handleToggle(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !task.completed }),
    });
    router.refresh();
  }

  async function handleDelete(task: Task) {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    router.refresh();
  }

  async function handlePriorityChange(task: Task, priority: Priority) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priority }),
    });
    router.refresh();
  }

  return (
    <ul className="flex flex-col gap-2">
      {tasks.map((task) => {
        const priority = taskPriority(task);

        return (
          <li
            key={task.id}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => handleToggle(task)}
                aria-label={`${task.title} 완료 여부`}
              />
              <span className="flex-1">
                {task.title} — {task.completed ? "완료" : "미완료"}
              </span>
              <span className={`rounded px-2 py-0.5 text-sm ${PRIORITY_BADGE_CLASSES[priority]}`}>
                {PRIORITY_LABELS[priority]}
              </span>
              <button type="button" onClick={() => handleDelete(task)}>
                삭제
              </button>
            </div>
            <div className="flex items-center gap-1" role="group" aria-label={`${task.title} 우선순위 변경`}>
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePriorityChange(task, p)}
                  aria-pressed={priority === p}
                  className={
                    priority === p
                      ? `rounded px-2 py-1 text-sm font-semibold ${PRIORITY_BADGE_CLASSES[p]}`
                      : "rounded px-2 py-1 text-sm text-zinc-500 dark:text-zinc-400"
                  }
                >
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
