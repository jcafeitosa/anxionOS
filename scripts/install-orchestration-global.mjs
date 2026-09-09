#!/usr/bin/env node
/**
 * Instala o framework de orquestração em ~/.cursor/orchestration (cópia única global).
 */

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(scriptDir, "..");
const sourceRoot = join(repoRoot, ".cursor", "orchestration");
const targetRoot = process.env.ORCHESTRATION_HOME ?? join(homedir(), ".cursor", "orchestration");

const SKIP_DIRS = new Set(["node_modules", ".git", "cto-packages", "delegation-queue", "examples"]);
const SKIP_FILES = new Set([".DS_Store"]);

function readVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function syncDir(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    if (SKIP_DIRS.has(entry) || SKIP_FILES.has(entry)) continue;
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const st = statSync(srcPath);
    if (st.isDirectory()) {
      syncDir(srcPath, destPath);
    } else {
      cpSync(srcPath, destPath, { force: true });
    }
  }
}

function main() {
  if (!existsSync(sourceRoot)) {
    console.error(`Fonte não encontrada: ${sourceRoot}`);
    process.exit(1);
  }

  console.log(`Instalando orquestração global...`);
  console.log(`  origem:  ${sourceRoot}`);
  console.log(`  destino: ${targetRoot}`);

  syncDir(sourceRoot, targetRoot);

  const version = readVersion();
  const versionPath = join(targetRoot, "VERSION");
  writeFileSync(versionPath, `${version}\n`, "utf8");

  const binPath = join(targetRoot, "bin", "orchestration.mjs");
  if (!existsSync(binPath)) {
    console.error(`Aviso: bin/orchestration.mjs não encontrado após sync`);
  }

  console.log(`\n✅ Framework instalado (v${version})`);
  console.log(`\nVariáveis de ambiente (opcional em ~/.zshrc ou ~/.bashrc):`);
  console.log(`  export ORCHESTRATION_HOME="${targetRoot}"`);
  console.log(`  export PATH="$ORCHESTRATION_HOME/bin:$PATH"`);
  console.log(`\nUso em qualquer projeto:`);
  console.log(`  1. cd <seu-projeto>`);
  console.log(`  2. orchestration init`);
  console.log(`  3. orchestration compliance --help`);
  console.log(`\nOu via npm scripts no projeto (se configurado):`);
  console.log(`  npm run orchestration:global -- init`);
  console.log(`  npm run orchestration:global -- compliance --pre-work --issue PREFIX-N --persona orchestrator`);
  console.log(`\nAtualizar instalação: npm run orchestration:install-global`);
}

main();
