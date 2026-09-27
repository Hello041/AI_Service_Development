import { beforeEach, describe, expect, test } from "vitest";
import { createPollService, type PollService } from "./polls";
import { createTestQuery } from "./test-db";

let polls: PollService;

beforeEach(async () => {
  polls = createPollService(await createTestQuery());
});

describe("투표 만들기", () => {
  test("만든 투표를 질문과 선택지를 만든 순서대로 조회할 수 있다", async () => {
    const created = await polls.createPoll("회식 장소는?", ["고기집", "횟집", "중국집"]);
    if (!created.ok) throw new Error(created.error);

    const poll = await polls.getPoll(created.id);

    expect(poll?.question).toBe("회식 장소는?");
    expect(poll?.options.map((o) => o.text)).toEqual(["고기집", "횟집", "중국집"]);
  });

  const numbered = (n: number) => Array.from({ length: n }, (_, i) => `선택지 ${i + 1}`);

  test("선택지가 2개 미만이면 거부한다", async () => {
    expect(await polls.createPoll("질문", numbered(1))).toEqual({
      ok: false,
      error: "too_few_options",
    });
  });

  test("선택지가 10개를 넘으면 거부한다", async () => {
    expect(await polls.createPoll("질문", numbered(11))).toEqual({
      ok: false,
      error: "too_many_options",
    });
  });

  test.each([
    ["질문이 비었으면", "   ", ["A", "B"], "question_empty"],
    ["질문이 200자를 넘으면", "가".repeat(201), ["A", "B"], "question_too_long"],
    ["선택지가 비었으면", "질문", ["A", "  "], "option_empty"],
    ["선택지가 100자를 넘으면", "질문", ["A", "가".repeat(101)], "option_too_long"],
    ["공백만 다른 선택지가 중복되면", "질문", ["고기집", " 고기집 "], "duplicate_options"],
  ])("%s 거부한다", async (_, question, options, error) => {
    expect(await polls.createPoll(question, options)).toEqual({ ok: false, error });
  });

  test("질문 200자, 선택지 100자는 허용한다", async () => {
    const result = await polls.createPoll("가".repeat(200), ["나".repeat(100), "B"]);
    expect(result.ok).toBe(true);
  });

  test("질문과 선택지의 앞뒤 공백을 제거해 저장한다", async () => {
    const created = await polls.createPoll("  회식 장소는?  ", [" 고기집", "횟집 "]);
    if (!created.ok) throw new Error(created.error);

    const poll = await polls.getPoll(created.id);

    expect(poll?.question).toBe("회식 장소는?");
    expect(poll?.options.map((o) => o.text)).toEqual(["고기집", "횟집"]);
  });

  test("선택지 2개와 10개는 허용한다", async () => {
    expect((await polls.createPoll("질문", numbered(2))).ok).toBe(true);
    expect((await polls.createPoll("질문", numbered(10))).ok).toBe(true);
  });
});

describe("투표 조회", () => {
  test("없는 투표는 조회되지 않는다", async () => {
    expect(await polls.getPoll("no-such-poll")).toBeNull();
  });

  test("투표가 없으면 목록이 비어 있다", async () => {
    expect(await polls.listPolls()).toEqual([]);
  });

  test("목록은 최신순이다", async () => {
    await polls.createPoll("첫 번째", ["A", "B"]);
    await polls.createPoll("두 번째", ["A", "B"]);
    await polls.createPoll("세 번째", ["A", "B"]);

    const list = await polls.listPolls();

    expect(list.map((p) => p.question)).toEqual(["세 번째", "두 번째", "첫 번째"]);
  });
});
