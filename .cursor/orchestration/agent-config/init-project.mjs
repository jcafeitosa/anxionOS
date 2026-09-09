/**
 * Inicializa overlay de orquestração em um projeto novo.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  DEFAULT_CONFIG_REL,
  DEFAULT_RUNTIME_ROOT,
  resolveFrameworkRoot,
} from "./load-config.mjs";

const RUNTIME_DIRS = ["dialogue", "hire", "workflows", "autonomy", "proactive", "lifecycle", "state"];

const RULE_TEMPLATE = `---
description: Orquestração global — framework em ORCHESTRATION_HOME, config no projeto
alwaysApply: true
---

# Orquestração global

- Framework: \`~/.cursor/orchestration\` (ou ORCHESTRATION_HOME)
- Config do projeto: \`.cursor/orchestration.config.json\`
- Runtime: \`.cursor/orchestration-runtime/\`
- CLI: \`npm run orchestration:global -- <subcomando>\`
- Instalar framework: \`npm run orchestration:install-global\` (uma vez por máquina)
- Novo projeto: \`npm run orchestration:global -- init\`

Docs: GLOBAL-INSTALL.md em ORCHESTRATION_HOME
`;

export function initProject(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const frameworkRoot = resolveFrameworkRoot(cwd);
  const configPath = join(cwd, DEFAULT_CONFIG_REL);
  const runtimeRoot = join(cwd, DEFAULT_RUNTIME_ROOT);
  const templatePath = join(frameworkRoot, "templates", "orchestration.config.json");

  if (existsSync(configPath) && !options.force) {
    throw new Error(`${configPath} já existe. Use --force para sobrescrever.`);
  }

  mkdirSync(dirname(configPath), { recursive: true });
  for (const dir of RUNTIME_DIRS) {
    const full = join(runtimeRoot, dir);
    mkdirSync(full, { recursive: true });
    const gitkeep = join(full, ".gitkeep");
    if (!existsSync(gitkeep)) writeFileSync(gitkeep, "");
  }

  let configBody;
  if (existsSync(templatePath)) {
    configBody = readFileSync(templatePath, "utf8").replace("{{PROJECT_NAME}}", basename(cwd));
  } else {
    configBody = JSON.stringify(
      {
        version: 1,
        project: { name: basename(cwd), issuePrefix: "ANX" },
        paths: {
          runtime: DEFAULT_RUNTIME_ROOT,
          dialogue: `${DEFAULT_RUNTIME_ROOT}/dialogue`,
          workflows: `${DEFAULT_RUNTIME_ROOT}/workflows`,
          autonomy: `${DEFAULT_RUNTIME_ROOT}/autonomy`,
          hire: `${DEFAULT_RUNTIME_ROOT}/hire`,
          proactive: `${DEFAULT_RUNTIME_ROOT}/proactive`,
          lifecycle: `${DEFAULT_RUNTIME_ROOT}/lifecycle`,
          state: `${DEFAULT_RUNTIME_ROOT}/state`,
        },
      },
      null,
      2,
    );
  }
  writeFileSync(configPath, `${configBody.trim()}\n`, "utf8");

  const rulesDir = join(cwd, ".cursor", "rules");
  mkdirSync(rulesDir, { recursive: true });
  const rulePath = join(rulesDir, "global-orchestration.mdc");
  const globalRuleSrc = join(frameworkRoot, "templates", "global-orchestration.mdc");
  if (existsSync(globalRuleSrc)) {
    copyFileSync(globalRuleSrc, rulePath);
  } else {
    writeFileSync(rulePath, RULE_TEMPLATE, "utf8");
  }

  return { projectRoot: cwd, frameworkRoot, configPath, runtimeRoot, rulePath };
}

export function printInitResult(result) {
  console.log("✅ Projeto inicializado para orquestração global\n");
  console.log(`   projeto:   ${result.projectRoot}`);
  console.log(`   framework: ${result.frameworkRoot}`);
  console.log(`   config:    ${result.configPath}`);
  console.log(`   runtime:   ${result.runtimeRoot}/`);
  console.log(`   regra:     ${result.rulePath}\n`);
  console.log("Próximos passos:");
  console.log("  1. npm run orchestration:install-global");
  console.log("  2. npm run orchestration:global -- compliance --help");
}
