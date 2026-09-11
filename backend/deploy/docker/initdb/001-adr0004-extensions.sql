-- ANX-162 S2 — ADR0004 storage extensions (TimescaleDB + pgvector on PostgreSQL 16)
-- Safe on fresh init; IF NOT EXISTS on re-run via manual apply.
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS vector;
