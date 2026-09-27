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
