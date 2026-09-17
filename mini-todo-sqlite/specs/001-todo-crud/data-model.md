# 데이터 모델: 할 일 CRUD

**입력**: [spec.md](./spec.md) 핵심 엔티티, [research.md](./research.md) 용어 매핑 결정

## 엔티티: Task (명세의 "할 일/Todo"에 대응)

| 필드 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---|---|---|
| `id` | `String` (cuid) | 예 | 자동 생성 | 항목을 고유하게 식별하는 값. 토글/삭제 대상 지정에 사용 (spec FR-004, FR-005, FR-008). |
| `title` | `String` | 예 | 없음 | 할 일 제목. 비어 있거나 공백만으로 이루어질 수 없음 (spec FR-002). |
| `completed` | `Boolean` | 예 | `false` | 완료 여부. 새로 생성된 항목은 항상 `false`로 시작 (spec FR-007). |
| `priority` | `String` (`"high"` \| `"medium"` \| `"low"`) | 예 | `"medium"` | 중요도. 생성 이후에도 변경 가능 (spec FR-009, FR-010). 화면에는 한글 라벨(높음/중간/낮음)로만 표시되고, 저장은 영문 키로 한다 (research.md #10). |
| `createdAt` | `DateTime` | 예 | 생성 시각(`now()`) | 목록을 안정적인 순서로 표시하기 위한 생성 시각 (spec FR-003 — "모든 항목을 목록으로 표시"를 일관된 순서로 지원하기 위한 구현 세부사항). `priority`는 이 정렬 순서에 영향을 주지 않는다 (spec FR-011). |

### Prisma 스키마 정의

```prisma
// prisma/schema.prisma
model Task {
  id        String   @id @default(cuid())
  title     String
  completed Boolean  @default(false)
  priority  String   @default("medium")
  createdAt DateTime @default(now())

  @@map("tasks")
}
```

`priority`는 Prisma `enum`이 아니라 `String`이다 — SQLite 커넥터는 네이티브 enum 컬럼 타입을
지원하지 않기 때문이다 (research.md #10). 유효한 3개 값으로의 제한은 애플리케이션 레벨의
유니온 타입 + 타입가드(`lib/priority.ts`의 `isValidPriority`)로 강제한다.

### 유효성 검증 규칙

- `title`: 앞뒤 공백을 제거(trim)한 뒤 길이가 1자 이상이어야 한다. 그렇지 않으면 생성 요청은 거부된다 (spec FR-002, Edge Cases).
- `completed`: 반드시 `true` 또는 `false` boolean 값이어야 하며, 다른 타입은 거부한다 (research.md #7 — 토글은 원하는 최종 상태를 명시적으로 전달).
- `priority`: 반드시 `"high"`, `"medium"`, `"low"` 중 하나여야 하며, 다른 값은 거부한다 (spec FR-010). 생성 시 지정하지 않으면 `"medium"`이 적용된다 (spec FR-009).
- 별도의 제목 길이 상한은 두지 않는다 (spec 가정 항목과 일치).

### 상태 전이

```text
[생성] --(POST /api/tasks)--> completed = false, priority = "medium" | 지정된 값
completed = false --(PATCH { completed: true })--> completed = true
completed = true  --(PATCH { completed: false })--> completed = false
completed = (true|false) --(DELETE)--> [삭제됨, 더 이상 존재하지 않음]
priority = X --(PATCH { priority: Y })--> priority = Y  (X, Y ∈ {high, medium, low}, 임의 방향)
```

- 완료 상태는 `false`와 `true` 사이를 자유롭게 오갈 수 있으며 제한된 순서나 잠금 규칙은 없다 (spec User Story 3).
- 중요도도 세 값 사이를 자유롭게 오갈 수 있으며 제한된 순서나 잠금 규칙은 없다 (spec User Story 5).
- `completed`와 `priority`는 서로 독립적이며, 하나의 PATCH 요청으로 둘 중 하나만, 또는 둘 다 함께 변경할 수 있다 (contracts/tasks-api.md PATCH 섹션).
- 삭제는 종단 상태이며 되돌릴 수 없다 (spec 가정: 삭제는 즉시·영구적).

### 관계

- 다른 엔티티와의 관계는 없다. `Task`는 단일 사용자 범위에서 독립적으로 존재하는 엔티티다 (spec 가정: 단일 사용자, 인증/다중 사용자 분리 없음).
