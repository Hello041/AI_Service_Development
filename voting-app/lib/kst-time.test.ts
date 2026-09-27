import { describe, expect, test } from "vitest";
import {
  defaultDeadlineInput,
  formatDeadline,
  formatRemaining,
  isDeadlineSoon,
  parseKstInput,
  toKstInput,
} from "./kst-time";

// 2026-09-30 18:00 KST = 2026-09-30 09:00 UTC
const sept30at18kst = new Date(Date.UTC(2026, 8, 30, 9, 0));
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

describe("입력칸 값과 시각 변환", () => {
  test("입력칸 값은 한국 시간으로 읽는다", () => {
    expect(parseKstInput("2026-09-30T18:00")).toEqual(sept30at18kst);
  });

  test("한국 시간 자정 직후는 UTC로 전날이다", () => {
    expect(parseKstInput("2026-10-01T00:30")).toEqual(new Date(Date.UTC(2026, 8, 30, 15, 30)));
  });

  test("시각을 한국 시간 입력칸 값으로 바꾼다", () => {
    expect(toKstInput(sept30at18kst)).toBe("2026-09-30T18:00");
    expect(toKstInput(new Date(Date.UTC(2026, 11, 31, 15, 5)))).toBe("2027-01-01T00:05");
  });

  test("형식이 틀린 입력칸 값은 null이다", () => {
    for (const bad of ["", "2026-09-30", "2026-13-01T10:00", "2026-09-30T25:00", "내일"]) {
      expect(parseKstInput(bad)).toBeNull();
    }
  });

  test("기본 마감 시각은 지금부터 24시간 뒤의 분 단위 값이다", () => {
    const now = new Date(Date.UTC(2026, 8, 29, 9, 0, 42));
    expect(defaultDeadlineInput(now)).toBe("2026-09-30T18:00");
  });
});

describe("마감 시각 문구", () => {
  test("월·일·요일·시각을 한국 시간으로 보여준다", () => {
    expect(formatDeadline(sept30at18kst)).toBe("9월 30일 (수) 18:00 마감");
  });

  test("한국 시간으로 날짜가 바뀌는 시각", () => {
    expect(formatDeadline(new Date(Date.UTC(2026, 8, 30, 15, 5)))).toBe("10월 1일 (목) 00:05 마감");
  });
});

describe("남은 시간 문구", () => {
  test.each([
    [30 * 1000, "1분 남음"],
    [59 * MINUTE, "59분 남음"],
    [59 * MINUTE + 30 * 1000, "59분 남음"],
    [HOUR - 1000, "59분 남음"],
    [HOUR, "1시간 남음"],
    [5 * HOUR + 59 * MINUTE, "5시간 남음"],
    [23 * HOUR + 59 * MINUTE, "23시간 남음"],
    [24 * HOUR, "1일 남음"],
    [49 * HOUR, "2일 남음"],
  ])("%ims 남았으면 '%s'", (left, text) => {
    expect(formatRemaining(sept30at18kst, new Date(sept30at18kst.getTime() - left))).toBe(text);
  });
});

describe("마감 임박", () => {
  test("24시간 이내로 남으면 임박이다", () => {
    const at = (left: number) => new Date(sept30at18kst.getTime() - left);
    expect(isDeadlineSoon(sept30at18kst, at(24 * HOUR))).toBe(true);
    expect(isDeadlineSoon(sept30at18kst, at(MINUTE))).toBe(true);
    expect(isDeadlineSoon(sept30at18kst, at(24 * HOUR + MINUTE))).toBe(false);
  });

  test("이미 지났으면 임박이 아니다", () => {
    expect(isDeadlineSoon(sept30at18kst, new Date(sept30at18kst.getTime() + MINUTE))).toBe(false);
  });
});
