import { describe, expect, test } from "vitest";
import {
  createSessionToken,
  verifyPassword,
  verifySessionToken,
} from "./admin-auth";

const SECRET = "test-session-secret";
const HOUR = 60 * 60 * 1000;
const issuedAt = Date.UTC(2026, 8, 27, 12, 0, 0);

describe("운영자 비밀번호 확인", () => {
  test("설정된 비밀번호와 같으면 통과한다", () => {
    expect(verifyPassword("correct-horse-battery", "correct-horse-battery")).toBe(true);
  });

  test("다르면 거부한다", () => {
    expect(verifyPassword("wrong", "correct-horse-battery")).toBe(false);
  });
});

describe("운영자 세션", () => {
  test("발급한 세션은 발급 직후 유효하다", () => {
    const token = createSessionToken(SECRET, issuedAt);
    expect(verifySessionToken(token, SECRET, issuedAt)).toBe(true);
  });

  test("발급 후 23시간이 지나도 유효하다", () => {
    const token = createSessionToken(SECRET, issuedAt);
    expect(verifySessionToken(token, SECRET, issuedAt + 23 * HOUR)).toBe(true);
  });

  test("발급 후 1일이 지나면 만료된다", () => {
    const token = createSessionToken(SECRET, issuedAt);
    expect(verifySessionToken(token, SECRET, issuedAt + 24 * HOUR)).toBe(false);
  });

  test("만료 시각을 늘려 위조한 세션은 거부한다", () => {
    const [, signature] = createSessionToken(SECRET, issuedAt).split(".");
    const forged = `${issuedAt + 365 * 24 * HOUR}.${signature}`;
    expect(verifySessionToken(forged, SECRET, issuedAt)).toBe(false);
  });

  test("다른 서명 키로 발급된 세션은 거부한다", () => {
    const token = createSessionToken("other-secret", issuedAt);
    expect(verifySessionToken(token, SECRET, issuedAt)).toBe(false);
  });

  test("형식이 깨진 세션은 거부한다", () => {
    expect(verifySessionToken("garbage", SECRET, issuedAt)).toBe(false);
    expect(verifySessionToken("", SECRET, issuedAt)).toBe(false);
  });
});
