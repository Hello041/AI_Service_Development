import type { Results } from "@/lib/polls";

// 결과를 가로 막대 그래프로 보여준다. 선택지는 만든 순서 그대로, 1위는 강조색.
export function ResultsView({
  results,
  myOptionId = null,
}: {
  results: Results;
  myOptionId?: number | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-zinc-500">총 {results.totalVotes}표</p>
      <ul className="flex flex-col gap-2">
        {results.options.map((option) => {
          const mine = option.id === myOptionId;
          return (
            <li
              key={option.id}
              className="relative min-h-12 overflow-hidden rounded-lg bg-black/5 dark:bg-white/10"
            >
              <div
                aria-hidden
                className={`absolute inset-y-0 left-0 ${
                  option.isLeader
                    ? "bg-indigo-500/40 dark:bg-indigo-400/45"
                    : "bg-black/15 dark:bg-white/20"
                }`}
                style={{ width: `${option.percent}%` }}
              />
              <div className="relative flex min-h-12 items-center justify-between gap-3 px-3 py-2">
                <span className={`break-words ${option.isLeader ? "font-semibold" : ""}`}>
                  {option.text}
                  {option.isLeader && (
                    <span className="ml-2 rounded bg-indigo-600 px-1.5 py-0.5 text-xs font-medium text-white">
                      1위
                    </span>
                  )}
                  {mine && <span className="ml-2 text-xs text-zinc-600 dark:text-zinc-300">내 선택</span>}
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="font-semibold">{option.percent}%</span>
                  <span className="ml-1 text-xs text-zinc-600 dark:text-zinc-300">
                    {option.votes}표
                  </span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
