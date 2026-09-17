# 빠른 검증 가이드: 할 일 CRUD

이 문서는 기능이 실제로 동작하는지 처음부터 끝까지(end-to-end) 검증하기 위한 실행 가능한 절차다. 구현 코드 자체는 포함하지 않는다 — API 형태는 [contracts/tasks-api.md](./contracts/tasks-api.md), 데이터 구조는 [data-model.md](./data-model.md)를 참고한다.

## 사전 준비물

- Node.js (이 저장소의 `package.json`과 호환되는 버전)
- 저장소 의존성 설치: `npm install`
- Prisma 및 SQLite 관련 의존성(이미 설치됨): `prisma`, `@prisma/client`(둘 다 `7.10.0`으로 고정 — `latest` 태그인 `8.0.0-rc.15`는 SQLite datasource 지원이 빠진 프리릴리스이므로 사용하지 않는다), `@prisma/adapter-better-sqlite3`, `better-sqlite3`
- [data-model.md](./data-model.md)의 `Task` 모델이 `prisma/schema.prisma`에 반영되어 있고(datasource는 `provider = "sqlite"`만 지정, `url`은 없음 — Prisma 7부터 스키마에 `url`을 쓸 수 없다), 저장소 루트의 `prisma.config.ts`가 Migrate용 연결 주소(`file:./prisma/dev.db`)를 지정하고, 런타임 연결은 `lib/prisma.ts`가 `@prisma/adapter-better-sqlite3`로 생성한 어댑터를 `PrismaClient`에 넘겨 처리한다

## 1. 데이터베이스 준비

```bash
npx prisma migrate dev --name init_task
npx prisma generate
```

**기대 결과**: `prisma/dev.db` 로컬 SQLite 파일이 생성되고, `tasks` 테이블이 만들어진다. 별도의 외부 DB 서버나 계정 가입은 필요하지 않다.

## 2. 개발 서버 실행

```bash
npm run dev
```

**기대 결과**: `http://localhost:3000` 에서 애플리케이션이 뜬다.

## 3. API로 핵심 흐름 검증 (User Story 1~4)

```bash
# (US1) 새 할 일 추가 — 201과 함께 completed:false인 항목이 반환되어야 한다
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"우유 사기"}'

# (US1 edge case) 빈 제목은 거부되어야 한다 — 400이 반환되어야 한다
curl -s -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"   "}'

# (US2) 목록 조회 — 방금 추가한 항목이 보여야 한다
curl -s http://localhost:3000/api/tasks

# (US3) 완료 처리 — 위 응답의 id 값을 <ID>에 대입
curl -s -X PATCH http://localhost:3000/api/tasks/<ID> \
  -H "Content-Type: application/json" \
  -d '{"completed":true}'

# (US3) 다시 미완료로 — completed:false가 반영되어야 한다
curl -s -X PATCH http://localhost:3000/api/tasks/<ID> \
  -H "Content-Type: application/json" \
  -d '{"completed":false}'

# (US4) 삭제 — 200과 함께 삭제된 id가 반환되어야 한다
curl -s -X DELETE http://localhost:3000/api/tasks/<ID>

# (US4 edge case) 이미 삭제된 항목을 다시 삭제 — 404가 반환되어야 한다
curl -s -X DELETE http://localhost:3000/api/tasks/<ID>

# (US2 edge case) 모든 항목을 지운 뒤 목록 조회 — data: [] 가 반환되어야 한다
curl -s http://localhost:3000/api/tasks
```

**기대 결과**: 모든 응답이 `Content-Type: application/json`이며, [contracts/tasks-api.md](./contracts/tasks-api.md)에 정의된 `{ data: ... }` / `{ error: { message } }` 포맷을 그대로 따른다.

> **Windows(Git Bash) 참고**: `curl -d`의 명령줄 인자로 한글을 직접 넘기면 콘솔 코드페이지 때문에 문자가 깨져 저장될 수 있다(애플리케이션 버그가 아니라 셸/콘솔 인코딩 문제). Windows에서 한글 제목을 검증할 때는 `curl --data-binary @file.json`처럼 UTF-8로 저장한 파일을 사용하거나, Node.js의 `fetch`로 직접 요청을 보내는 것을 권장한다.

## 3.5. API로 중요도(Priority) 흐름 검증 (User Story 5)

Windows Git Bash의 `curl -d` 한글 인코딩 문제(위 참고 사항)를 피하기 위해 Node.js `fetch`를 권장한다.

```js
// priority 생략 → 기본값 medium
await fetch("http://localhost:3000/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "A" }) });
// → 201, data.priority === "medium"

// priority 명시 → 지정값 그대로
await fetch("http://localhost:3000/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "B", priority: "high" }) });
// → 201, data.priority === "high"

// 잘못된 priority → 400
await fetch("http://localhost:3000/api/tasks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "C", priority: "urgent" }) });
// → 400

// PATCH: priority만
await fetch("http://localhost:3000/api/tasks/<ID>", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority: "low" }) });
// → 200, completed는 그대로

// PATCH: completed만
await fetch("http://localhost:3000/api/tasks/<ID>", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: true }) });
// → 200, priority는 그대로

// PATCH: 둘 다
await fetch("http://localhost:3000/api/tasks/<ID>", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ completed: false, priority: "high" }) });
// → 200

// PATCH: 빈 바디 → 400
await fetch("http://localhost:3000/api/tasks/<ID>", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
// → 400
```

**기대 결과**: 위 모든 응답이 [contracts/tasks-api.md](./contracts/tasks-api.md) PATCH/POST 섹션에 정의된 상태 코드·에러 메시지와 정확히 일치한다.

## 4. 브라우저 UI로 검증 (동일한 흐름, 사람이 직접 조작)

1. `http://localhost:3000` 접속
2. 입력창에 제목을 입력하고 중요도를 선택(또는 생략)한 뒤 추가 → 목록에 새 항목이 미완료 상태로, 선택한(또는 기본값 "중간") 중요도 배지와 함께 나타나는지 확인 (SC-001, SC-002)
3. 항목의 체크박스(또는 버튼)를 눌러 완료로 표시 → 즉시 반영되는지 확인 (SC-003)
4. 다시 눌러 미완료로 되돌리기 → 즉시 반영되는지 확인
5. 카드의 중요도 버튼(높음/중간/낮음)을 눌러 변경 → 배지가 즉시 바뀌고, 다른 항목들의 순서는 바뀌지 않는지 확인 (SC-006, FR-011)
6. 항목을 삭제 → 목록에서 즉시 사라지는지 확인 (SC-004)
7. 브라우저를 새로고침 → 남아있는 항목들의 제목/완료 상태/중요도가 그대로 유지되는지 확인 (SC-005, FR-006)

## 5. 타입/린트 검증 (헌장 준수 확인)

```bash
npm run lint
npx tsc --noEmit
```

**기대 결과**: 오류 없이 통과해야 한다 (헌장 원칙 II — `any` 금지, `strict` 모드 유지).
