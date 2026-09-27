import Link from "next/link";
import { getPollService } from "@/lib/db";
import { getVoterId, requireVoterName } from "@/lib/voter";
import { DeadlineLabel } from "../../deadline-label";
import { ResultsView } from "../../results-view";
import { VoteForm } from "./vote-form";

export default async function PollPage({ params }: PageProps<"/polls/[id]">) {
  const { id } = await params;
  const voterName = await requireVoterName(`/polls/${id}`);
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
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{poll.question}</h1>
        <DeadlineLabel deadline={poll.deadline} closed={poll.closed} now={new Date()} />
      </div>
      <p className="text-sm text-zinc-500">
        {poll.named
          ? `기명 투표입니다. '${voterName}' 이름으로 표가 남고, 누가 무엇을 골랐는지는 운영자만 봅니다.`
          : "익명 투표입니다. 이름은 표에 남지 않습니다."}
      </p>
      {poll.results ? (
        <>
          <p className="rounded-lg bg-black/5 px-4 py-3 text-sm dark:bg-white/10">
            {poll.closed ? "마감된 투표입니다." : "이미 참여한 투표입니다."}
          </p>
          <ResultsView results={poll.results} myOptionId={poll.myOptionId} />
        </>
      ) : (
        <VoteForm pollId={poll.id} options={poll.options} />
      )}
    </div>
  );
}
