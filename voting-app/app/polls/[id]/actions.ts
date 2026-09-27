"use server";

import { redirect } from "next/navigation";
import { getPollService } from "@/lib/db";
import type { CastVoteError } from "@/lib/polls";
import { getOrCreateVoterId } from "@/lib/voter";

export type VoteState = { error?: string };

const castVoteErrorMessages: Record<CastVoteError, string> = {
  poll_not_found: "없는 투표입니다. 삭제되었을 수 있습니다.",
  option_not_in_poll: "선택지를 다시 골라 주세요.",
  already_voted: "이미 이 투표에 참여했습니다.",
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
  const result = await getPollService().castVote(pollId, optionId, voterId);
  // 이미 참여했다면 결과 화면으로 보내는 것으로 충분하다.
  if (!result.ok && result.error !== "already_voted") {
    return { error: castVoteErrorMessages[result.error] };
  }
  redirect(`/polls/${pollId}`);
}
