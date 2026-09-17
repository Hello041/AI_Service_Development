# Research: 할 일 CRUD

**입력**: [spec.md](./spec.md), [.specify/memory/constitution.md](../../.specify/memory/constitution.md), 사용자가 `/speckit-plan`에 제공한 기술 지시사항

## 1. 용어 매핑 — 명세의 "Todo" ↔ 구현의 "Task"

- **결정**: 명세서의 도메인 엔티티 "할 일(Todo)"은 코드/DB에서는 `Task`라는 이름으로 구현하고, API 리소스 경로는 `/api/tasks`로 둔다.
- **근거**: 사용자가 `/speckit-plan` 입력에서 `app/api/tasks/route.ts` 라는 구체적인 경로를 지정했다. 이는 순수한 네이밍 결정이며 의미(제목, 완료 여부를 가진 할 일 1건)는 spec.md와 동일하다.
- **검토한 대안**: 경로를 `/api/todos`로 하고 Prisma 모델도 `Todo`로 맞춰 명세 용어와 완전히 일치시키는 방안도 있었으나, 사용자가 명시적으로 `tasks` 경로를 지정했으므로 그 지시를 따른다.

## 2. ORM 및 데이터베이스

- **결정**: Prisma ORM + SQLite(로컬 파일 `prisma/dev.db`)를 사용한다. `prisma/schema.prisma`에 `datasource db { provider = "sqlite", url = "file:./dev.db" }`를 정의하고, `prisma migrate dev`로 스키마를 적용, `prisma generate`로 타입이 있는 Prisma Client를 생성한다.
- **근거**: 사용자가 명시적으로 지정했다. SQLite 파일 기반 DB는 별도 서버 설정이나 외부 서비스 가입 없이 로컬에서 바로 동작하며, 프로젝트 이름(mini-todo-sqlite)과도 일치한다. Prisma Client는 스키마로부터 타입을 생성하므로 헌장 원칙 II(엄격한 타입 안전성, `any` 금지)를 자연스럽게 만족시킨다.
- **검토한 대안**: `better-sqlite3` 등으로 직접 SQL을 다루는 방법도 있으나, 타입 안전성을 직접 보장해야 하는 부담이 커서 헌장 원칙 II와의 정합성이 Prisma보다 떨어진다.

## 3. Prisma Client 싱글턴 패턴

- **결정**: `lib/prisma.ts`에서 Next.js 개발 모드의 핫 리로드로 인한 `PrismaClient` 중복 생성을 막기 위해 `globalThis`를 이용한 싱글턴 패턴을 사용한다(Prisma 공식 Next.js 가이드에서 권장하는 표준 패턴).
- **근거**: 별도 서버 프로세스 없이 `next dev`가 매 파일 변경마다 모듈을 재평가하므로, 싱글턴이 없으면 다수의 `PrismaClient` 인스턴스가 생성되어 로컬 SQLite 파일에 대한 커넥션이 누적될 수 있다.

## 4. Next.js App Router Route Handler 규칙 (버전 확인)

- **결정**: 이 저장소에 설치된 Next.js 문서(`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`)를 직접 확인한 결과, 동적 세그먼트의 `params`는 **Promise**이며 반드시 `await`로 꺼내 써야 한다(`const { id } = await ctx.params`). 이 규칙을 `app/api/tasks/[id]/route.ts`의 PATCH/DELETE 핸들러에 적용한다.
- **근거**: AGENTS.md 지침에 따라 이 저장소의 Next.js는 학습 데이터와 다를 수 있는 버전이므로, 실제 번들 문서를 신뢰 소스로 확인했다. 구버전 Next.js처럼 `params`를 동기 객체로 다루면 타입 오류 또는 런타임 경고가 발생한다.
- **검토한 대안**: 없음 — 설치된 버전의 공식 동작을 그대로 따른다.

## 5. API 응답 포맷(JSON envelope)

- **결정**: `lib/api-response.ts`에 성공/실패 공통 헬퍼를 만든다.
  - 성공: `{ data: T }`, 상태 코드는 동작에 맞게 200/201 사용.
  - 실패: `{ error: { message: string } }`, 상태 코드는 400(검증 실패)/404(대상 없음)/500(예상치 못한 오류).
  - 삭제(DELETE) 성공도 본문이 없는 204 대신 `200 { data: { id } }`을 반환하여, 모든 응답이 예외 없이 JSON 본문과 `Content-Type: application/json`을 갖도록 한다.
- **근거**: 헌장 원칙 III("모든 API 라우트는 성공/실패 모두 JSON, 단일 공유 포맷")을 직접적으로 만족시키기 위함이다. 204는 본문이 없어 "항상 JSON"이라는 요구와 충돌할 수 있어 배제한다.
- **검토한 대안**: DELETE에 204 No Content 사용(REST 관례상 흔하지만, 위 이유로 기각).

## 6. 요청 값 검증 방식

- **결정**: 별도의 검증 라이브러리(zod 등)를 추가하지 않고, `lib/validation.ts`에 작은 순수 함수(타입 가드)를 작성해 제목이 비어있지 않은 문자열인지 확인한다. 입력이 `unknown`인 상태에서 타입을 좁혀 나가며, `any`는 사용하지 않는다.
- **근거**: 사용자가 "별도의 서버 설정이나 외부 서비스 가입은 필요 없다"고 명시했고, 기능 자체가 필드 하나(`title`)만 검증하면 되는 매우 단순한 규모이므로 새 의존성을 추가할 필요가 없다. 이미 헌장 원칙 II가 `unknown` + 타입 좁히기를 명시적으로 허용하고 있다.
- **검토한 대안**: `zod` 도입 — 더 큰 스키마가 필요해지면 유효한 선택이지만, 현재 범위(제목 1개 필드)에서는 과한 의존성이다.

## 7. 완료 여부 토글 방식

- **결정**: 토글 전용 엔드포인트 대신, `PATCH /api/tasks/{id}`가 요청 본문 `{ completed: boolean }`을 받아 클라이언트가 원하는 최종 상태를 명시적으로 지정하도록 한다.
- **근거**: 클라이언트가 항상 반대값을 보내는 "toggle"보다, 원하는 최종 상태를 명시적으로 보내는 편이 동시 요청/중복 클릭 상황에서 더 예측 가능하고 멱등적(idempotent)이다.
- **검토한 대안**: 본문 없이 서버가 현재 값의 반대로 뒤집는 `POST /api/tasks/{id}/toggle` — 더 간단해 보이지만 멱등성이 없어 네트워크 재시도 시 상태가 흔들릴 수 있어 기각.

## 8. UI 구현 방식

- **결정**: `app/page.tsx`를 서버 컴포넌트로 유지해 초기 목록을 Prisma로 직접 조회해 렌더링하고, 추가/토글/삭제처럼 상호작용이 필요한 부분만 클라이언트 컴포넌트(`app/components/AddTodoForm.tsx`, `app/components/TodoList.tsx`)로 분리해 내부적으로 `/api/tasks` REST 엔드포인트를 호출한다.
- **근거**: 헌장 원칙 I("기본은 서버 컴포넌트, 상호작용이 필요한 경우에만 클라이언트 컴포넌트")을 그대로 따른다. 사용자의 지시(API Routes로 REST 엔드포인트 구성)를 살리면서도, spec.md의 사용자 스토리(추가/목록/토글/삭제)를 실제로 충족하려면 UI가 있어야 한다.
- **검토한 대안**: 클라이언트 컴포넌트에서 Server Actions로 직접 DB를 호출하는 방식 — 사용자가 명시적으로 "API Routes로 REST 엔드포인트를 만든다"고 지정했으므로 이번 계획에서는 채택하지 않는다.

## 9. (구현 중 추가) Prisma 버전 고정과 드라이버 어댑터

- **결정**: `prisma`/`@prisma/client`를 `7.10.0`으로 고정 설치하고, SQLite 연결은 `@prisma/adapter-better-sqlite3`(+`better-sqlite3`) 드라이버 어댑터로 구성한다.
  - `prisma/schema.prisma`의 `datasource db`는 `provider = "sqlite"`만 지정한다(Prisma 7부터 `url` 속성은 스키마 파일에서 지원하지 않는다).
  - 저장소 루트의 `prisma.config.ts`가 `datasource.url = "file:./prisma/dev.db"`를 지정해 `prisma migrate dev` 등 Migrate CLI 명령이 사용할 연결 주소를 제공한다.
  - 앱 런타임은 `lib/prisma.ts`에서 `new PrismaBetterSqlite3({ url: "file:./prisma/dev.db" })`로 어댑터를 만들고 `new PrismaClient({ adapter })`에 전달한다.
- **근거**: 구현 중 `npm install prisma @prisma/client`(버전 미지정)를 실행하자 npm의 `latest` 태그가 `8.0.0-rc.15`(프리릴리스)를 가리켰고, 이 버전은 `prisma init`/`prisma orm init`의 데이터소스 대상이 `postgres`/`mongodb`로만 제한되어 있어 SQLite를 초기 스캐폴딩할 수 없었다. 한 단계 낮춰 `7.10.0`(둘 다 `latest`/`prev` 태그가 가리키는, SQLite를 지원하는 마지막 stable 짝)으로 고정했지만, 이 버전에서도 스키마의 `datasource.url`이 제거되고 드라이버 어댑터가 필수가 되어 있었다(`@prisma/client`의 생성된 타입에서 `adapter` 파라미터가 사실상 필수임을 확인). 이는 원래 계획(로컬 SQLite 파일, 외부 서비스 불필요)의 결과를 그대로 유지하는 선에서 가장 낮은 리스크의 경로였다.
- **검토한 대안**:
  - Prisma `8.0.0-rc.15` 그대로 사용하고 `--target postgres`로 전환 — 사용자가 명시한 "별도의 서버 설정이나 외부 서비스 가입 불필요" 요구와 정면으로 충돌해 기각.
  - `@prisma/adapter-libsql`(`@libsql/client` 기반) 사용 — `better-sqlite3`와 동등하게 유효한 선택지이나, Prisma 문서의 SQLite 안내가 `better-sqlite3`를 기본 예시로 제시하고 있어 더 표준적인 조합으로 판단해 채택하지 않음.
- **영향받은 파일**: `prisma/schema.prisma`(url 제거), `prisma.config.ts`(신규), `lib/prisma.ts`(어댑터 패턴 반영), `package.json`(버전 고정 및 신규 의존성 2종 추가). `data-model.md`의 Prisma 스키마 블록은 `datasource` 부분을 제외하면 그대로 유효하다.

## 10. (기능 확장) Priority 필드 표현 — String vs enum

- **결정**: 할 일의 중요도(`priority`)는 Prisma `enum`이 아니라 `String` 컬럼(+ `@default("medium")`)으로 표현하고, TypeScript 쪽 타입 안전성은 `lib/priority.ts`의 유니온 타입(`Priority = "high" | "medium" | "low"`) + 타입가드(`isValidPriority`)로 확보한다. 한글 라벨(높음/중간/낮음)은 같은 파일의 `PRIORITY_LABELS` 맵으로 분리해, 저장 값(영문 키)과 화면 표시(한글)를 독립적으로 유지한다.
- **근거**: 이 프로젝트가 쓰는 Prisma 7.10.0의 SQLite 커넥터는 네이티브 enum 컬럼 타입을 지원하지 않는다(다른 커넥터처럼 문자열로 에뮬레이션하지도 않음) — `enum Priority { high medium low }`를 스키마에 선언하면 SQLite datasource에서 스키마 검증 오류가 발생한다. `String` + 애플리케이션 레벨 가드는 이미 `completed` 필드에 쓰인 `isValidCompleted` 패턴과 동일해 일관성이 있다(헌장 원칙 II — `any` 금지, `unknown` + 좁히기).
- **검토한 대안**: Prisma `enum` 시도 — SQLite datasource에서 스키마 검증 오류로 즉시 기각.
- **영향받은 파일**: `prisma/schema.prisma`(필드 추가 + 마이그레이션), `lib/priority.ts`(신규), `app/api/tasks/route.ts`(POST에서 선택적 `priority` 처리), `app/api/tasks/[id]/route.ts`(PATCH를 `completed`/`priority` 범용 부분 업데이트로 확장), `app/components/AddTodoForm.tsx`(중요도 선택 UI), `app/components/TodoList.tsx`(카드 스타일 + 중요도 배지/변경 컨트롤).

## 해결되지 않은 항목

없음 — Technical Context의 모든 NEEDS CLARIFICATION 항목이 위에서 해결되었다. 구현 단계에서 새로 드러난 Prisma 버전/드라이버 어댑터 이슈는 위 #9에, 기능 확장 중 발견한 SQLite enum 제약은 #10에 기록하고 즉시 해결했다.
