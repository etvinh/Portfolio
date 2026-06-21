-- Runs once, on first boot of an empty Postgres volume.
-- Creates the citext extension (for case-insensitive usernames) and the
-- separate test database used by the Vitest service suite.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE DATABASE brickvoyage_test;
\connect brickvoyage_test
CREATE EXTENSION IF NOT EXISTS citext;
