import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
	new URL("../components/shell/PlatformDashboard.tsx", import.meta.url),
	"utf8",
);

test("PlatformDashboard exists and is exported (ANX-166)", () => {
	assert.match(source, /export function PlatformDashboard/);
});

test("PlatformDashboard does not take agencyId prop (no Agency data leak)", () => {
	assert.doesNotMatch(source, /agencyId:\s*string|agencyId\?:\s*string/);
	assert.doesNotMatch(source, /\/v1\/agencies/);
});

test("PlatformDashboard shows denied state when platformAccess is false", () => {
	assert.match(source, /if \(!platformAccess\)/);
	assert.match(source, /platform-dashboard-denied/);
	assert.match(source, /Acesso PLATFORM negado/);
});

test("PlatformDashboard uses HonestState for all operational panels", () => {
	assert.match(source, /HonestState/);
	assert.match(source, /kind="empty"/);
	assert.match(source, /Módulo operations em construção/);
	assert.match(source, /Runtimes e quotas não publicados/);
	assert.match(source, /Rollout e recovery sob demanda/);
});