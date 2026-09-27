import { neon } from "@neondatabase/serverless";
import { createPollService, type PollService, type Query } from "./polls";

let service: PollService | undefined;

export function getPollService(): PollService {
  if (!service) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("환경변수 DATABASE_URL이 설정되지 않았습니다.");
    const sql = neon(url);
    const query: Query = (text, params) => sql.query(text, params) as never;
    service = createPollService(query);
  }
  return service;
}
