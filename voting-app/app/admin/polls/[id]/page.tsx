import Link from "next/link";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/admin-session";
import { getPollService } from "@/lib/db";
import { ClosedBadge } from "../../../closed-badge";
import { ResultsView } from "../../../results-view";
import { closePollAction, deletePollAction } from "../../actions";
import { ConfirmButton } from "../../confirm-button";

export default async function AdminPollPage({
  params,
  searchParams,
}: PageProps<"/admin/polls/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  const poll = await getPollService().getPollForAdmin(id);

  if (!poll) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">없는 투표입니다</h1>
        <Link href="/admin" className="underline">
          대시보드로
        </Link>
      </div>
    );
  }

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const shareUrl = `${origin}/polls/${poll.id}`;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin" className="text-sm underline">
        ← 대시보드
      </Link>
      {created && (
        <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
          투표를 만들었습니다. 아래 링크를 단톡방에 공유하세요.
        </p>
      )}
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold">{poll.question}</h1>
        {poll.closed && <ClosedBadge />}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">공유 링크</span>
        <input
          readOnly
          value={shareUrl}
          aria-label="공유 링크"
          className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
        />
      </div>
      <ResultsView results={poll.results} />
      {!poll.closed && (
        <form action={closePollAction.bind(null, poll.id)}>
          <ConfirmButton
            message="마감하면 더 이상 표를 받지 않으며, 되돌릴 수 없습니다. 마감할까요?"
            className="w-full rounded-lg border border-black/15 px-4 py-2 font-medium disabled:opacity-50 dark:border-white/20"
          >
            투표 마감
          </ConfirmButton>
        </form>
      )}
      <form action={deletePollAction.bind(null, poll.id)}>
        <ConfirmButton
          message={`이 투표를 삭제하면 표 ${poll.results.totalVotes}개도 함께 삭제되며, 되돌릴 수 없습니다. 삭제할까요?`}
          className="w-full rounded-lg px-4 py-2 font-medium text-red-600 disabled:opacity-50 dark:text-red-400"
        >
          투표 삭제
        </ConfirmButton>
      </form>
    </div>
  );
}
