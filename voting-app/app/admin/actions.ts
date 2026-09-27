"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logIn, logOut, requireAdmin } from "@/lib/admin-session";
import { getPollService } from "@/lib/db";
import { parseKstInput } from "@/lib/kst-time";
import { createPollErrorMessages } from "@/lib/poll-messages";
import type { SetDeadlineError } from "@/lib/polls";

export type LoginState = { error?: string };
export type CreatePollState = { error?: string };

const FAILED_LOGIN_DELAY_MS = 1000;

export async function logInAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  if (!(await logIn(password))) {
    // 비밀번호 대입 속도를 늦춘다.
    await new Promise((resolve) => setTimeout(resolve, FAILED_LOGIN_DELAY_MS));
    return { error: "비밀번호가 올바르지 않습니다." };
  }
  redirect("/admin");
}

export async function logOutAction(): Promise<void> {
  await logOut();
  redirect("/admin/login");
}

export async function createPollAction(
  _prev: CreatePollState,
  formData: FormData,
): Promise<CreatePollState> {
  await requireAdmin();
  const question = String(formData.get("question") ?? "");
  const options = formData.getAll("option").map(String);
  let deadline: Date | null = null;
  if (formData.get("noDeadline") !== "on") {
    deadline = parseKstInput(String(formData.get("deadline") ?? ""));
    if (!deadline) return { error: "마감 시각을 날짜와 시각까지 입력해 주세요." };
  }
  const named = formData.get("named") === "on";
  const result = await getPollService().createPoll(question, options, { deadline, named });
  if (!result.ok) return { error: createPollErrorMessages[result.error] };
  redirect(`/admin/polls/${result.id}?created=1`);
}

export async function closePollAction(pollId: string): Promise<void> {
  await requireAdmin();
  await getPollService().closePoll(pollId);
  redirect(`/admin/polls/${pollId}`);
}

export async function deletePollAction(pollId: string): Promise<void> {
  await requireAdmin();
  await getPollService().deletePoll(pollId);
  redirect("/admin");
}

export type DeadlineState = { error?: string; saved?: boolean };

const setDeadlineErrorMessages: Record<SetDeadlineError, string> = {
  poll_not_found: "없는 투표입니다.",
  poll_closed: "마감된 투표의 마감 시각은 바꿀 수 없습니다.",
  deadline_not_in_future: "마감 시각은 지금보다 뒤여야 합니다.",
};

export async function setDeadlineAction(
  pollId: string,
  _prev: DeadlineState,
  formData: FormData,
): Promise<DeadlineState> {
  await requireAdmin();
  let deadline: Date | null = null;
  if (formData.get("intent") !== "clear") {
    deadline = parseKstInput(String(formData.get("deadline") ?? ""));
    if (!deadline) return { error: "마감 시각을 날짜와 시각까지 입력해 주세요." };
  }
  const result = await getPollService().setDeadline(pollId, deadline);
  if (!result.ok) return { error: setDeadlineErrorMessages[result.error] };
  revalidatePath(`/admin/polls/${pollId}`);
  return { saved: true };
}
