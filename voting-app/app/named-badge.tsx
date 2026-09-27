export function NamedBadge({ named }: { named: boolean }) {
  return (
    <span className="shrink-0 rounded-full border border-black/15 px-2 py-0.5 text-xs text-zinc-600 dark:border-white/20 dark:text-zinc-300">
      {named ? "기명" : "익명"}
    </span>
  );
}
