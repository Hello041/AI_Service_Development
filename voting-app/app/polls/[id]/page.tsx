import Link from "next/link";
import { connection } from "next/server";
import { getPollService } from "@/lib/db";

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  await connection();
  const { id } = await params;
  const poll = await getPollService().getPoll(id);

  if (!poll) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-semibold">없는 투표입니다</h1>
        <p className="text-zinc-500">삭제되었거나 주소가 잘못되었습니다.</p>
        <Link href="/" className="underline">
          투표 목록으로
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">{poll.question}</h1>
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
