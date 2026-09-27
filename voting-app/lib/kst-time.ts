// 사람이 보고 입력하는 시각은 모두 한국 시간(UTC+9, 서머타임 없음) 기준이다.
// 서버와 브라우저의 시간대와 무관하게 동작하도록 오프셋으로 직접 계산한다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const pad = (n: number) => String(n).padStart(2, "0");

// 한국 시간의 벽시계 값을 UTC 필드로 읽을 수 있게 옮긴 Date
const toKstWallClock = (date: Date) => new Date(date.getTime() + KST_OFFSET_MS);

// "2026-09-30T18:00" (datetime-local 입력칸 값) → 시각. 형식이 틀리면 null.
export function parseKstInput(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const wall = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const valid =
    wall.getUTCFullYear() === year &&
    wall.getUTCMonth() === month - 1 &&
    wall.getUTCDate() === day &&
    wall.getUTCHours() === hour &&
    wall.getUTCMinutes() === minute;
  return valid ? new Date(wall.getTime() - KST_OFFSET_MS) : null;
}

// 시각 → datetime-local 입력칸 값 (분 단위, 초는 버림)
export function toKstInput(date: Date): string {
  const k = toKstWallClock(date);
  return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}T${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())}`;
}

export function defaultDeadlineInput(now: Date): string {
  return toKstInput(new Date(now.getTime() + DAY));
}

// "9월 30일 (수) 18:00 마감"
export function formatDeadline(deadline: Date): string {
  const k = toKstWallClock(deadline);
  return `${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일 (${WEEKDAYS[k.getUTCDay()]}) ${pad(k.getUTCHours())}:${pad(k.getUTCMinutes())} 마감`;
}

// "25분 남음" / "5시간 남음" / "2일 남음". 이미 지난 마감 시각에는 쓰지 않는다.
export function formatRemaining(deadline: Date, now: Date): string {
  const left = deadline.getTime() - now.getTime();
  if (left < HOUR) return `${Math.max(1, Math.ceil(left / MINUTE))}분 남음`;
  if (left < DAY) return `${Math.floor(left / HOUR)}시간 남음`;
  return `${Math.floor(left / DAY)}일 남음`;
}

export function isDeadlineSoon(deadline: Date, now: Date): boolean {
  const left = deadline.getTime() - now.getTime();
  return left > 0 && left <= DAY;
}
