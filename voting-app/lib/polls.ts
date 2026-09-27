import { randomBytes } from "node:crypto";
import {
  MAX_OPTION_LENGTH,
  MAX_OPTIONS,
  MAX_QUESTION_LENGTH,
  MIN_OPTIONS,
} from "./poll-rules";
import { normalizeVoterName } from "./voter-name";

// 운영에서는 Neon, 테스트에서는 PGlite가 주입된다.
export type Query = <T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) => Promise<T[]>;

export type Option = { id: number; text: string };

export type PollSummary = {
  id: string;
  question: string;
  deadline: Date | null;
  named: boolean;
  closed: boolean;
  totalVotes: number;
};

export type Poll = {
  id: string;
  question: string;
  deadline: Date | null;
  named: boolean;
  closed: boolean;
  options: Option[];
};

export type CreatePollError =
  | "question_empty"
  | "question_too_long"
  | "too_few_options"
  | "too_many_options"
  | "option_empty"
  | "option_too_long"
  | "duplicate_options"
  | "deadline_not_in_future";

export type CreatePollResult =
  | { ok: true; id: string }
  | { ok: false; error: CreatePollError };

const MAX_OPTION_ID = 2_147_483_647; // Postgres INTEGER 최댓값

// 이모지 등이 2글자로 세어지지 않도록 코드 포인트 단위로 센다.
const length = (s: string) => [...s].length;

function validatePoll(question: string, options: string[]): CreatePollError | null {
  if (question === "") return "question_empty";
  if (length(question) > MAX_QUESTION_LENGTH) return "question_too_long";
  if (options.length < MIN_OPTIONS) return "too_few_options";
  if (options.length > MAX_OPTIONS) return "too_many_options";
  if (options.some((o) => o === "")) return "option_empty";
  if (options.some((o) => length(o) > MAX_OPTION_LENGTH)) return "option_too_long";
  if (new Set(options).size !== options.length) return "duplicate_options";
  return null;
}

export type OptionResult = {
  id: number;
  text: string;
  votes: number;
  percent: number;
  // 표 수가 최댓값인 선택지. 동점이면 모두, 총 0표면 없음.
  isLeader: boolean;
};

export type Results = { totalVotes: number; options: OptionResult[] };

export type VoterPollView = Poll & {
  myOptionId: number | null;
  // 결과 공개 조건을 만족하지 않으면 null
  results: Results | null;
};

export type AdminPollView = Poll & {
  results: Results;
  // 기명 투표에서 선택지별로 표를 던진 순서대로의 참여자 이름. 익명 투표는 null.
  votersByOption: { optionId: number; names: string[] }[] | null;
};

export type CastVoteError =
  | "poll_not_found"
  | "poll_closed"
  | "option_not_in_poll"
  | "already_voted"
  | "voter_name_required"
  | "voter_name_too_long";

export type SetDeadlineError = "poll_not_found" | "poll_closed" | "deadline_not_in_future";

export type SetDeadlineResult = { ok: true } | { ok: false; error: SetDeadlineError };

export type CastVoteResult = { ok: true } | { ok: false; error: CastVoteError };

export type PollService = ReturnType<typeof createPollService>;

// 현재 시각. 운영에서는 실제 시계, 테스트에서는 고정 시각이 주입된다.
export type Clock = () => Date;

// 투표가 마감되었는지는 여기 한 곳에서만 판단한다 (ADR-0002).
// nowParam: 주입된 현재 시각이 담긴 SQL 파라미터 (예: "$2")
const closedSql = (poll: string, nowParam: string) =>
  // 마감 시각이 없으면 비교 결과가 NULL이므로 false로 본다 (NOT NULL은 NULL이 되어 행이 빠진다).
  `(${poll}.closed_at IS NOT NULL OR COALESCE(${poll}.deadline <= ${nowParam}::timestamptz, false))`;

// 드라이버마다 timestamptz를 Date나 문자열로 줄 수 있어 Date로 맞춘다.
const toDate = (value: Date | string | null) => (value === null ? null : new Date(value));

export function createPollService(query: Query, now: Clock = () => new Date()) {
  async function createPoll(
    rawQuestion: string,
    rawOptions: string[],
    settings: { deadline?: Date | null; named?: boolean } = {},
  ): Promise<CreatePollResult> {
    const question = rawQuestion.trim();
    const options = rawOptions.map((o) => o.trim());
    const deadline = settings.deadline ?? null;
    const error = validatePoll(question, options);
    if (error) return { ok: false, error };
    if (deadline && deadline <= now()) return { ok: false, error: "deadline_not_in_future" };

    const id = randomBytes(9).toString("base64url");
    // 투표와 선택지를 한 문장으로 넣어 중간 상태가 남지 않게 한다.
    await query(
      `WITH poll AS (
         INSERT INTO polls (id, question, deadline, named) VALUES ($1, $2, $4, $5) RETURNING id
       )
       INSERT INTO options (poll_id, position, text)
       SELECT poll.id, t.position, t.text
       FROM poll, unnest($3::text[]) WITH ORDINALITY AS t(text, position)`,
      [id, question, options, deadline, settings.named ?? false],
    );
    return { ok: true, id };
  }

  async function getPoll(id: string): Promise<Poll | null> {
    const [row] = await query<{
      id: string;
      question: string;
      deadline: Date | string | null;
      named: boolean;
      closed: boolean;
    }>(
      `SELECT p.id, p.question, p.deadline, p.named, ${closedSql("p", "$2")} AS closed
       FROM polls p WHERE p.id = $1`,
      [id, now()],
    );
    if (!row) return null;
    const poll = { ...row, deadline: toDate(row.deadline) };
    const options = await query<Option>(
      `SELECT id, text FROM options WHERE poll_id = $1 ORDER BY position`,
      [id],
    );
    return { ...poll, options };
  }

  // 진행 중: 마감 시각 가까운 순 → 마감 시각 없음 최신순. 그다음 마감됨 최신순.
  async function listPolls(): Promise<PollSummary[]> {
    const rows = await query<Omit<PollSummary, "deadline"> & { deadline: Date | string | null }>(
      `SELECT p.id, p.question, p.deadline, p.named, ${closedSql("p", "$1")} AS closed,
              (SELECT count(*)::int FROM votes v WHERE v.poll_id = p.id) AS "totalVotes"
       FROM polls p
       ORDER BY ${closedSql("p", "$1")},
                CASE WHEN NOT ${closedSql("p", "$1")} THEN p.deadline END ASC NULLS LAST,
                p.created_at DESC, p.seq DESC`,
      [now()],
    );
    return rows.map((r) => ({ ...r, deadline: toDate(r.deadline) }));
  }

  async function castVote(
    pollId: string,
    optionId: number,
    voterId: string,
    voterName: string | null = null,
  ): Promise<CastVoteResult> {
    // 선택지 id 컬럼(INTEGER) 범위 밖의 값은 DB에 보내면 예외가 나므로 먼저 거른다.
    if (!Number.isInteger(optionId) || optionId <= 0 || optionId > MAX_OPTION_ID) {
      return { ok: false, error: "option_not_in_poll" };
    }
    // 이름은 꼬리표일 뿐이다 (ADR-0003). 기명 투표에만 남기고, 규칙에 맞는 이름만 넘긴다.
    const nameCheck = normalizeVoterName(voterName ?? "");
    const name = nameCheck.ok ? nameCheck.name : null;
    // 조건을 만족할 때만 들어가도록 한 문장으로 넣고, 안 들어갔으면 이유를 따로 가려낸다.
    const inserted = await query(
      `INSERT INTO votes (poll_id, option_id, voter_id, voter_name)
       SELECT o.poll_id, o.id, $3, CASE WHEN p.named THEN $5::text END
       FROM options o JOIN polls p ON p.id = o.poll_id
       WHERE o.id = $2 AND o.poll_id = $1 AND NOT ${closedSql("p", "$4")}
         AND (NOT p.named OR $5::text IS NOT NULL)
       ON CONFLICT (poll_id, voter_id) DO NOTHING
       RETURNING id`,
      [pollId, optionId, voterId, now(), name],
    );
    if (inserted.length > 0) return { ok: true };

    const [poll] = await query<{ closed: boolean; named: boolean }>(
      `SELECT ${closedSql("p", "$2")} AS closed, p.named FROM polls p WHERE p.id = $1`,
      [pollId, now()],
    );
    if (!poll) return { ok: false, error: "poll_not_found" };
    if (poll.closed) return { ok: false, error: "poll_closed" };
    const [option] = await query(
      `SELECT 1 FROM options WHERE id = $1 AND poll_id = $2`,
      [optionId, pollId],
    );
    if (!option) return { ok: false, error: "option_not_in_poll" };
    if (poll.named && !nameCheck.ok) {
      return {
        ok: false,
        error: nameCheck.error === "name_too_long" ? "voter_name_too_long" : "voter_name_required",
      };
    }
    return { ok: false, error: "already_voted" };
  }

  async function getResults(pollId: string): Promise<Results> {
    const rows = await query<{ id: number; text: string; votes: number }>(
      `SELECT o.id, o.text, count(v.id)::int AS votes
       FROM options o LEFT JOIN votes v ON v.option_id = o.id
       WHERE o.poll_id = $1
       GROUP BY o.id
       ORDER BY o.position`,
      [pollId],
    );
    const totalVotes = rows.reduce((sum, r) => sum + r.votes, 0);
    const topVotes = Math.max(0, ...rows.map((r) => r.votes));
    return {
      totalVotes,
      options: rows.map((r) => ({
        ...r,
        percent: totalVotes === 0 ? 0 : Math.round((r.votes / totalVotes) * 100),
        isLeader: topVotes > 0 && r.votes === topVotes,
      })),
    };
  }

  async function getPollForVoter(
    pollId: string,
    voterId: string | null,
  ): Promise<VoterPollView | null> {
    const poll = await getPoll(pollId);
    if (!poll) return null;
    const [vote] = voterId
      ? await query<{ option_id: number }>(
          `SELECT option_id FROM votes WHERE poll_id = $1 AND voter_id = $2`,
          [pollId, voterId],
        )
      : [];
    const myOptionId = vote?.option_id ?? null;
    return {
      ...poll,
      myOptionId,
      // 결과 공개 조건: 표를 던졌거나 투표가 마감됨
      results: myOptionId !== null || poll.closed ? await getResults(pollId) : null,
    };
  }

  async function getPollForAdmin(pollId: string): Promise<AdminPollView | null> {
    const poll = await getPoll(pollId);
    if (!poll) return null;
    const results = await getResults(pollId);
    if (!poll.named) return { ...poll, results, votersByOption: null };
    const votes = await query<{ option_id: number; voter_name: string | null }>(
      `SELECT option_id, voter_name FROM votes WHERE poll_id = $1 ORDER BY id`,
      [pollId],
    );
    const votersByOption = poll.options.map((o) => ({
      optionId: o.id,
      names: votes
        .filter((v) => v.option_id === o.id && v.voter_name !== null)
        .map((v) => v.voter_name as string),
    }));
    return { ...poll, results, votersByOption };
  }

  // 마감은 되돌릴 수 없고, 이미 마감된 투표는 그대로 둔다.
  async function closePoll(pollId: string): Promise<void> {
    await query(
      `UPDATE polls SET closed_at = $2 WHERE id = $1 AND closed_at IS NULL`,
      [pollId, now()],
    );
  }

  // 진행 중인 투표의 마감 시각을 넣거나 바꾸거나(null이면) 없앤다. 마감된 투표는 바꿀 수 없다.
  async function setDeadline(
    pollId: string,
    deadline: Date | null,
  ): Promise<SetDeadlineResult> {
    const current = now();
    if (deadline && deadline <= current) return { ok: false, error: "deadline_not_in_future" };
    const updated = await query(
      `UPDATE polls p SET deadline = $2
       WHERE p.id = $1 AND NOT ${closedSql("p", "$3")}
       RETURNING p.id`,
      [pollId, deadline, current],
    );
    if (updated.length > 0) return { ok: true };
    const [poll] = await query(`SELECT 1 FROM polls WHERE id = $1`, [pollId]);
    return { ok: false, error: poll ? "poll_closed" : "poll_not_found" };
  }

  // 선택지와 표는 외래 키의 ON DELETE CASCADE로 함께 지워진다.
  async function deletePoll(pollId: string): Promise<void> {
    await query(`DELETE FROM polls WHERE id = $1`, [pollId]);
  }

  return {
    createPoll,
    closePoll,
    setDeadline,
    deletePoll,
    getPoll,
    listPolls,
    castVote,
    getPollForVoter,
    getPollForAdmin,
  };
}
