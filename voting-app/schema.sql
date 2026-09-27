-- Neon dev·main 브랜치와 테스트(PGlite)에 똑같이 적용한다. 여러 번 적용해도 안전하다.

CREATE TABLE IF NOT EXISTS polls (
  id          TEXT PRIMARY KEY,
  question    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at   TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS options (
  id        INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  poll_id   TEXT NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  position  INTEGER NOT NULL,
  text      TEXT NOT NULL,
  UNIQUE (poll_id, position)
);

CREATE TABLE IF NOT EXISTS votes (
  id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  poll_id     TEXT NOT NULL REFERENCES polls (id) ON DELETE CASCADE,
  option_id   INTEGER NOT NULL REFERENCES options (id) ON DELETE CASCADE,
  voter_id    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- 한 참여자는 한 투표에 한 표만 (ADR-0001). 동시 제출도 여기서 막힌다.
  UNIQUE (poll_id, voter_id)
);

-- 같은 시각에 만든 투표의 순서를 정하기 위한 만든 순서 번호. 기존 행에도 채워진다.
ALTER TABLE polls ADD COLUMN IF NOT EXISTS seq BIGINT GENERATED ALWAYS AS IDENTITY;

-- 마감 시각 (없을 수 있음). 마감 여부는 읽을 때 판단한다 (ADR-0002).
ALTER TABLE polls ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;

-- 기명 투표 여부. 기존 투표는 익명이다 (ADR-0003).
ALTER TABLE polls ADD COLUMN IF NOT EXISTS named BOOLEAN NOT NULL DEFAULT false;
-- 기명 투표에서 표를 던진 시점의 참여자 이름. 익명 투표와 기존 표는 비어 있다.
ALTER TABLE votes ADD COLUMN IF NOT EXISTS voter_name TEXT;
