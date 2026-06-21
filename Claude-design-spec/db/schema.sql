-- Canonical schema for Brick Voyage. Runs after database.sql on a fresh
-- Postgres volume (against the `brickvoyage` DB by default). The Vitest
-- service suite re-applies this against `brickvoyage_test` at startup.

-- visitors / analytics
CREATE TABLE visitors (
  anon_id      UUID PRIMARY KEY,
  first_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen    TIMESTAMPTZ NOT NULL DEFAULT now(),
  found_all    BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE island_discoveries (
  anon_id       UUID REFERENCES visitors(anon_id),
  island_id     TEXT NOT NULL,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (anon_id, island_id)
);

-- accounts (minigame)
CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  username      CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- race scores
CREATE TABLE race_scores (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT REFERENCES users(id),
  time_ms    INTEGER NOT NULL,
  course     TEXT NOT NULL DEFAULT 'cove',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON race_scores (course, time_ms);
