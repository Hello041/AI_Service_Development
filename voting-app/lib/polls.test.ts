import { beforeEach, describe, expect, test } from "vitest";
import { createPollService, type PollService } from "./polls";
import { createTestQuery } from "./test-db";

let polls: PollService;
// 테스트가 옮길 수 있는 "지금"
let now: Date;
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const later = (ms: number) => new Date(now.getTime() + ms);

beforeEach(async () => {
  now = new Date(Date.UTC(2026, 8, 30, 9, 0));
  polls = createPollService(await createTestQuery(), () => now);
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

async function createPoll(question: string, options: string[]) {
  const created = await polls.createPoll(question, options);
  if (!created.ok) throw new Error(created.error);
  const poll = await polls.getPoll(created.id);
  if (!poll) throw new Error("만든 투표를 찾을 수 없음");
  return poll;
}

describe("표 던지기", () => {
  test("표를 던진 참여자는 결과와 자기가 고른 선택지를 본다", async () => {
    const poll = await createPoll("회식 장소는?", ["고기집", "횟집"]);
    const [meat, fish] = poll.options;

    await polls.castVote(poll.id, fish.id, "voter-a");
    const view = await polls.getPollForVoter(poll.id, "voter-a");

    expect(view?.myOptionId).toBe(fish.id);
    expect(view?.results).toEqual({
      totalVotes: 1,
      options: [
        { id: meat.id, text: "고기집", votes: 0, percent: 0, isLeader: false },
        { id: fish.id, text: "횟집", votes: 1, percent: 100, isLeader: true },
      ],
    });
  });

  test("표를 던지지 않은 참여자에게는 결과가 보이지 않는다", async () => {
    const poll = await createPoll("질문", ["A", "B"]);
    await polls.castVote(poll.id, poll.options[0].id, "voter-a");

    const stranger = await polls.getPollForVoter(poll.id, "voter-b");
    const noCookie = await polls.getPollForVoter(poll.id, null);

    expect(stranger).toMatchObject({ myOptionId: null, results: null });
    expect(noCookie).toMatchObject({ myOptionId: null, results: null });
  });

  test("같은 참여자의 두 번째 표는 거부되고 첫 표가 유지된다", async () => {
    const poll = await createPoll("질문", ["A", "B"]);
    const [a, b] = poll.options;
    await polls.castVote(poll.id, a.id, "voter-a");

    const second = await polls.castVote(poll.id, b.id, "voter-a");
    const view = await polls.getPollForVoter(poll.id, "voter-a");

    expect(second).toEqual({ ok: false, error: "already_voted" });
    expect(view?.myOptionId).toBe(a.id);
    expect(view?.results?.totalVotes).toBe(1);
  });

  test("다른 참여자는 각각 표를 던질 수 있다", async () => {
    const poll = await createPoll("질문", ["A", "B"]);
    const [a, b] = poll.options;

    expect(await polls.castVote(poll.id, a.id, "voter-a")).toEqual({ ok: true });
    expect(await polls.castVote(poll.id, b.id, "voter-b")).toEqual({ ok: true });
    expect((await polls.getPollForVoter(poll.id, "voter-a"))?.results?.totalVotes).toBe(2);
  });

  test("다른 투표의 선택지로 던진 표는 거부한다", async () => {
    const poll = await createPoll("질문", ["A", "B"]);
    const other = await createPoll("다른 질문", ["C", "D"]);

    expect(await polls.castVote(poll.id, other.options[0].id, "voter-a")).toEqual({
      ok: false,
      error: "option_not_in_poll",
    });
  });

  test("있을 수 없는 선택지 번호로 던진 표는 거부한다", async () => {
    const poll = await createPoll("질문", ["A", "B"]);

    for (const optionId of [99_999_999_999, 0, -1, 1.5, Number.NaN]) {
      expect(await polls.castVote(poll.id, optionId, "voter-a")).toEqual({
        ok: false,
        error: "option_not_in_poll",
      });
    }
  });

  test("없는 투표에 던진 표는 거부한다", async () => {
    expect(await polls.castVote("no-such-poll", 1, "voter-a")).toEqual({
      ok: false,
      error: "poll_not_found",
    });
  });
});

describe("결과", () => {
  test("비율은 반올림한 정수 %이고, 표 수와 상관없이 만든 순서를 유지한다", async () => {
    const poll = await createPoll("질문", ["A", "B", "C"]);
    const [a, b, c] = poll.options;
    await polls.castVote(poll.id, c.id, "v1");
    await polls.castVote(poll.id, c.id, "v2");
    await polls.castVote(poll.id, b.id, "v3");

    const view = await polls.getPollForAdmin(poll.id);

    expect(view?.results).toEqual({
      totalVotes: 3,
      options: [
        { id: a.id, text: "A", votes: 0, percent: 0, isLeader: false },
        { id: b.id, text: "B", votes: 1, percent: 33, isLeader: false },
        { id: c.id, text: "C", votes: 2, percent: 67, isLeader: true },
      ],
    });
  });

  test("운영자는 표가 없어도 결과를 본다", async () => {
    const poll = await createPoll("질문", ["A", "B"]);

    const view = await polls.getPollForAdmin(poll.id);

    expect(view?.results.totalVotes).toBe(0);
    expect(view?.results.options.map((o) => o.percent)).toEqual([0, 0]);
  });

  test("운영자 조회도 없는 투표는 null이다", async () => {
    expect(await polls.getPollForAdmin("no-such-poll")).toBeNull();
  });

  test("목록에 투표별 총 표 수가 나온다", async () => {
    const first = await createPoll("첫 번째", ["A", "B"]);
    await createPoll("두 번째", ["A", "B"]);
    await polls.castVote(first.id, first.options[0].id, "v1");
    await polls.castVote(first.id, first.options[1].id, "v2");

    const list = await polls.listPolls();

    expect(list.map((p) => [p.question, p.totalVotes])).toEqual([
      ["두 번째", 0],
      ["첫 번째", 2],
    ]);
  });
});

describe("마감", () => {
  test("마감된 투표에 던진 표는 거부하고, 기존 결과는 남는다", async () => {
    const poll = await createPoll("질문", ["A", "B"]);
    await polls.castVote(poll.id, poll.options[0].id, "v1");

    await polls.closePoll(poll.id);
    const late = await polls.castVote(poll.id, poll.options[1].id, "v2");
    const view = await polls.getPollForAdmin(poll.id);

    expect(late).toEqual({ ok: false, error: "poll_closed" });
    expect(view?.closed).toBe(true);
    expect(view?.results.options.map((o) => o.votes)).toEqual([1, 0]);
  });

  test("마감되면 표를 던지지 않은 참여자도 결과를 본다", async () => {
    const poll = await createPoll("질문", ["A", "B"]);
    await polls.castVote(poll.id, poll.options[0].id, "v1");

    await polls.closePoll(poll.id);
    const view = await polls.getPollForVoter(poll.id, null);

    expect(view?.closed).toBe(true);
    expect(view?.myOptionId).toBeNull();
    expect(view?.results?.totalVotes).toBe(1);
  });

  test("이미 마감된 투표를 다시 마감해도 마감 상태 그대로다", async () => {
    const poll = await createPoll("질문", ["A", "B"]);

    await polls.closePoll(poll.id);
    await polls.closePoll(poll.id);

    expect((await polls.getPoll(poll.id))?.closed).toBe(true);
  });

  test("목록은 진행 중인 투표가 먼저, 마감된 투표가 나중이며 각각 최신순이다", async () => {
    await createPoll("오래된 진행", ["A", "B"]);
    const oldClosed = await createPoll("오래된 마감", ["A", "B"]);
    await createPoll("최근 진행", ["A", "B"]);
    const newClosed = await createPoll("최근 마감", ["A", "B"]);
    await polls.closePoll(oldClosed.id);
    await polls.closePoll(newClosed.id);

    const list = await polls.listPolls();

    expect(list.map((p) => [p.question, p.closed])).toEqual([
      ["최근 진행", false],
      ["오래된 진행", false],
      ["최근 마감", true],
      ["오래된 마감", true],
    ]);
  });
});

describe("삭제", () => {
  test("삭제한 투표는 목록과 조회에서 사라지고, 표도 받지 않는다", async () => {
    const poll = await createPoll("질문", ["A", "B"]);
    await polls.castVote(poll.id, poll.options[0].id, "v1");

    await polls.deletePoll(poll.id);

    expect(await polls.listPolls()).toEqual([]);
    expect(await polls.getPollForVoter(poll.id, "v1")).toBeNull();
    expect(await polls.getPollForAdmin(poll.id)).toBeNull();
    expect(await polls.castVote(poll.id, poll.options[1].id, "v2")).toEqual({
      ok: false,
      error: "poll_not_found",
    });
  });

  test("다른 투표의 표는 영향을 받지 않는다", async () => {
    const doomed = await createPoll("삭제할 투표", ["A", "B"]);
    const kept = await createPoll("남길 투표", ["A", "B"]);
    await polls.castVote(doomed.id, doomed.options[0].id, "v1");
    await polls.castVote(kept.id, kept.options[1].id, "v1");

    await polls.deletePoll(doomed.id);

    expect((await polls.getPollForAdmin(kept.id))?.results.options.map((o) => o.votes)).toEqual([0, 1]);
    expect((await polls.getPollForVoter(kept.id, "v1"))?.myOptionId).toBe(kept.options[1].id);
  });
});

describe("결과의 1위", () => {
  test("표를 가장 많이 받은 선택지만 1위다", async () => {
    const poll = await createPoll("질문", ["A", "B", "C"]);
    const [, b, c] = poll.options;
    await polls.castVote(poll.id, b.id, "v1");
    await polls.castVote(poll.id, b.id, "v2");
    await polls.castVote(poll.id, c.id, "v3");

    const view = await polls.getPollForAdmin(poll.id);

    expect(view?.results.options.map((o) => o.isLeader)).toEqual([false, true, false]);
  });

  test("1위가 동점이면 모두 1위다", async () => {
    const poll = await createPoll("질문", ["A", "B", "C"]);
    const [a, , c] = poll.options;
    await polls.castVote(poll.id, a.id, "v1");
    await polls.castVote(poll.id, c.id, "v2");

    const view = await polls.getPollForAdmin(poll.id);

    expect(view?.results.options.map((o) => o.isLeader)).toEqual([true, false, true]);
  });

  test("표가 하나도 없으면 1위가 없다", async () => {
    const poll = await createPoll("질문", ["A", "B"]);

    const view = await polls.getPollForAdmin(poll.id);

    expect(view?.results.options.map((o) => o.isLeader)).toEqual([false, false]);
  });
});

describe("마감 시각", () => {
  async function createPollWithDeadline(deadline: Date | null, question = "질문") {
    const created = await polls.createPoll(question, ["A", "B"], { deadline });
    if (!created.ok) throw new Error(created.error);
    const poll = await polls.getPoll(created.id);
    if (!poll) throw new Error("만든 투표를 찾을 수 없음");
    return poll;
  }

  test("마감 시각을 정해 만든 투표는 그 시각을 가진다", async () => {
    const poll = await createPollWithDeadline(later(HOUR));
    expect(poll.deadline).toEqual(later(HOUR));
    expect(poll.closed).toBe(false);
  });

  test("마감 시각 없이 만들 수 있다", async () => {
    const poll = await createPollWithDeadline(null);
    expect(poll.deadline).toBeNull();
  });

  test("지금이나 과거를 마감 시각으로 만들면 거부한다", async () => {
    for (const deadline of [now, later(-MINUTE)]) {
      expect(await polls.createPoll("질문", ["A", "B"], { deadline })).toEqual({
        ok: false,
        error: "deadline_not_in_future",
      });
    }
  });

  test("마감 시각 1분 전에는 표를 받고, 마감 시각이 되면 거부한다", async () => {
    const poll = await createPollWithDeadline(later(HOUR));
    const deadline = later(HOUR);

    now = new Date(deadline.getTime() - MINUTE);
    expect(await polls.castVote(poll.id, poll.options[0].id, "v1")).toEqual({ ok: true });

    now = deadline;
    expect(await polls.castVote(poll.id, poll.options[1].id, "v2")).toEqual({
      ok: false,
      error: "poll_closed",
    });
  });

  test("마감 시각이 지나면 마감으로 보이고 표를 던지지 않은 참여자도 결과를 본다", async () => {
    const poll = await createPollWithDeadline(later(HOUR));
    await polls.castVote(poll.id, poll.options[0].id, "v1");

    now = later(HOUR + MINUTE);
    const view = await polls.getPollForVoter(poll.id, null);

    expect(view?.closed).toBe(true);
    expect(view?.results?.totalVotes).toBe(1);
    expect((await polls.listPolls())[0].closed).toBe(true);
  });

  test("마감 시각 전이라도 운영자가 마감하면 마감이다", async () => {
    const poll = await createPollWithDeadline(later(HOUR));

    await polls.closePoll(poll.id);

    expect((await polls.getPoll(poll.id))?.closed).toBe(true);
    expect(await polls.castVote(poll.id, poll.options[0].id, "v1")).toEqual({
      ok: false,
      error: "poll_closed",
    });
  });

  test("목록: 마감 시각이 가까운 순 → 마감 시각 없는 진행 중 최신순 → 마감됨 최신순", async () => {
    await createPollWithDeadline(later(3 * HOUR), "3시간 뒤");
    await createPollWithDeadline(null, "기한 없음 1");
    const closed = await createPollWithDeadline(later(5 * HOUR), "운영자가 마감");
    await createPollWithDeadline(later(HOUR), "1시간 뒤");
    await createPollWithDeadline(null, "기한 없음 2");
    await createPollWithDeadline(later(2 * MINUTE), "곧 지남");
    await polls.closePoll(closed.id);

    now = later(3 * MINUTE);
    const list = await polls.listPolls();

    expect(list.map((p) => p.question)).toEqual([
      "1시간 뒤",
      "3시간 뒤",
      "기한 없음 2",
      "기한 없음 1",
      "곧 지남",
      "운영자가 마감",
    ]);
  });
});

describe("마감 시각 바꾸기", () => {
  async function createPollWithDeadline(deadline: Date | null) {
    const created = await polls.createPoll("질문", ["A", "B"], { deadline });
    if (!created.ok) throw new Error(created.error);
    return created.id;
  }

  test("진행 중인 투표의 마감 시각을 넣고, 바꾸고, 없앨 수 있다", async () => {
    const id = await createPollWithDeadline(null);

    expect(await polls.setDeadline(id, later(HOUR))).toEqual({ ok: true });
    expect((await polls.getPoll(id))?.deadline).toEqual(later(HOUR));

    expect(await polls.setDeadline(id, later(2 * HOUR))).toEqual({ ok: true });
    expect((await polls.getPoll(id))?.deadline).toEqual(later(2 * HOUR));

    expect(await polls.setDeadline(id, null)).toEqual({ ok: true });
    expect((await polls.getPoll(id))?.deadline).toBeNull();
  });

  test("바꾼 뒤에는 새 마감 시각으로 마감을 판단한다", async () => {
    const id = await createPollWithDeadline(later(HOUR));
    await polls.setDeadline(id, later(3 * HOUR));

    now = later(2 * HOUR);

    expect((await polls.getPoll(id))?.closed).toBe(false);
  });

  test("지금이나 과거로는 바꿀 수 없다", async () => {
    const id = await createPollWithDeadline(later(HOUR));

    for (const deadline of [now, later(-MINUTE)]) {
      expect(await polls.setDeadline(id, deadline)).toEqual({
        ok: false,
        error: "deadline_not_in_future",
      });
    }
    expect((await polls.getPoll(id))?.deadline).toEqual(later(HOUR));
  });

  test("마감된 투표의 마감 시각은 바꿀 수 없다", async () => {
    const manual = await createPollWithDeadline(null);
    await polls.closePoll(manual);
    const expired = await createPollWithDeadline(later(HOUR));
    now = later(2 * HOUR);

    for (const id of [manual, expired]) {
      expect(await polls.setDeadline(id, later(5 * HOUR))).toEqual({
        ok: false,
        error: "poll_closed",
      });
      expect(await polls.setDeadline(id, null)).toEqual({ ok: false, error: "poll_closed" });
    }
    expect((await polls.getPoll(expired))?.closed).toBe(true);
  });

  test("없는 투표는 거부한다", async () => {
    expect(await polls.setDeadline("no-such-poll", later(HOUR))).toEqual({
      ok: false,
      error: "poll_not_found",
    });
  });
});
