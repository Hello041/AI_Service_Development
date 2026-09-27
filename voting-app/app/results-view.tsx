import type { Results } from "@/lib/polls";

export function ResultsView({
  results,
  myOptionId = null,
}: {
  results: Results;
  myOptionId?: number | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-500">총 {results.totalVotes}표</p>
      <ul className="flex flex-col gap-3">
        {results.options.map((option) => {
          const mine = option.id === myOptionId;
          return (
            <li key={option.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className={mine ? "font-semibold" : undefined}>
                  {option.text}
                  {mine && <span className="ml-2 text-xs text-zinc-500">내 선택</span>}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-zinc-500">
                  {option.votes}표 · {option.percent}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                <div
                  className="h-full rounded-full bg-foreground"
                  style={{ width: `${option.percent}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
