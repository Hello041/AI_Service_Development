import Link from "next/link";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/admin-session";
import { getPollService } from "@/lib/db";

export default async function AdminPollPage({
  params,
  searchParams,
}: PageProps<"/admin/polls/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  const poll = await getPollService().getPoll(id);

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
      <h1 className="text-xl font-semibold">{poll.question}</h1>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-medium">공유 링크</span>
        <input
          readOnly
          value={shareUrl}
          aria-label="공유 링크"
          className="w-full rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/20"
        />
      </div>
      <ul className="flex flex-col gap-2">
        {poll.options.map((option) => (
          <li
            key={option.id}
            className="rounded-lg border border-black/10 px-4 py-3 dark:border-white/15"
          >
            {option.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
