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

export type PollSummary = { id: string; question: string };

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

export type PollService = ReturnType<typeof createPollService>;

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
      `SELECT id, question FROM polls ORDER BY created_at DESC`,
    );
  }

  return { createPoll, getPoll, listPolls };
}
