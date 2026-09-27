// 참여자 이름 규칙. 브라우저(입력 폼)와 서버(액션, 투표 모듈)가 함께 쓴다.
// 이름은 꼬리표일 뿐 식별 수단이 아니다 (ADR-0003).

export const MAX_VOTER_NAME_LENGTH = 20;

export type VoterNameError = "name_empty" | "name_too_long";

export function normalizeVoterName(
  raw: string,
): { ok: true; name: string } | { ok: false; error: VoterNameError } {
  const name = raw.trim();
  if (name === "") return { ok: false, error: "name_empty" };
  // 이모지 등이 2글자로 세어지지 않도록 코드 포인트 단위로 센다.
  if ([...name].length > MAX_VOTER_NAME_LENGTH) return { ok: false, error: "name_too_long" };
  return { ok: true, name };
}

// 이름을 적은 뒤 돌아갈 주소. 외부 사이트로 보내지 않도록 앱 안의 경로만 허용한다.
export function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  return value;
}
