"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { isValidPriority, PRIORITIES, PRIORITY_LABELS, type Priority } from "@/lib/priority";

export function AddTodoForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, priority }),
    });

    if (!response.ok) {
      const body: { error?: { message?: string } } = await response.json();
      setError(body.error?.message ?? "할 일을 추가하지 못했습니다.");
      setIsSubmitting(false);
      return;
    }

    setTitle("");
    setPriority("medium");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="할 일을 입력하세요"
        aria-label="할 일 제목"
      />
      <select
        value={priority}
        onChange={(event) => setPriority(isValidPriority(event.target.value) ? event.target.value : "medium")}
        aria-label="우선순위"
      >
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABELS[p]}
          </option>
        ))}
      </select>
      <button type="submit" disabled={isSubmitting}>
        추가
      </button>
      {error ? <p role="alert">{error}</p> : null}
    </form>
  );
}
