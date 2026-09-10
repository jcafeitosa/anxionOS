/**
 * Cache local do último resultado de taskboard:ensure.
 * Usado por compliance --pre-work/--pre-commit para bloquear se o board falhou recentemente.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getOrchestrationPaths } from "../agent-config/load-config.mjs";

const CACHE_FILENAME = "taskboard-health.json";
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;

function cachePath() {
  const { paths } = getOrchestrationPaths();
  return join(paths.autonomy, CACHE_FILENAME);
}

function emptyCache() {
  return {
    version: 1,
    ok: null,
    checkedAt: null,
    url: null,
    error: null,
  };
}

export function loadTaskboardCache() {
  const path = cachePath();
  if (!existsSync(path)) return emptyCache();
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    return { ...emptyCache(), ...data };
  } catch {
    return emptyCache();
  }
}

export function saveTaskboardCache(patch) {
  const path = cachePath();
  const dir = join(path, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const next = {
    ...loadTaskboardCache(),
    ...patch,
    version: 1,
    checkedAt: patch.checkedAt ?? new Date().toISOString(),
  };
  writeFileSync(path, JSON.stringify(next, null, 2) + "\n", "utf8");
  return next;
}

export function recordTaskboardEnsure(ok, { url = null, error = null } = {}) {
  return saveTaskboardCache({
    ok: Boolean(ok),
    url,
    error: error ? String(error) : null,
    checkedAt: new Date().toISOString(),
  });
}

export function getTaskboardCacheStatus(maxAgeMs = DEFAULT_MAX_AGE_MS) {
  const cache = loadTaskboardCache();
  if (!cache.checkedAt) {
    return { stale: true, failed: false, cache };
  }
  const ageMs = Date.now() - Date.parse(cache.checkedAt);
  const stale = ageMs > maxAgeMs;
  const failed = cache.ok === false;
  return { stale, failed, cache, ageMs };
}

export function isTaskboardEnsureFresh(maxAgeMs = DEFAULT_MAX_AGE_MS) {
  const { stale, failed, cache } = getTaskboardCacheStatus(maxAgeMs);
  return !stale && cache.ok === true && !failed;
}
