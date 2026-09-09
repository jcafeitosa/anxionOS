#!/usr/bin/env node
import { appendHireLog } from "./registry.mjs";
const opts = { issue: null, subject: null };
for (let i = 2; i < process.argv.length; i += 1) {
  if (process.argv[i] === "--issue") opts.issue = process.argv[++i]?.toUpperCase();
  else if (process.argv[i] === "--subject") opts.subject = process.argv[++i];
}
if (!opts.issue || !opts.subject) { console.error("Usage: cto-hire-decide.mjs --issue ANX-N --subject ..."); process.exit(1); }
const decision = { action: "cto-hire-approve", issueId: opts.issue, subject: opts.subject, chosen: "approve", rationale: "CTO Renata — contratação on-demand com reason", decidedAt: new Date().toISOString(), decidedBy: "orchestrator" };
appendHireLog(decision);
console.log(JSON.stringify({ approved: true, decision }));
