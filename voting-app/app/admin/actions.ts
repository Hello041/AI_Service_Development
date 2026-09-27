"use server";

import { redirect } from "next/navigation";
import { logIn, logOut, requireAdmin } from "@/lib/admin-session";
import { getPollService } from "@/lib/db";
import { createPollErrorMessages } from "@/lib/poll-messages";

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
  const result = await getPollService().createPoll(question, options);
  if (!result.ok) return { error: createPollErrorMessages[result.error] };
  redirect(`/admin/polls/${result.id}?created=1`);
}

export async function closePollAction(pollId: string): Promise<void> {
  await requireAdmin();
  await getPollService().closePoll(pollId);
  redirect(`/admin/polls/${pollId}`);
}
