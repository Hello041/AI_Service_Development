import Link from "next/link";
import { getPollService } from "@/lib/db";
import { getVoterId } from "@/lib/voter";
import { ResultsView } from "../../results-view";
import { VoteForm } from "./vote-form";

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  const poll = await getPollService().getPollForVoter(id, await getVoterId());

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
      {poll.results ? (
        <>
          <p className="rounded-lg bg-black/5 px-4 py-3 text-sm dark:bg-white/10">
            이미 참여한 투표입니다.
          </p>
          <ResultsView results={poll.results} myOptionId={poll.myOptionId} />
        </>
      ) : (
        <VoteForm pollId={poll.id} options={poll.options} />
      )}
    </div>
  );
}
