import Link from "next/link";
import { connection } from "next/server";
import { getPollService } from "@/lib/db";

export default async function Home() {
  await connection();
  const polls = await getPollService().listPolls();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">투표 목록</h1>
      {polls.length === 0 ? (
        <p className="text-zinc-500">아직 투표가 없습니다.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {polls.map((poll) => (
            <li key={poll.id}>
              <Link
                href={`/polls/${poll.id}`}
                className="block rounded-lg border border-black/10 px-4 py-3 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
              >
                {poll.question}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
