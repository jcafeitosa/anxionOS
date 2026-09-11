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
	assert.doesNotMatch(source, /\/v1\/operations\/agencies\//);
});

test("PlatformDashboard shows denied state when platformAccess is false", () => {
	assert.match(source, /if \(!platformAccess\)/);
	assert.match(source, /platform-dashboard-denied/);
	assert.match(source, /Acesso PLATFORM negado/);
});

test("PlatformDashboard fetches platform-scoped operations APIs", () => {
	assert.match(source, /fetchPlatformHealth/);
	assert.match(source, /fetchPlatformIncidents/);
	assert.match(source, /\/v1\/operations\/platform\/health/);
	assert.match(source, /\/v1\/operations\/platform\/incidents/);
});
