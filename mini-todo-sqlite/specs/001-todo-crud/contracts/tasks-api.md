# API 계약: `/api/tasks`

모든 응답은 `Content-Type: application/json`이며, 아래 두 가지 공통 포맷(envelope) 중 하나를 따른다 (헌장 원칙 III, [research.md](../research.md) #5).

- 성공: `{ "data": <T> }`
- 실패: `{ "error": { "message": string } }`

## Task 표현

```json
{
  "id": "string",
  "title": "string",
  "completed": false,
  "priority": "medium",
  "createdAt": "2026-09-16T00:00:00.000Z"
}
```

`priority`는 `"high"`, `"medium"`, `"low"` 중 하나다 (research.md #10 — SQLite에서는
Prisma `enum`을 쓸 수 없어 `String`으로 표현). 화면에 보이는 한글 라벨(높음/중간/낮음)은
클라이언트가 `lib/priority.ts`의 `PRIORITY_LABELS`로 매핑하며, API 값 자체는 항상 영문 키다.

---

## `GET /api/tasks`

목록에 있는 모든 할 일 항목을 조회한다 (spec User Story 2, FR-003).

- **요청 본문**: 없음
- **200 OK**
  ```json
  { "data": [ { "id": "t1", "title": "우유 사기", "completed": false, "priority": "medium", "createdAt": "..." } ] }
  ```
  항목이 없으면 `"data": []`. 정렬은 항상 `createdAt` 오름차순이며 `priority`는 정렬에 영향을 주지 않는다 (spec FR-011).

---

## `POST /api/tasks`

새 할 일 항목을 추가한다 (spec User Story 1, FR-001, FR-002, FR-007; User Story 5, FR-009).

- **요청 본문**
  ```json
  { "title": "우유 사기", "priority": "high" }
  ```
  `priority`는 선택 필드다. 생략하면 `"medium"`이 적용된다 (spec FR-009).
- **201 Created**
  ```json
  { "data": { "id": "t1", "title": "우유 사기", "completed": false, "priority": "high", "createdAt": "..." } }
  ```
- **400 Bad Request** — `title`이 없거나 빈 문자열/공백만인 경우
  ```json
  { "error": { "message": "title은 비어 있지 않은 문자열이어야 합니다." } }
  ```
- **400 Bad Request** — `priority`가 지정되었는데 `"high"`/`"medium"`/`"low"`가 아닌 경우
  ```json
  { "error": { "message": "priority는 high, medium, low 중 하나여야 합니다." } }
  ```

---

## `PATCH /api/tasks/{id}`

기존 할 일 항목의 완료 여부와/또는 중요도를 변경하는 범용 부분 업데이트 엔드포인트다
(spec User Story 3, FR-004; User Story 5, FR-010). `completed`와 `priority` 중
하나 이상을 포함해야 하며, 포함된 필드만 갱신된다.

- **경로 매개변수**: `id` — 대상 Task의 식별자
- **요청 본문 예시**
  ```json
  { "completed": true }
  ```
  ```json
  { "priority": "low" }
  ```
  ```json
  { "completed": true, "priority": "low" }
  ```
- **200 OK**
  ```json
  { "data": { "id": "t1", "title": "우유 사기", "completed": true, "priority": "low", "createdAt": "..." } }
  ```
- **400 Bad Request** — `completed`와 `priority` 둘 다 body에 없는 경우
  ```json
  { "error": { "message": "completed 또는 priority 중 하나 이상을 포함해야 합니다." } }
  ```
- **400 Bad Request** — `completed`가 boolean이 아닌 경우
  ```json
  { "error": { "message": "completed는 boolean 값이어야 합니다." } }
  ```
- **400 Bad Request** — `priority`가 `"high"`/`"medium"`/`"low"`가 아닌 경우
  ```json
  { "error": { "message": "priority는 high, medium, low 중 하나여야 합니다." } }
  ```
- **404 Not Found** — 해당 `id`의 Task가 존재하지 않는 경우 (spec FR-008, Edge Cases)
  ```json
  { "error": { "message": "해당 id의 할 일을 찾을 수 없습니다." } }
  ```

---

## `DELETE /api/tasks/{id}`

기존 할 일 항목을 영구적으로 삭제한다 (spec User Story 4, FR-005).

- **경로 매개변수**: `id` — 대상 Task의 식별자
- **200 OK**
  ```json
  { "data": { "id": "t1" } }
  ```
- **404 Not Found** — 해당 `id`의 Task가 이미 없는 경우 (spec FR-008, Edge Cases)
  ```json
  { "error": { "message": "해당 id의 할 일을 찾을 수 없습니다." } }
  ```
