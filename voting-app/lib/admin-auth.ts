import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

// 토큰 형식: "<만료 시각(ms)>.<HMAC 서명>"
export function createSessionToken(secret: string, now: number): string {
  const expiresAt = String(now + SESSION_TTL_MS);
  return `${expiresAt}.${sign(expiresAt, secret)}`;
}

export function verifySessionToken(
  token: string,
  secret: string,
  now: number,
): boolean {
  const [expiresAt, signature] = token.split(".");
  if (!expiresAt || !signature) return false;
  const expected = Buffer.from(sign(expiresAt, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return false;
  }
  return now < Number(expiresAt);
}

// 길이가 달라도 비교 시간이 새지 않도록 해시끼리 비교한다.
export function verifyPassword(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
