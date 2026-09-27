import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import type { Query } from "./polls";

const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");

let db: PGlite | undefined;

// 운영과 같은 스키마를 적용한 인메모리 Postgres를 돌려준다.
// PGlite 부팅이 느려 테스트 파일마다 한 번만 띄우고, 호출할 때마다 데이터를 비운다.
export async function createTestQuery(): Promise<Query> {
  if (!db) {
    db = new PGlite();
    await db.exec(schema);
  }
  await db.exec("TRUNCATE polls CASCADE");
  const instance = db;
  return async (text, params = []) => (await instance.query(text, params)).rows as never;
}
