#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { graphifyEnv, resolveGraphifyCmd, root } from "./graphify-env.mjs";

const cmd = resolveGraphifyCmd();
const args = ["update", ".", "--no-cluster"];
console.log(`graphify: ${args.join(" ")} (AST-only, no API key)`);

const result = spawnSync(cmd, args, {
  cwd: root,
  stdio: "inherit",
  env: graphifyEnv(),
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
