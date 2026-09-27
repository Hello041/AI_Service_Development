import { describe, expect, test } from "vitest";
import { normalizeVoterName, safeReturnPath } from "./voter-name";

describe("참여자 이름 검증", () => {
  test("앞뒤 공백을 지운 이름을 돌려준다", () => {
    expect(normalizeVoterName("  최지원 ")).toEqual({ ok: true, name: "최지원" });
  });

  test("비었거나 공백뿐이면 거부한다", () => {
    expect(normalizeVoterName("")).toEqual({ ok: false, error: "name_empty" });
    expect(normalizeVoterName("   ")).toEqual({ ok: false, error: "name_empty" });
  });

  test("20자까지 허용하고 21자는 거부한다", () => {
    expect(normalizeVoterName("가".repeat(20))).toEqual({ ok: true, name: "가".repeat(20) });
    expect(normalizeVoterName("가".repeat(21))).toEqual({ ok: false, error: "name_too_long" });
  });

  test("이모지는 한 글자로 센다", () => {
    expect(normalizeVoterName("😀".repeat(20)).ok).toBe(true);
  });
});

describe("이름 입력 후 돌아갈 주소", () => {
  test("앱 안의 경로는 그대로 쓴다", () => {
    expect(safeReturnPath("/polls/abc123")).toBe("/polls/abc123");
    expect(safeReturnPath("/")).toBe("/");
  });

  test.each([null, "", "https://evil.example", "//evil.example", "/\\evil.example", "polls/abc"])(
    "앱 밖이거나 이상한 주소(%s)는 첫 화면으로 보낸다",
    (value) => {
      expect(safeReturnPath(value)).toBe("/");
    },
  );
});
