import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeVoterName } from "./voter-name";

// 참여자는 로그인하지 않고 브라우저 쿠키의 무작위 식별자로 구분한다 (ADR-0001).
const ID_COOKIE = "voter_id";
// 참여자 이름은 식별자와 별도 쿠키에 둔다. 꼬리표일 뿐 식별 수단이 아니다 (ADR-0003).
const NAME_COOKIE = "voter_name";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: ONE_YEAR_SECONDS,
} as const;

export async function getVoterId(): Promise<string | null> {
  return (await cookies()).get(ID_COOKIE)?.value ?? null;
}

// 쿠키 쓰기는 서버 액션에서만 가능하므로 표를 던질 때 발급한다.
export async function getOrCreateVoterId(): Promise<string> {
  const existing = await getVoterId();
  if (existing) return existing;
  const voterId = randomUUID();
  (await cookies()).set(ID_COOKIE, voterId, cookieOptions);
  return voterId;
}

// 한글 이름을 쿠키에 안전하게 담기 위해 인코딩한다. 규칙에 맞지 않는 값은 없는 것으로 본다.
export async function getVoterName(): Promise<string | null> {
  const raw = (await cookies()).get(NAME_COOKIE)?.value;
  if (!raw) return null;
  try {
    const result = normalizeVoterName(decodeURIComponent(raw));
    return result.ok ? result.name : null;
  } catch {
    return null;
  }
}

export async function setVoterName(name: string): Promise<void> {
  (await cookies()).set(NAME_COOKIE, encodeURIComponent(name), cookieOptions);
}

// 참여자 화면은 이름이 있어야 들어갈 수 있다. 없으면 이름 입력 화면으로 보내고 돌아올 주소를 넘긴다.
export async function requireVoterName(returnPath: string): Promise<string> {
  const name = await getVoterName();
  if (!name) redirect(`/name?next=${encodeURIComponent(returnPath)}`);
  return name;
}
