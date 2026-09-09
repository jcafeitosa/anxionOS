# Bootstrap — orquestração em novo repositório

## 1. Instalar framework global (uma vez por máquina)

```bash
npm run orchestration:install-global
```

Opcional — PATH em `~/.zshrc`:

```bash
export ORCHESTRATION_HOME="$HOME/.cursor/orchestration"
export PATH="$ORCHESTRATION_HOME/bin:$PATH"
```

## 2. Inicializar projeto

```bash
cd /caminho/do/seu-projeto
npm run orchestration:global -- init
```

Cria `.cursor/orchestration.config.json`, diretórios de runtime e `.cursor/rules/global-orchestration.mdc`.

## 3. Personas (opcional)

```bash
cp ~/.cursor/orchestration/templates/personas.template.json .cursor/orchestration-runtime/personas.local.json
```

Atualize `personasFile` no config.

## 4. Scripts npm no projeto

Adicione ao `package.json`:

```json
"orchestration:global": "node path/to/orchestration-global.mjs",
"orchestration:install-global": "node path/to/install-orchestration-global.mjs"
```

Ou use `orchestration` direto com PATH.

## 5. Tooling G0.14

Incluir [TOOLING-INTEGRATION.md](../TOOLING-INTEGRATION.md) e regra `tooling-mandatory.mdc` na instância.

## 6. Taskboard + AGENTS.md + SCOPE

Configure taskboard local, `AGENTS.md` e revise `SCOPE.md` na instância.

## 7. Verificar

```bash
npm run orchestration:global -- compliance --help
```

**Padrão Karpathy:** uma cópia global · config fina por projeto.

Ver [GLOBAL-INSTALL.md](../GLOBAL-INSTALL.md) · [AGNOSTIC-DESIGN.md](../AGNOSTIC-DESIGN.md).
