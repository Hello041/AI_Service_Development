"use server";

import { redirect } from "next/navigation";
import { logIn, logOut } from "@/lib/admin-session";

export type LoginState = { error?: string };

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
