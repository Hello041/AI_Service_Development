"use server";

import { redirect } from "next/navigation";
import { getPollService } from "@/lib/db";
import type { CastVoteError } from "@/lib/polls";
import { getOrCreateVoterId, getVoterName } from "@/lib/voter";

export type VoteState = { error?: string };

const castVoteErrorMessages: Record<CastVoteError, string> = {
  poll_not_found: "없는 투표입니다. 삭제되었을 수 있습니다.",
  poll_closed: "마감된 투표입니다. 새로고침하면 결과를 볼 수 있습니다.",
  option_not_in_poll: "선택지를 다시 골라 주세요.",
  already_voted: "이미 이 투표에 참여했습니다.",
  voter_name_required: "이름을 먼저 입력해 주세요.",
  voter_name_too_long: "이름이 너무 깁니다. 오른쪽 위 '변경'에서 20자 이내로 바꿔 주세요.",
};

export async function castVoteAction(
  pollId: string,
  _prev: VoteState,
  formData: FormData,
): Promise<VoteState> {
  const optionId = Number(formData.get("optionId"));
  if (!Number.isInteger(optionId) || optionId <= 0) {
    return { error: "선택지를 골라 주세요." };
  }

  const voterId = await getOrCreateVoterId();
  const result = await getPollService().castVote(
    pollId,
    optionId,
    voterId,
    await getVoterName(),
  );
  // 기명 투표인데 이름이 없으면 이름을 받은 뒤 이 투표로 돌아오게 한다.
  if (!result.ok && result.error === "voter_name_required") {
    redirect(`/name?next=${encodeURIComponent(`/polls/${pollId}`)}`);
  }
  // 이미 참여했다면 결과 화면으로 보내는 것으로 충분하다.
  if (!result.ok && result.error !== "already_voted") {
    return { error: castVoteErrorMessages[result.error] };
  }
  redirect(`/polls/${pollId}`);
}
