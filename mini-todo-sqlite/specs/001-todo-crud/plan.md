# 구현 계획: 할 일 CRUD

**브랜치**: `001-todo-crud` | **날짜**: 2026-09-16 | **명세**: [spec.md](./spec.md)

**입력**: `/specs/001-todo-crud/spec.md`의 기능 명세서

**참고**: 이 템플릿은 `/speckit-plan` 명령이 채워 넣는다. 이 정의는 실행 워크플로를 설명한다.

## 요약

사용자가 할 일을 추가·조회·완료 토글·삭제할 수 있는 최소 기능의 할 일 관리 앱을 만든다
(spec.md 참고). 기술적 접근: Next.js App Router의 Route Handler로 `/api/tasks`
REST 엔드포인트(GET/POST, `[id]`에서 PATCH/DELETE)를 구성하고, Prisma ORM으로
로컬 SQLite 파일(`prisma/dev.db`)에 `Task` 레코드를 저장한다. UI는 `app/page.tsx`
서버 컴포넌트가 초기 목록을 렌더링하고, 추가/토글/삭제처럼 상호작용이 필요한
부분만 클라이언트 컴포넌트로 분리해 위 REST 엔드포인트를 호출한다. 별도의 외부
서비스 가입이나 서버 인프라 설정은 필요 없다.

## 기술 컨텍스트

**언어/버전**: TypeScript 5.x (strict 모드), Next.js 16.3.5 (App Router), React 19.2.8

**주요 의존성**: `next`, `react`/`react-dom`(기존 설치됨), `prisma` + `@prisma/client`(신규 추가 필요)

**스토리지**: 로컬 SQLite 파일 `prisma/dev.db` (Prisma를 통해 접근, 외부 DB 서버 없음)

**테스트**: 이 프로젝트에는 아직 자동화된 테스트 프레임워크가 구성되어 있지 않고
헌장에도 테스트 관련 원칙이 없으므로, [quickstart.md](./quickstart.md)의 `curl` 기반
API 검증과 브라우저 수동 검증으로 기능 동작을 확인한다 (research.md #6 참고 — 결정 사항).

**대상 플랫폼**: Node.js 기반 Next.js 개발/운영 서버 (로컬 실행, `next dev`/`next start`)

**프로젝트 유형**: 웹 서비스 — UI와 API가 하나의 Next.js App Router 프로젝트 안에 공존하는 단일 프로젝트 구조

**성능 목표**: 명세(spec.md)와 사용자 지시에 별도의 정량적 성능 목표가 없음 — 개인용 소규모 할 일 목록 앱 규모에 맞는 일반적인 웹 앱 반응성이면 충분하다.

**제약사항**: 로컬 SQLite 파일만 사용(외부 DB 서비스 가입 금지), 별도의 서버 인프라 설정 불필요, 헌장 원칙 II에 따라 `any` 타입 사용 금지, 헌장 원칙 III에 따라 모든 API 응답은 JSON 단일 포맷 유지.

**규모/범위**: 단일 사용자, 엔티티 1종(Task), REST 엔드포인트 4개(GET/POST `/api/tasks`, PATCH/DELETE `/api/tasks/{id}`), 화면 1개(할 일 목록 페이지).

## 헌장 준수 확인 (Constitution Check)

*게이트: Phase 0 리서치 전에 반드시 통과해야 하며, Phase 1 설계 이후 다시 확인한다.*

| 원칙 | 이 계획에서의 반영 | 상태 |
|---|---|---|
| I. Next.js App Router 아키텍처 | App Router만 사용(`app/api/tasks/**/route.ts`, `app/page.tsx`); 모든 소스는 `.ts`/`.tsx`; 기본은 서버 컴포넌트, 상호작용이 필요한 부분만 클라이언트 컴포넌트 | PASS |
| II. 엄격한 타입 안전성 (NON-NEGOTIABLE) | Prisma Client가 `Task` 타입을 생성해 그대로 사용; 요청 본문은 `unknown`에서 타입 가드로 좁힘; `any` 사용 없음 | PASS |
| III. 일관된 JSON API 응답 | `lib/api-response.ts` 공유 헬퍼로 모든 라우트가 `{ data }` / `{ error: { message } }` 포맷과 `application/json`을 반환(DELETE도 204 대신 200 JSON 사용) | PASS |

위반 사항 없음 — Complexity Tracking 표는 작성하지 않는다.

## 프로젝트 구조

### 문서 (이 기능)

```text
specs/001-todo-crud/
├── plan.md              # 이 파일 (/speckit-plan 명령 출력)
├── research.md          # Phase 0 출력 (/speckit-plan 명령)
├── data-model.md         # Phase 1 출력 (/speckit-plan 명령)
├── quickstart.md         # Phase 1 출력 (/speckit-plan 명령)
├── contracts/
│   └── tasks-api.md      # Phase 1 출력 (/speckit-plan 명령)
└── tasks.md              # Phase 2 출력 (/speckit-tasks 명령 — /speckit-plan에서는 생성하지 않음)
```

### 소스 코드 (저장소 루트)

```text
app/
├── layout.tsx                        # 기존 파일, 변경 없음
├── page.tsx                          # 할 일 목록 페이지 (서버 컴포넌트, 초기 데이터 로드)
├── components/
│   ├── AddTodoForm.tsx                # 클라이언트 컴포넌트: 제목 입력 후 POST /api/tasks 호출
│   └── TodoList.tsx                   # 클라이언트 컴포넌트: 목록 렌더링, 토글(PATCH)·삭제(DELETE) 호출
└── api/
    └── tasks/
        ├── route.ts                   # GET(목록), POST(생성)
        └── [id]/
            └── route.ts               # PATCH(완료 토글), DELETE(삭제)

lib/
├── prisma.ts                          # Prisma Client 싱글턴 (research.md #3)
├── api-response.ts                    # 공유 JSON 응답 envelope 헬퍼 (research.md #5)
└── validation.ts                      # 요청 본문 검증용 타입 가드 (research.md #6)

prisma/
├── schema.prisma                      # Task 모델 정의 (data-model.md)
└── dev.db                             # 로컬 SQLite 파일 (버전관리 제외 대상)
```

**구조 결정**: 프런트엔드/백엔드를 별도 프로젝트로 분리하지 않고, 하나의 Next.js
App Router 프로젝트 안에서 UI(`app/`)와 REST API(`app/api/tasks/**`)를 함께
둔다. 이는 사용자가 지정한 기술 방향(Next.js API Routes + Prisma + 로컬 SQLite,
별도 서버/외부 서비스 불필요)과 헌장의 기술 스택 절과 정확히 일치한다.

## 복잡성 추적 (Complexity Tracking)

해당 없음 — 헌장 준수 확인에서 위반 사항이 없으므로 이 표는 작성하지 않는다.
