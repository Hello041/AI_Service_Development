"use server";

import { redirect } from "next/navigation";
import { normalizeVoterName, safeReturnPath, type VoterNameError } from "@/lib/voter-name";
import { setVoterName } from "@/lib/voter";

export type NameState = { error?: string };

const nameErrorMessages: Record<VoterNameError, string> = {
  name_empty: "이름을 입력해 주세요.",
  name_too_long: "이름은 20자까지 입력할 수 있습니다.",
};

export async function saveVoterNameAction(
  _prev: NameState,
  formData: FormData,
): Promise<NameState> {
  const result = normalizeVoterName(String(formData.get("name") ?? ""));
  if (!result.ok) return { error: nameErrorMessages[result.error] };
  await setVoterName(result.name);
  redirect(safeReturnPath(formData.get("next") as string | null));
}
