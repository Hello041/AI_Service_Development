// DATABASE_URL이 가리키는 Neon DB에 schema.sql을 적용한다. 여러 번 실행해도 안전하다.
// 사용법: npm run db:schema
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL이 설정되지 않았습니다 (.env.local 확인).");
  process.exit(1);
}

const sql = neon(url);
const schema = readFileSync(new URL("../schema.sql", import.meta.url), "utf8");

// HTTP 드라이버는 한 번에 한 문장만 실행하므로 주석을 빼고 문장별로 나눈다.
const statements = schema
  .split("\n")
  .map((line) => line.replace(/--.*$/, ""))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);

for (const statement of statements) {
  await sql.query(statement);
}

const tables = await sql.query(
  `SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_name IN ('polls', 'options', 'votes')
   ORDER BY table_name`,
);
const { host } = new URL(url);
console.log(`적용 완료 (${host}): ${tables.map((t) => t.table_name).join(", ")}`);
