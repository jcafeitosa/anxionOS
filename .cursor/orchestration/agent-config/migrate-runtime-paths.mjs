#!/usr/bin/env node
/**
 * Migra runtime de orquestração de `.codewhale/` → `.cursor/orchestration-runtime/`.
 * Não remove o diretório legado — verifique e apague manualmente após validação.
 *
 * Usage:
 *   node migrate-runtime-paths.mjs [--dry-run] [--json]
 */

import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  DEFAULT_CONFIG_REL,
  DEFAULT_RUNTIME_ROOT,
  LEGACY_CONFIG_REL,
  LEGACY_RUNTIME_ROOT,
  loadConfigFile,
  resolveConfigPath,
  resolveOrchestrationPaths,
} from "./load-config.mjs";

const RUNTIME_SUBDIRS = [
  "dialogue",
  "hire",
  "workflows",
  "autonomy",
  "proactive",
  "lifecycle",
  "state",
];

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
    json: argv.includes("--json"),
  };
}

function copyDir(src, dest, dryRun) {
  if (!existsSync(src)) return false;
  if (dryRun) return true;
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, force: false });
  return true;
}

export function migrateRuntimePaths(options = {}) {
  const { projectRoot } = resolveOrchestrationPaths(options);
  const dryRun = options.dryRun === true;
  const legacyRoot = join(projectRoot, LEGACY_RUNTIME_ROOT);
  const runtimeRoot = join(projectRoot, DEFAULT_RUNTIME_ROOT);
  const actions = [];

  if (existsSync(legacyRoot)) {
    for (const sub of RUNTIME_SUBDIRS) {
      const src = join(legacyRoot, sub);
      const dest = join(runtimeRoot, sub);
      if (existsSync(src) && !existsSync(dest)) {
        const copied = copyDir(src, dest, dryRun);
        if (copied) actions.push({ action: "copy", from: src, to: dest });
      }
    }
    const legacyPersonas = join(legacyRoot, "personas.local.json");
    const destPersonas = join(runtimeRoot, "personas.local.json");
    if (existsSync(legacyPersonas) && !existsSync(destPersonas)) {
      if (!dryRun) {
        mkdirSync(runtimeRoot, { recursive: true });
        cpSync(legacyPersonas, destPersonas);
      }
      actions.push({ action: "copy", from: legacyPersonas, to: destPersonas });
    }
  }

  const canonicalConfig = join(projectRoot, DEFAULT_CONFIG_REL);
  const legacyConfig = join(projectRoot, LEGACY_CONFIG_REL);
  if (!existsSync(canonicalConfig) && existsSync(legacyConfig)) {
    const raw = loadConfigFile(legacyConfig);
    raw.paths = {
      runtime: DEFAULT_RUNTIME_ROOT,
      dialogue: `${DEFAULT_RUNTIME_ROOT}/dialogue`,
      workflows: `${DEFAULT_RUNTIME_ROOT}/workflows`,
      autonomy: `${DEFAULT_RUNTIME_ROOT}/autonomy`,
      hire: `${DEFAULT_RUNTIME_ROOT}/hire`,
      proactive: `${DEFAULT_RUNTIME_ROOT}/proactive`,
      lifecycle: `${DEFAULT_RUNTIME_ROOT}/lifecycle`,
      state: `${DEFAULT_RUNTIME_ROOT}/state`,
    };
    delete raw.paths.codewhale;
    if (!dryRun) {
      mkdirSync(join(projectRoot, ".cursor"), { recursive: true });
      writeFileSync(canonicalConfig, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
    }
    actions.push({ action: "write-config", path: canonicalConfig, from: legacyConfig });
  }

  return {
    projectRoot,
    configPath: resolveConfigPath(projectRoot),
    runtimeRoot,
    legacyRoot,
    dryRun,
    actions,
    migrated: actions.length > 0,
  };
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const result = migrateRuntimePaths({ dryRun: opts.dryRun });
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (!result.migrated) {
    console.log("Nada a migrar — runtime Cursor já presente ou legado ausente.");
    return;
  }
  console.log(`${opts.dryRun ? "[dry-run] " : ""}Migração concluída:\n`);
  for (const a of result.actions) {
    console.log(`  ${a.action}: ${a.from ?? a.path}${a.to ? ` → ${a.to}` : ""}`);
  }
  console.log(`\nConfig: ${result.configPath}`);
  console.log(`Runtime: ${result.runtimeRoot}/`);
  console.log("\nApós validar (orchestration:verify), pode remover `.codewhale/` manualmente.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
