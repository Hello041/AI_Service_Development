import { formatDeadline, formatRemaining, isDeadlineSoon } from "@/lib/kst-time";

// "9월 30일 (수) 18:00 마감 · 5시간 남음". 24시간 이내면 강조한다.
export function DeadlineLabel({
  deadline,
  closed,
  now,
}: {
  deadline: Date | null;
  closed: boolean;
  now: Date;
}) {
  if (!deadline || closed) return null;
  const soon = isDeadlineSoon(deadline, now);
  return (
    <span
      className={`text-sm ${
        soon ? "font-semibold text-red-600 dark:text-red-400" : "text-zinc-500"
      }`}
    >
      {formatDeadline(deadline)} · {formatRemaining(deadline, now)}
    </span>
  );
}
