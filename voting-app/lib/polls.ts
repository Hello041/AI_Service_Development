import { randomBytes } from "node:crypto";
import {
  MAX_OPTION_LENGTH,
  MAX_OPTIONS,
  MAX_QUESTION_LENGTH,
  MIN_OPTIONS,
} from "./poll-rules";

// 운영에서는 Neon, 테스트에서는 PGlite가 주입된다.
export type Query = <T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
) => Promise<T[]>;

export type Option = { id: number; text: string };

export type PollSummary = { id: string; question: string; totalVotes: number };

export type Poll = {
  id: string;
  question: string;
  options: Option[];
};

export type CreatePollError =
  | "question_empty"
  | "question_too_long"
  | "too_few_options"
  | "too_many_options"
  | "option_empty"
  | "option_too_long"
  | "duplicate_options";

export type CreatePollResult =
  | { ok: true; id: string }
  | { ok: false; error: CreatePollError };

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

export type OptionResult = { id: number; text: string; votes: number; percent: number };

export type Results = { totalVotes: number; options: OptionResult[] };

export type VoterPollView = Poll & {
  myOptionId: number | null;
  // 결과 공개 조건을 만족하지 않으면 null
  results: Results | null;
};

export type AdminPollView = Poll & { results: Results };

export type CastVoteError = "poll_not_found" | "option_not_in_poll" | "already_voted";

export type CastVoteResult = { ok: true } | { ok: false; error: CastVoteError };

export type PollService =ReturnType<typeof createPollService>;

export function createPollService(query: Query) {
  async function createPoll(
    rawQuestion: string,
    rawOptions: string[],
  ): Promise<CreatePollResult> {
    const question = rawQuestion.trim();
    const options = rawOptions.map((o) => o.trim());
    const error = validatePoll(question, options);
    if (error) return { ok: false, error };

    const id = randomBytes(9).toString("base64url");
    // 투표와 선택지를 한 문장으로 넣어 중간 상태가 남지 않게 한다.
    await query(
      `WITH poll AS (
         INSERT INTO polls (id, question) VALUES ($1, $2) RETURNING id
       )
       INSERT INTO options (poll_id, position, text)
       SELECT poll.id, t.position, t.text
       FROM poll, unnest($3::text[]) WITH ORDINALITY AS t(text, position)`,
      [id, question, options],
    );
    return { ok: true, id };
  }

  async function getPoll(id: string): Promise<Poll | null> {
    const [poll] = await query<{ id: string; question: string }>(
      `SELECT id, question FROM polls WHERE id = $1`,
      [id],
    );
    if (!poll) return null;
    const options = await query<Option>(
      `SELECT id, text FROM options WHERE poll_id = $1 ORDER BY position`,
      [id],
    );
    return { ...poll, options };
  }

  async function listPolls(): Promise<PollSummary[]> {
    return query<PollSummary>(
      `SELECT p.id, p.question,
              (SELECT count(*)::int FROM votes v WHERE v.poll_id = p.id) AS "totalVotes"
       FROM polls p
       ORDER BY p.created_at DESC`,
    );
  }

  async function castVote(
    pollId: string,
    optionId: number,
    voterId: string,
  ): Promise<CastVoteResult> {
    // 조건을 만족할 때만 들어가도록 한 문장으로 넣고, 안 들어갔으면 이유를 따로 가려낸다.
    const inserted = await query(
      `INSERT INTO votes (poll_id, option_id, voter_id)
       SELECT poll_id, id, $3 FROM options WHERE id = $2 AND poll_id = $1
       ON CONFLICT (poll_id, voter_id) DO NOTHING
       RETURNING id`,
      [pollId, optionId, voterId],
    );
    if (inserted.length > 0) return { ok: true };

    const [poll] = await query(`SELECT 1 FROM polls WHERE id = $1`, [pollId]);
    if (!poll) return { ok: false, error: "poll_not_found" };
    const [option] = await query(
      `SELECT 1 FROM options WHERE id = $1 AND poll_id = $2`,
      [optionId, pollId],
    );
    if (!option) return { ok: false, error: "option_not_in_poll" };
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
    return {
      totalVotes,
      options: rows.map((r) => ({
        ...r,
        percent: totalVotes === 0 ? 0 : Math.round((r.votes / totalVotes) * 100),
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
      results: myOptionId !== null ? await getResults(pollId) : null,
    };
  }

  async function getPollForAdmin(pollId: string): Promise<AdminPollView | null> {
    const poll = await getPoll(pollId);
    if (!poll) return null;
    return { ...poll, results: await getResults(pollId) };
  }

  return {
    createPoll,
    getPoll,
    listPolls,
    castVote,
    getPollForVoter,
    getPollForAdmin,
  };
}
