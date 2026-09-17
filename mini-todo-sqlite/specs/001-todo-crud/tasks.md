---
description: "Task list template for feature implementation"
---

# Tasks: 할 일 CRUD

**입력**: `/specs/001-todo-crud/`의 설계 문서

**전제조건**: [plan.md](./plan.md) (필수), [spec.md](./spec.md) (필수 — 사용자 스토리),
[research.md](./research.md), [data-model.md](./data-model.md), [contracts/tasks-api.md](./contracts/tasks-api.md), [quickstart.md](./quickstart.md)

**테스트**: 명세서와 사용자 지시 어디에도 자동화 테스트가 명시적으로 요구되지 않았으므로,
이번 tasks.md에는 별도의 테스트 태스크를 포함하지 않는다. 대신 각 사용자 스토리는
[quickstart.md](./quickstart.md)의 `curl`/브라우저 절차로 검증한다.

**구성**: 태스크는 사용자 스토리별로 그룹화되어 있어 각 스토리를 독립적으로 구현·검증할 수 있다.

## 형식: `[ID] [P?] [Story] 설명`

- **[P]**: 병렬 실행 가능(서로 다른 파일, 의존성 없음)
- **[Story]**: 이 태스크가 속한 사용자 스토리 (US1, US2, US3, US4)
- 각 설명에는 정확한 파일 경로를 포함한다

## 경로 규칙

이 프로젝트는 단일 Next.js App Router 프로젝트이며, [plan.md](./plan.md)의 프로젝트 구조를 따른다:
`app/api/tasks/**`(REST 엔드포인트), `app/components/**`(UI), `lib/**`(공용 헬퍼), `prisma/**`(스키마·DB).

---

## Phase 1: Setup (공용 인프라)

**목적**: Prisma/SQLite 사용을 위한 프로젝트 초기 설정

- [X] T001 `npm install prisma @prisma/client`로 의존성을 추가하고, `npx prisma init --datasource-provider sqlite`를 실행해 `prisma/schema.prisma`와 `.env`(`DATABASE_URL="file:./dev.db"`)를 생성한다 (research.md #2) — ⚠️ npm의 `prisma@latest`(8.0.0-rc.15)가 SQLite datasource 지원을 제거한 프리릴리스였음을 발견해, `prisma@7.10.0` / `@prisma/client@7.10.0`(SQLite를 지원하는 마지막 stable)으로 고정 설치했다. `prisma init` 위저드도 이 버전에서 postgres/mongodb만 지원해 스키마를 data-model.md 그대로 수동 작성했다 (url은 `file:./dev.db`로 하드코딩해 별도 `.env` 불필요)
- [X] T002 [P] 저장소 루트 `.gitignore`에 `prisma/dev.db`와 `.env`가 아직 없다면 추가해, 로컬 SQLite 파일과 환경 변수 파일이 버전관리에 포함되지 않도록 한다 — `.env*`는 기존에 이미 포함되어 있었고, `/prisma/dev.db`, `/prisma/dev.db-journal`을 신규 추가

**체크포인트**: Prisma 초기화 완료, 스키마 파일 편집 준비됨.

---

## Phase 2: Foundational (차단 전제조건)

**목적**: 모든 사용자 스토리가 시작되기 전에 반드시 끝나야 하는 핵심 인프라

**⚠️ 중요**: 이 단계가 끝나기 전에는 어떤 사용자 스토리 작업도 시작할 수 없다.

- [X] T003 `prisma/schema.prisma`에 [data-model.md](./data-model.md)의 `Task` 모델을 그대로 정의한다:
  ```prisma
  model Task {
    id        String   @id @default(cuid())
    title     String
    completed Boolean  @default(false)
    createdAt DateTime @default(now())

    @@map("tasks")
  }
  ```
- [X] T004 `npx prisma migrate dev --name init_task`를 실행해 `prisma/dev.db`에 `tasks` 테이블을 생성한다 (T003에 의존) — ⚠️ Prisma 7에서는 `schema.prisma`의 `datasource.url`이 더 이상 허용되지 않아, 연결 URL은 `prisma.config.ts`(Migrate용), 런타임 연결은 `PrismaClient`에 전달하는 드라이버 어댑터(`@prisma/adapter-better-sqlite3` + `better-sqlite3`, 신규 설치)로 옮겨야 했다. `prisma.config.ts`를 루트에 추가하고 `url: "file:./prisma/dev.db"`로 지정
- [X] T005 `npx prisma generate`를 실행해 타입이 지정된 Prisma Client를 생성한다 (T004에 의존)
- [X] T006 [P] `lib/prisma.ts`에 `globalThis` 기반 Prisma Client 싱글턴을 작성해, `next dev`의 핫 리로드로 인해 `PrismaClient`가 중복 생성되지 않도록 한다 (research.md #3) — ⚠️ Prisma 7에서 SQLite는 `@prisma/adapter-better-sqlite3` 드라이버 어댑터가 필수이므로, `new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" })`를 생성해 `new PrismaClient({ adapter })`에 전달하도록 작성
- [X] T007 [P] `lib/api-response.ts`에 공유 JSON 응답 헬퍼를 작성한다: 성공은 `{ data }`를 반환하는 `ok(data, status = 200)`, 실패는 `{ error: { message } }`를 반환하는 `fail(message, status)`이며, 두 헬퍼 모두 `Content-Type: application/json`으로 응답한다 (research.md #5, 헌장 원칙 III)
- [X] T008 [P] `lib/validation.ts`에 `isValidTitle(value: unknown): value is string` 타입 가드를 작성한다. 값을 trim한 뒤 길이가 1 이상인지 확인하며(spec FR-002), `any`는 사용하지 않는다 (research.md #6, 헌장 원칙 II) — PATCH 요청의 `completed` 검증용 `isValidCompleted(value: unknown): value is boolean`도 같은 파일에 함께 작성(T017에서 사용)

**체크포인트**: 기반 인프라 완료 — 이제 사용자 스토리 구현을 시작할 수 있다.

---

## Phase 3: User Story 1 - 새 할 일 추가하기 (우선순위: P1) 🎯 MVP

**목표**: 사용자가 제목을 입력해 새 할 일을 등록하면 목록에 "미완료" 상태로 나타난다.

**독립적 테스트**: [quickstart.md](./quickstart.md) 3단계처럼 `POST /api/tasks`에 제목을 보내
201과 `completed:false` 응답을 확인하고, 공백만 있는 제목을 보내면 400이 반환되는지 확인한다.

### User Story 1 구현

- [X] T009 [US1] `app/api/tasks/route.ts`에 `POST` 핸들러를 구현한다: 요청 본문을 JSON으로 파싱하고,
      `lib/validation.ts`의 `isValidTitle`로 `title`을 검증하여 비어있거나 공백만인 값은 거부하고(spec FR-002),
      유효하면 `completed: false` 기본값으로 Task를 생성한 뒤(spec FR-007) `lib/api-response.ts`의 `ok()`로 201을,
      검증 실패 시 `fail()`로 400을 반환한다 ([contracts/tasks-api.md](./contracts/tasks-api.md) POST 섹션)
- [X] T010 [US1] `app/api/tasks/route.ts`에 `GET` 핸들러를 구현한다: `prisma.task.findMany({ orderBy: { createdAt: 'asc' } })`로 전체 항목을 조회해 `ok()`로 200과 `{ data: Task[] }`를 반환한다 ([contracts/tasks-api.md](./contracts/tasks-api.md) GET 섹션, spec FR-003)
- [X] T011 [P] [US1] `app/lib/get-tasks.ts`에 서버 전용 `getTasks()` 함수를 작성한다: `prisma.task.findMany({ orderBy: { createdAt: 'asc' } })`로 조회하여, 서버 컴포넌트인 `app/page.tsx`가 초기 목록을 직접 읽어올 수 있게 한다 (plan.md 기술 결정 — research.md #8)
- [X] T012 [P] [US1] `app/components/AddTodoForm.tsx` 클라이언트 컴포넌트를 작성한다: 제목 입력창과 등록 버튼을 두고, 제출 시 `fetch('/api/tasks', { method: 'POST', ... })`를 호출한다. 응답이 400이면 서버가 보낸 검증 메시지를 폼 아래에 표시하고(spec 인수 시나리오 2), 201이면 입력창을 비우고 `router.refresh()`를 호출해 목록을 갱신한다(spec 인수 시나리오 1)
- [X] T013 [US1] `app/page.tsx`를 서버 컴포넌트로 수정한다: `app/lib/get-tasks.ts`의 `getTasks()`로 초기 목록을 조회하고, `AddTodoForm`과 각 항목의 제목·완료 상태를 보여주는 최소한의 목록을 렌더링해, 새로 추가한 항목이 즉시 눈에 보이도록 한다 (T011, T012에 의존)

**체크포인트**: 이 시점에서 User Story 1은 독립적으로 완전히 동작하고 검증 가능해야 한다.

---

## Phase 4: User Story 2 - 할 일 목록 확인하기 (우선순위: P2)

**목표**: 사용자가 모든 할 일을 제목과 완료 상태와 함께 확인할 수 있고, 항목이 없으면 빈 상태 화면을 본다.

**독립적 테스트**: 완료/미완료가 섞인 여러 항목을 미리 준비한 뒤 목록을 열어 모두 표시되는지,
항목이 하나도 없을 때 오류나 빈 화면 대신 안내 메시지가 표시되는지 확인한다.

### User Story 2 구현

- [X] T014 [US2] `app/components/TodoList.tsx` 컴포넌트를 작성한다: `Task[]`를 받아 각 항목의 제목과 완료 상태를 표시하는 목록을 렌더링한다 (spec FR-003)
- [X] T015 [US2] `app/components/TodoList.tsx`에 빈 상태 UI를 추가한다: 전달받은 배열이 비어 있으면 오류나 빈 화면 대신 "할 일이 없습니다" 같은 안내 메시지를 표시한다 (spec 예외 상황, 인수 시나리오 2)
- [X] T016 [US2] `app/page.tsx`에서 T013의 임시 인라인 목록을 `TodoList` 컴포넌트로 교체하고, `getTasks()`로 조회한 항목을 그대로 전달한다 (T014, T015에 의존)

**체크포인트**: 이 시점에서 User Story 1과 2 모두 독립적으로 동작해야 한다.

---

## Phase 5: User Story 3 - 완료 여부 토글하기 (우선순위: P3)

**목표**: 사용자가 기존 할 일을 완료/미완료로 전환할 수 있다.

**독립적 테스트**: 미완료 항목을 완료로 표시한 뒤 즉시 반영되는지, 완료 항목을 다시 미완료로
되돌렸을 때도 즉시 반영되는지 확인한다.

### User Story 3 구현

- [X] T017 [US3] `app/api/tasks/[id]/route.ts`에 `PATCH` 핸들러를 구현한다: 이 프로젝트의 Next.js 버전 규칙에 따라 동적 `params`는 Promise이므로 반드시 `await`로 꺼내 쓰고(research.md #4), 요청 본문의 `completed` 값이 boolean인지 검증한 뒤 `prisma.task.update`로 갱신한다. 성공 시 `ok()`로 200을, 대상 id가 없으면 `fail()`로 404를 반환한다 ([contracts/tasks-api.md](./contracts/tasks-api.md) PATCH 섹션, spec FR-004, FR-008)
- [X] T018 [US3] `app/components/TodoList.tsx`의 각 항목에 완료 토글 체크박스를 추가한다: 클릭 시 `fetch('/api/tasks/{id}', { method: 'PATCH', body: JSON.stringify({ completed: !task.completed }) })`를 호출하고, 성공하면 `router.refresh()`로 목록을 갱신한다 (spec 인수 시나리오 1, 2) (T017에 의존)

**체크포인트**: 이 시점에서 User Story 1, 2, 3이 모두 독립적으로 동작해야 한다.

---

## Phase 6: User Story 4 - 할 일 삭제하기 (우선순위: P4)

**목표**: 사용자가 더 이상 필요 없는 할 일을 삭제해 목록에서 제거할 수 있다.

**독립적 테스트**: 기존 항목을 삭제한 뒤 목록에서 즉시 사라지는지, 이미 삭제된 항목을
다시 삭제하려고 하면 404가 반환되는지 확인한다.

### User Story 4 구현

- [X] T019 [US4] `app/api/tasks/[id]/route.ts`에 `DELETE` 핸들러를 구현한다: 동적 `params`를 `await`로 꺼내 쓰고(research.md #4), `prisma.task.delete`로 항목을 삭제한다. 성공 시 `ok()`로 200과 `{ data: { id } }`를, 대상 id가 없으면 `fail()`로 404를 반환한다 ([contracts/tasks-api.md](./contracts/tasks-api.md) DELETE 섹션, spec FR-005, FR-008)
- [X] T020 [US4] `app/components/TodoList.tsx`의 각 항목에 삭제 버튼을 추가한다: 클릭 시 `fetch('/api/tasks/{id}', { method: 'DELETE' })`를 호출하고, 성공하면 `router.refresh()`로 목록을 갱신한다 (spec 인수 시나리오 1) (T019에 의존)

**체크포인트**: 이제 모든 사용자 스토리(US1~US4)가 독립적으로 동작해야 한다.

---

## Phase 7: Polish & Cross-Cutting Concerns

**목적**: 모든 사용자 스토리에 걸친 품질 확인

- [X] T021 [P] `npm run lint`와 `npx tsc --noEmit`을 실행해 위반 사항이 없는지 확인하고, 있다면 수정한다 (헌장 원칙 II, quickstart.md 5단계) — 둘 다 오류 없이 통과
- [X] T022 [P] `app/api/tasks/route.ts`와 `app/api/tasks/[id]/route.ts`의 모든 응답 경로가 `lib/api-response.ts`의 `ok()`/`fail()`만 사용하고, 처리되지 않은 예외나 비-JSON 응답이 없는지 검토한다 (헌장 원칙 III) — 두 파일의 모든 return 문이 `ok()`/`fail()`을 사용함을 확인. 예상 밖의 내부 오류(DB 연결 실패 등)는 Next.js 기본 500 처리에 맡기며, 이는 spec의 어떤 FR도 요구하지 않는 범위 밖 케이스로 간주
- [X] T023 [quickstart.md](./quickstart.md) 전체 절차(DB 마이그레이션부터 4개 엔드포인트 `curl` 검증, 브라우저 수동 검증까지)를 처음부터 실행하고, 발견된 차이를 수정한다 (T009~T020에 의존) — `npm run dev`로 서버를 띄워 POST(201/400)·GET·PATCH(true/false)·DELETE(200/404 재삭제)·빈 목록·페이지 렌더링(빈 상태 및 항목 표시)까지 모두 확인. ⚠️ Windows Git Bash에서 `curl -d`에 한글을 직접 넘기면 콘솔 코드페이지 문제로 문자가 깨지는 것을 발견해(애플리케이션 버그 아님 — Node `fetch`로는 정상 왕복 확인), quickstart.md에 안내를 추가

---

## Phase 8: 중요도(Priority) 추가 (증분 개선, User Story 5)

**목적**: 할 일 카드에 중요도(높음/중간/낮음)를 추가하고, 생성 후에도 변경할 수 있게 한다.
Foundational 단계(Phase 2)의 산출물(`lib/api-response.ts`, `lib/prisma.ts`)을 그대로 재사용한다.

**독립적 테스트**: [quickstart.md](./quickstart.md) 3.5단계처럼 중요도 없이/있이 생성해 기본값(medium)과
지정값이 올바른지 확인하고, 기존 항목의 `PATCH`로 `priority`만/`completed`만/둘 다 변경해보고,
잘못된 값과 빈 본문이 400으로 거부되는지 확인한다.

- [X] T024 `prisma/schema.prisma`의 `Task` 모델에 `priority String @default("medium")` 필드를 추가한다
      (SQLite는 Prisma `enum`을 지원하지 않아 `String`으로 표현 — research.md #10)
- [X] T025 `npx prisma migrate dev --name add_task_priority`로 마이그레이션을 생성/적용하고,
      `npx prisma generate`로 Prisma Client를 재생성한다 (T024에 의존)
- [X] T026 [P] `lib/priority.ts`를 새로 작성한다: `PRIORITIES` 배열, `Priority` 유니온 타입,
      한글 라벨 맵 `PRIORITY_LABELS`, 타입가드 `isValidPriority(value: unknown): value is Priority`
      (헌장 원칙 II — `any` 대신 `unknown` + 좁히기)
- [X] T027 `app/api/tasks/route.ts`의 `POST` 핸들러를 확장한다: body에 `priority`가 있으면
      `isValidPriority`로 검증(무효 시 400), 없으면 `"medium"`을 기본값으로 사용해 Task를 생성한다
      (spec FR-009, FR-010; contracts/tasks-api.md POST 섹션) (T025, T026에 의존)
- [X] T028 `app/api/tasks/[id]/route.ts`의 `PATCH` 핸들러를 `completed`와/또는 `priority`를 받는
      범용 부분 업데이트로 확장한다: 둘 다 없으면 400, 있는 필드만 각각 검증(`isValidCompleted`/
      `isValidPriority`) 후 유효한 필드만 갱신한다. 기존 404(`P2025`) 처리와 `DELETE`는 그대로 유지
      (spec FR-010; contracts/tasks-api.md PATCH 섹션) (T025, T026에 의존)
- [X] T029 [P] `app/components/AddTodoForm.tsx`에 중요도 `<select>`(한글 라벨, 기본값 "medium")를
      추가하고 POST body에 `priority`를 포함한다. 성공 시 `priority`도 `"medium"`으로 리셋한다
      (spec User Story 5 인수 시나리오 1, 2) (T026에 의존)
- [X] T030 [P] `app/components/TodoList.tsx`를 카드 스타일(테두리/여백/둥근 모서리)로 다듬고,
      색상이 있는 중요도 배지(한글 라벨)와 중요도 변경용 3단계 버튼을 추가한다. 클릭 시
      `PATCH { priority }` 후 `router.refresh()`. 목록 정렬은 그대로 `createdAt asc` 유지
      (spec User Story 5 인수 시나리오 3, FR-011) (T026, T028에 의존)
- [X] T031 [P] `npm run lint`와 `npx tsc --noEmit`을 실행해 위반 사항이 없는지 확인한다
      (헌장 원칙 II) — 둘 다 오류 없이 통과
- [X] T032 `npm run dev`로 서버를 띄워 quickstart.md 3.5단계의 모든 케이스(priority 생략/명시/
      잘못된 값, PATCH priority만/completed만/둘 다/빈 본문, 존재하지 않는 id 404 회귀)를
      Node `fetch`로 확인하고, 브라우저에서 한글 배지(높음/중간/낮음) 렌더링과 목록 순서 불변을
      확인한 뒤 테스트 데이터를 정리한다 (T027~T030에 의존)
- [X] T033 [P] `spec.md`(User Story 5, FR-009~FR-011, Key Entities, Assumptions, SC-006),
      `data-model.md`(`priority` 필드/검증/상태 전이), `contracts/tasks-api.md`(Task 표현,
      POST/PATCH 섹션), `research.md`(#10 — String vs enum), `quickstart.md`(3.5단계)를
      실제 구현에 맞게 갱신한다

**체크포인트**: 이 시점에서 User Story 1~5가 모두 독립적으로 동작해야 한다.

---

## 의존성 및 실행 순서

### 단계 간 의존성

- **Setup (Phase 1)**: 의존성 없음 — 즉시 시작 가능
- **Foundational (Phase 2)**: Setup 완료에 의존 — 모든 사용자 스토리를 막는다(BLOCKS)
- **User Story 1~4 (Phase 3~6)**: 모두 Foundational 완료에 의존
  - 우선순위 순서(P1 → P2 → P3 → P4)대로 순차 진행하거나, 인력이 있다면 병렬 진행 가능
  - US3(PATCH)와 US4(DELETE)는 같은 파일(`app/api/tasks/[id]/route.ts`)과 같은 컴포넌트(`TodoList.tsx`)를 수정하므로, 두 스토리를 병렬로 진행할 경우 해당 파일에 대한 편집 충돌에 주의해야 한다
- **Polish (Phase 7)**: 구현하기로 한 모든 사용자 스토리 완료에 의존
- **Priority 확장 (Phase 8)**: Foundational 완료에 의존하며, US2가 만든 `TodoList.tsx`와 US1이 만든
  `AddTodoForm.tsx`를 확장한다 — 별도의 새 사용자 스토리(US5)지만 기존 컴포넌트/라우트 파일을
  그대로 수정하므로 Phase 3~4(US1, US2) 완료 후 진행한다

### 사용자 스토리 간 의존성

- **US1 (P1)**: Foundational 이후 시작 가능 — 다른 스토리에 의존하지 않음
- **US2 (P2)**: Foundational 이후 시작 가능하며, US1이 만든 `app/page.tsx`의 임시 목록을 대체함(T016). 기능적으로는 독립적으로 검증 가능
- **US3 (P3)**: Foundational 이후 시작 가능하며, US2가 만든 `TodoList.tsx`에 토글 컨트롤을 추가함(T018). 기능적으로는 독립적으로 검증 가능
- **US4 (P4)**: Foundational 이후 시작 가능하며, `TodoList.tsx`에 삭제 컨트롤을 추가함(T020). 기능적으로는 독립적으로 검증 가능

### 각 사용자 스토리 내부

- API 라우트 구현 → UI 컨트롤 연결 순서
- 스토리 하나가 끝나면 다음 우선순위로 이동

### 병렬 실행 기회

- Setup의 [P] 태스크(T002)는 T001과 병렬 진행 가능
- Foundational의 [P] 태스크(T006, T007, T008)는 서로 병렬 진행 가능
- US1의 T011, T012는 서로 병렬 진행 가능(서로 다른 파일)
- Polish의 T021, T022는 서로 병렬 진행 가능

---

## 병렬 실행 예시: User Story 1

```bash
# 아래 두 태스크는 서로 다른 파일이므로 동시에 진행할 수 있다:
Task: "app/lib/get-tasks.ts에 getTasks() 서버 함수 작성"
Task: "app/components/AddTodoForm.tsx 클라이언트 컴포넌트 작성"
```

---

## 구현 전략

### MVP 우선 (User Story 1만)

1. Phase 1: Setup 완료
2. Phase 2: Foundational 완료 (필수 — 모든 스토리를 막고 있음)
3. Phase 3: User Story 1 완료
4. **중단하고 검증**: [quickstart.md](./quickstart.md) 3단계의 POST/GET 흐름으로 User Story 1을 독립적으로 테스트
5. 준비되면 시연/배포

### 점진적 전달

1. Setup + Foundational 완료 → 기반 준비 완료
2. User Story 1 추가 → 독립 검증 → 시연 (MVP!)
3. User Story 2 추가 → 독립 검증 → 시연
4. User Story 3 추가 → 독립 검증 → 시연
5. User Story 4 추가 → 독립 검증 → 시연
6. 각 스토리는 이전 스토리를 깨뜨리지 않으면서 가치를 더한다

---

## 참고사항

- `[P]` 태스크 = 서로 다른 파일, 의존성 없음
- `[Story]` 라벨은 태스크를 특정 사용자 스토리에 연결해 추적할 수 있게 한다
- 각 사용자 스토리는 독립적으로 완료·검증 가능해야 한다
- 논리적으로 묶이는 태스크 단위로 커밋한다
- 각 체크포인트에서 멈춰 해당 스토리를 독립적으로 검증할 수 있다
- 피해야 할 것: 모호한 태스크, 같은 파일에 대한 불필요한 충돌, 스토리 간 독립성을 깨는 교차 의존성
