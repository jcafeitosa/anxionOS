---
title: "P07 — Contrato de agentes persistentes, memória e evolução"
description: "Contrato de runtime para agentes, teammates, rotinas, skills, memória, conhecimento, autonomia e avaliação."
type: spec
status: draft
owner: "anxionOS"
issue: ANX-64
tags:
  - agents
  - orchestration
  - knowledge
  - memory
  - skills
  - autonomy
  - evaluation
  - human-takeover
---

# P07 — Contrato de agentes persistentes, memória e evolução

## 1. Objetivo e inspirações

O runtime deve suportar agentes persistentes, teammates especializados, rotinas agendadas, computador/ambiente isolado, colaboração e aprendizagem rastreável. As referências de produto são Paperclip, Dashi Taskboard, OpenClaw/GoClaw, Hermes, Grok Bot e OpenBot; elas inspiram capacidades, não autorizam copiar comportamento, permissões ou arquitetura.

O contrato fecha o domínio de agentes, orchestration, knowledge, memory, skills, evaluation e human takeover. Agentes operam por contratos institucionais e pelo mesmo application handler usado por humanos.

Esta versão permite apenas observação, análise, planejamento e efeitos SIMULATED/PAPER previamente autorizados. Não habilita capital real, execução live, autonomia L3/L4 ou autoexpansão de grants, orçamento, limites, provider ou modo.

## 2. Identidade e ciclo de vida

Um `Agent` possui identidade estável, tenant, agência, owner, propósito, papel, versão de configuração, modelo/provider, capabilities, budget, ambiente, policy epoch e estado:

`PROVISIONED → READY → RUNNING → WAITING_HUMAN_INPUT → PAUSED → DRAINING → STOPPED → RETIRED`.

A identidade não é o prompt. Cada execução (`AgentRun`) possui `runId`, agente, objetivo, trigger, parent run, correlation/causation, input references, policy snapshot, capability manifest hash, budget reservation, checkpoint e resultado.

Mudança de modelo, prompt-base, skills, policy, ferramentas, memória selecionada ou orçamento cria nova versão de execução. Um agente parado não pode continuar por lease antigo; fencing e epoch invalidam workers obsoletos.

## 3. Níveis de autonomia

| Nível | Pode fazer | Exige |
| --- | --- | --- |
| L0 — observar | ler contexto autorizado e produzir explicação | grant de leitura e auditoria |
| L1 — sugerir | criar plano, sinal, rascunho ou TradeIntent | schema, budget e revisão de saída |
| L2 — executar limitado | chamar ferramentas e SIMULATED/PAPER dentro do permit | risk, reservation, permit, idempotência e limites |
| L3 — coordenar | encadear ações e delegar agentes | ainda não habilitado; requer novo contrato e gates |
| L4 — operar adaptativamente | decidir e agir continuamente em escopo amplo | proibido nesta fase |

A transição de nível nunca é inferida por confiança, sucesso, conversa ou autoavaliação do agente. Exige mudança explícita de grant/policy, novo epoch, testes, revisão independente e aceite autorizado. Um agente não pode se promover.

## 4. Objetivos, rotinas e orçamento

Um `Objective` contém beneficiário, resultado observável, escopo, prioridade, deadline, critérios de sucesso, não-objetivos, risco aceitável, budget financeiro/computacional, approval policy e owner. Objetivos têm versão e podem ser pausados ou cancelados.

Rotinas são triggers declarativos: agenda, evento, webhook, taskboard, condição de mercado ou pedido humano. Cada disparo gera um `AgentRun` deduplicado; jitter, limite de frequência, cooldown e janela de execução previnem loops. Rotina não pode transformar uma chamada em autorização financeira.

O orçamento é reservado antes de chamada relevante. Tokens, tempo, chamadas, armazenamento e notional paper têm contadores versionados. Ao atingir limite, o agente pausa ou solicita humano; não troca modelo, provider, conta ou budget silenciosamente.

## 5. Teammates e delegação

Um `Team` contém agentes com papéis, autoridade, escopo, dependências e política de comunicação. Delegação gera `Delegation` com objetivo, input references, capability subset, budget, deadline, parent run, handoff contract e status.

O agente pai não transmite seus grants completos ao filho. O filho recebe o menor conjunto de capabilities necessário. Resultados são evidências versionadas, não instruções confiáveis por padrão. Conflito entre teammates exige decisão do orquestrador ou `WAITING_HUMAN_INPUT`; consenso textual não supera governance.

Handoff preserva contexto, estado, leases, artefatos, decisões, erros e pendências. Takeover humano congela ou revoga a ação concorrente e registra actor, motivo, ponto de retomada e diferença de autoridade.

## 6. Skills e ferramentas

Uma `Skill` é pacote versionado com descrição, entradas/saídas, pré-condições, efeitos, permissões, dependências, testes, custo, risco e owner. Instalação, atualização e remoção são eventos auditáveis. Skill não pode escrever fora de seu sandbox nem alterar seus próprios grants.

Cada ferramenta tem `ToolContract`:

- schema de entrada e saída;
- capability necessária;
- `effectClass` e modo;
- timeout, retry e política de UNKNOWN;
- idempotency key;
- limites de dados, custo e taxa;
- redaction e auditoria;
- condição de aprovação e cancelamento.

O runtime valida entrada e saída, bloqueia tool calls desconhecidas e trata conteúdo externo como não confiável. Agentes não recebem credenciais, Cypher arbitrário, acesso direto ao banco, shell irrestrito ou prompts de sistema de outros agentes.

## 7. Memória e conhecimento

Memória é separada em:

- `working memory`: contexto efêmero de uma execução;
- `episodic memory`: eventos e resultados de runs;
- `semantic memory`: fatos/projeções com fonte e validade;
- `procedural memory`: skills e playbooks aprovados;
- `institutional knowledge`: documentos governados e sua proveniência.

Cada item tem owner, tenant, classificação, origem, confiança, validade, retenção, consentimento, hash, versão e links de evidência. Memória não é verdade só por ter sido gerada pelo agente. Correções criam nova versão; não reescrevem o histórico autoritativo.

Retrieval aplica tenancy, purpose, ACL, freshness, budget e minimização. Conteúdo recuperado pode conter prompt injection e deve ser marcado como dado; não pode alterar policy ou instrução de sistema sem validação. Embeddings e caches não são autoridade sobre grants, capital, ledger ou identidade.

## 8. Planejamento e execução

O loop de um run é:

`TRIGGER → LOAD_POLICY → RETRIEVE_CONTEXT → PLAN → VALIDATE → REQUEST_APPROVAL/EXECUTE → OBSERVE → CHECKPOINT → REPORT`.

Cada etapa produz estado e evidência. Planejamento é distinto de execução. Antes de efeito, o runtime valida capability, schema, budget, environment, permit, epoch, fencing, idempotência e precondições. Falha bloqueia de forma explícita.

Um run não pode:

- mudar seu nível de autonomia;
- criar ou ampliar grant, budget, policy ou permit;
- trocar secret, provider, modelo ou conta sem aprovação;
- enviar ordem REAL/live;
- gravar diretamente em ledger ou grafo;
- esconder erro, apagar evidência ou marcar sucesso sem confirmação;
- repetir operação em UNKNOWN sem reconciliação.

## 9. Avaliação e aprendizagem

Toda avaliação referencia agente, versão, dataset/fixture, policy snapshot, ferramentas, seed/clock quando aplicável, critérios, judge, resultado e limitações. Métricas mínimas:

- correção factual e aderência a fontes;
- cumprimento de schema e capability;
- segurança e taxa de bypass;
- custo, latência e eficiência;
- qualidade do plano e decisão;
- taxa de intervenção humana;
- regressões por skill/modelo;
- impacto financeiro somente em SIMULATED/PAPER.

Aprendizagem propõe mudança; não publica automaticamente prompt, skill, memória, policy ou grant. A promoção exige revisão, comparação com baseline, regressão adversarial, aprovação do owner e nova versão. Feedback de usuário é evidência classificada, não autorização implícita.

## 10. Segurança e falhas

Estados de falha incluem `SCHEMA_INVALID`, `CAPABILITY_DENIED`, `POLICY_STALE`, `BUDGET_EXCEEDED`, `CONTEXT_UNTRUSTED`, `TOOL_TIMEOUT`, `UNKNOWN`, `LEASE_LOST` e `HUMAN_REQUIRED`.

Em timeout com possível efeito, o run fica `UNKNOWN` e reconcilia antes de retry. Kill switch pausa novas ações, revoga permits e sinaliza runs ativos. Circuit breaker impede tempestades. DLQ preserva evento e motivo; replay é idempotente e versionado.

## 11. Eventos principais

| Evento | Owner | Destino |
| --- | --- | --- |
| `AgentProvisioned/Versioned` | agents | governance, graph, audit |
| `AgentRunStarted/Checkpointed/Finished` | agents/orchestration | operations, evaluation, audit |
| `ObjectiveCreated/Changed` | orchestration | agents, taskboard, audit |
| `RoutineTriggered` | orchestration | agents, operations |
| `DelegationCreated/Completed` | orchestration | team, parent run, audit |
| `SkillInstalled/Promoted/Revoked` | knowledge/evolution | agents, governance |
| `MemoryWritten/Corrected/Expired` | knowledge/memory | audit, retrieval |
| `ToolCallRequested/Completed/Unknown` | agents/connections | reconciliation, audit |
| `HumanInputRequired/Provided` | agents | orchestration, audit |
| `EvaluationCompleted` | evaluation | evolution, governance |
| `AgentPaused/Resumed/Retired` | governance | agents, operations |

Todos os eventos usam envelope versionado, tenant, ownerDomain, eventId, aggregate, causalidade, correlation, checkpoint, timestamps e redaction. O journal/outbox do dono é autoritativo.

## 12. Paridade com humanos

Humano e agente usam os mesmos comandos, schemas, application handlers, policies, errors e auditoria. A diferença é identidade, grant, nível e UI. O console deve mostrar objetivo, plano, contexto usado, tools chamadas, custos, decisões, incertezas, fontes e próximo efeito.

Ações irreversíveis, ambíguas ou fora do nível permitido retornam `WAITING_HUMAN_INPUT`, com pergunta específica e opções limitadas. Aprovação humana é contextual, expira, é single-use quando aplicável e não pode ser reutilizada em outro intent.

## 13. Critérios e gates

- G0: roster de agentes, owners, crítico independente, capabilities, níveis, budgets, memória e riscos registrados.
- G1: testes de lifecycle, leases, budget, delegation subset, skill sandbox, retrieval ACL, injection, idempotência, UNKNOWN e takeover.
- G2: revisão de contratos, concorrência, persistência, boundaries e evolução.
- G3: E2E de objetivo → plano → aprovação → SIMULATED/PAPER → relatório e WAITING_HUMAN_INPUT.
- G4: Security testa tenant isolation, secret exposure, tool abuse, prompt injection, SSRF, sandbox escape e privilege escalation.
- G5: Red Team tenta autoelevação, grant laundering por teammate, replay, context poisoning, skill maliciosa e promoção PAPER→REAL em sandbox.
- G6: revalidar o conjunto integrado com a mesma revisão dos artefatos.
- G7: aceite explícito; L3/L4 e REAL continuam fora deste release.

## 14. Decisões pendentes

- catálogo inicial de papéis e agentes persistentes;
- modelo de scheduler e garantia de entrega de rotinas;
- retenção e classificação de cada tipo de memória;
- judge/evaluator e critérios de promoção de skills;
- limites iniciais de contexto, custo e duração;
- política de consentimento para dados externos e memória pessoal;
- formato de checkpoints e recuperação de runs.

L3, L4, capital real, execução live e autoevolução de autoridade não são decisões pendentes: permanecem proibidos.

## 15. Referências

- [Roadmap de execução](../execution-roadmap.md)
- [Contrato P05 de Connections](./p05-connections-binding-inference-contract.md)
- [Contrato P06 financeiro](./p06-financial-lifecycle-contract.md)
- [Contrato P08 operacional](./p08-operations-slos-recovery-contract.md)
