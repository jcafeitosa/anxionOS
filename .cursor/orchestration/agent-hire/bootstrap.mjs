#!/usr/bin/env node
/**
 * Bootstrap roster permanente Level A/B/C.
 */
import { getPersona } from "../agent-dialogue/personas.mjs";
import { LEVEL_A, LEVEL_B, LEVEL_C } from "./levels.mjs";
import { appendHireLog, savePermanentRoster } from "./registry.mjs";

const now = new Date().toISOString();
const agents = [];
for (const slug of LEVEL_A) {
  const p = getPersona(slug);
  agents.push({ slug, level: "A", fullName: p.fullName, team: p.team, hiredAt: now, permanent: true });
}
for (const slug of LEVEL_B) {
  const p = getPersona(slug);
  agents.push({ slug, level: "B", fullName: p.fullName, team: p.team, hiredAt: now, permanent: true });
}
for (const slug of LEVEL_C) {
  const p = getPersona(slug);
  agents.push({ slug, level: "C", fullName: p.fullName, team: p.team, hiredAt: now, permanent: true });
}
savePermanentRoster({ version: 1, bootstrappedAt: now, agents });
appendHireLog({ action: "bootstrap", count: agents.length, levels: { A: LEVEL_A.length, B: LEVEL_B.length, C: LEVEL_C.length } });
const json = process.argv.includes("--json");
const out = { bootstrappedAt: now, count: agents.length, A: LEVEL_A.length, B: LEVEL_B.length, C: LEVEL_C.length };
if (json) console.log(JSON.stringify(out, null, 2));
else console.log(`Bootstrap OK: ${out.count} permanentes (A=${out.A} B=${out.B} C=${out.C})`);
