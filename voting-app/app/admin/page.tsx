import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { getPollService } from "@/lib/db";
import { ClosedBadge } from "../closed-badge";
import { logOutAction } from "./actions";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const polls = await getPollService().listPolls();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">운영자 대시보드</h1>
        <form action={logOutAction}>
          <button type="submit" className="text-sm underline">
            로그아웃
          </button>
        </form>
      </div>
      <Link
        href="/admin/polls/new"
        className="rounded-lg bg-foreground px-4 py-2 text-center font-medium text-background"
      >
        새 투표 만들기
      </Link>
      {polls.length === 0 ? (
        <p className="text-zinc-500">아직 투표가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {polls.map((poll) => (
            <li key={poll.id}>
              <Link
                href={`/admin/polls/${poll.id}`}
                className="flex items-baseline justify-between gap-3 rounded-lg border border-black/10 px-4 py-3 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              >
                <span>{poll.question}</span>
                <span className="flex shrink-0 items-center gap-2 text-sm tabular-nums text-zinc-500">
                  {poll.closed && <ClosedBadge />}
                  {poll.totalVotes}표
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
