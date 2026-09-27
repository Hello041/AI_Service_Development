import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

// 참여자는 로그인하지 않고 브라우저 쿠키의 무작위 식별자로 구분한다 (ADR-0001).
const COOKIE_NAME = "voter_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export async function getVoterId(): Promise<string | null> {
  return (await cookies()).get(COOKIE_NAME)?.value ?? null;
}

// 쿠키 쓰기는 서버 액션에서만 가능하므로 표를 던질 때 발급한다.
export async function getOrCreateVoterId(): Promise<string> {
  const existing = await getVoterId();
  if (existing) return existing;
  const voterId = randomUUID();
  (await cookies()).set(COOKIE_NAME, voterId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
  return voterId;
}
