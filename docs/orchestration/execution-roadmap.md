---
title: Roadmap executável do anxionOS
description: Plano integrado de execução para fechar as lacunas dos 23 módulos, com dependências, critérios verificáveis, decisões pendentes e gates de prontidão.
type: plan
status: draft
owner: Produto e engenharia
issue: ANX-45
tags:
  - roadmap
  - modules
  - readiness
  - agents
  - investment
---
# Roadmap executável do anxionOS

**Origem:** ANX-45 · **Programa de continuação:** ANX-126 · **Reconciliação:** ANX-127  
**Status:** draft; backlog criado, implementação e gates ainda dependem de evidência  
**Base:** [mapa de capacidades dos 23 módulos](./system-capabilities/CAPABILITY-MAP.md), [matriz de contratos dos 23 módulos](./module-contract-matrix-23.md), [backlog P01/P02](./system-capabilities/p01-p02-backlog.md), [contratos e gates](./system-capabilities/p01-p02-contracts-and-gates.md), [pacote de evidências G0-G7](./gate-evidence-handoff-acceptance-contract.md) e [fila de módulos](./module-queue.md).

**Contrato W4/P06:** [ciclo financeiro SIMULATED/PAPER](./system-capabilities/p06-financial-lifecycle-contract.md) (ANX-58).

**Contrato W3/P05:** [Connections, binding e inferência governada](./system-capabilities/p05-connections-binding-inference-contract.md) (ANX-62).

**Contrato operacional (título histórico P08; escopo W6/W8):** [operação 24/7, SLOs e recovery](./system-capabilities/p08-operations-slos-recovery-contract.md) (ANX-63).

**Contrato de agentes (título histórico P07; escopo W2/W5):** [agentes persistentes, memória e evolução](./system-capabilities/p07-agents-memory-evolution-contract.md) (ANX-64).

**Contrato de evolução (escopo W5/W6, sem bloco W9):** [evolução institucional e rollback](./p09-evolution-rollback-contract.md) (ANX-70).
**Controle de execução:** [matriz de prontidão e gates](./gate-readiness-matrix.md) (ANX-54).

## Objetivo operacional

Transformar a meta-revisão em uma sequência executável que produza, para cada módulo, contratos verificáveis, comportamento funcional, evidência de segurança, operação observável e integração com os demais domínios. O plano não autoriza capital real, execução live ou autonomia L3/L4.

A unidade de entrega é um **pacote de capacidade**: módulo proprietário + contratos + eventos + persistência + projeções + API/SDK + workers + testes + observabilidade + handoff de gates.

## Estado de partida

- O mapa funcional cobre 23 módulos e as jornadas humano/agente.
- A fundação P01/P02 está decomposta em P02-01 a P02-10.
- Os 23 módulos possuem planos/debates e evidência inicial parcial na matriz reconciliada ANX-127. Isso não comprova implementação completa; cada continuação deve confrontar R09/R10, símbolos, schemas e testes. O programa ANX-126 contém ANX-127–186, sem reabrir automaticamente slices históricos aceitos.
- A existência de documentação ou código parcial não equivale a G0, G1, readiness ou autorização de produção.
- Os contratos de ambiente `SIMULATED`, `PAPER` e `REAL` são normativos, mas `REAL` permanece bloqueado.

## Blocos de trabalho

| Bloco | Módulos/componentes | Entrega verificável | Entrada | Saída / dependências |
| --- | --- | --- | --- | --- |
| W0 — Fundação institucional | contracts, eventing, database, secrets, observability, sdk, identity, organizations, governance | Envelope, CapabilityManifest, tenancy, grants, epochs, leases, audit policy e erros versionados | Baseline estrutural | Habilita W1–W4; ANX-27–31, ANX-47–52 |
| W1 — Grafo governado | graph | Projeções reconstruíveis, checkpoints, traversals registradas, explainability e autorização derivada | W0 | Habilita W2; ANX-32–34 |
| W2 — Runtime de agentes | agents, orchestration, knowledge | AgentVersion, skills, goals/tasks/runs, heartbeats, memória/evidência, checkpoints e `WAITING_HUMAN_INPUT` | W0 + W1 | Habilita W3 e avaliação; sem L3/L4 |
| W3 — Providers e inferência | connections | Binding por conta/provider, quotas, cooldown, secrets isolados, fallback explícito e custo auditado | W0 + W2 | Habilita inferência governada; depende P05 |
| W4 — Núcleo financeiro paper | market-data, strategies, decisions, risk, capital, execution, accounting, portfolios, performance | Fluxo integrado market data → estratégia → intent → risco → reserva → execução simulada → ledger → posição → P&L → reconciliação | W0 + W1 | Habilita W5; somente SIMULATED/PAPER |
| W5 — Simulação e avaliação | simulation, evaluation | Digital Twin, replay, cenários, diff, custos, certificação e promoção controlada de Strategy/AgentVersion | W2 + W4 | Evidência para mudanças; não habilita REAL |
| W6 — Auditoria e operação | audit, operations | Flight Recorder, linhagem, incidentes, procedures, retenção, export, recovery, SLO/RPO/RTO e restore testado | W0–W5 | Habilita operação contínua controlada |
| W7 — Superfícies comerciais | billing, partners | Subscription, invoice, quotas comerciais, referral, comissão e payout auditáveis | W0 + organizations | Consoles Owner/Partner; sem afetar autoridade financeira |
| W8 — Consoles e readiness | apps/api, Owner/Operator/Platform/Partner, integração E2E | Paridade de handlers, UX de approval/takeover, dashboards, alertas, runbooks e relatório de prontidão | W0–W7 | Candidato a G2–G7 |

## Mapeamento da continuação

Os blocos W organizam frentes de trabalho; não renumeram P01–P09 do baseline. P04 contém agents/orchestration/knowledge; P05 connections; P06 financeiro/audit; P07 billing/partners/operations/consoles; P08 evaluation/simulation; P09 recovery/benchmarks/release. Títulos antigos de contratos são preservados, sem redefinir ownership.

| Bloco | Continuação rastreável |
| --- | --- |
| W0 | ANX-127–137 |
| W1 | ANX-138 |
| W2 | ANX-139/140/142/143/144 |
| W3 | ANX-141 |
| W4 | ANX-145–154 e ANX-163 |
| W5 | ANX-159/160/171 |
| W6 | ANX-155/158/169/170 |
| W7 | ANX-156/157 |
| W8 | ANX-164–168 e ANX-181–186 |
| Integrações transversais | ANX-161/162 e ANX-174–180 |

O diagrama W abaixo é conceitual, não scheduler: relações do board prevalecem para despacho. Em particular, knowledge pode depender da inferência de connections mesmo pertencendo a P04; evitar ciclo artificial “todo W2 antes de W3”. Planejamento antecipado não dispensa os gates do slice. Cada executor deve ter crítico nominal antes de G1; ANX-181 organiza o processo, não autoriza desenvolver sem crítico enquanto aguarda.

## Ordem executável

### Fase A — Contratos e autoridade

Consultar ANX-27–31 e ANX-47–52 como histórico do [backlog P01/P02](./system-capabilities/p01-p02-backlog.md); executar somente o delta autorizado nas ANX-127–137 conforme dependências do board. O resultado mínimo é um contrato que permita rejeitar mensagens inválidas, intents stale, permits reutilizados, escopos indevidos, modos incompatíveis e efeitos externos sem aprovação.

### Fase B — Grafo e projeções

Revalidar ANX-32–35 como histórico; a continuação do Graph Kernel está em ANX-138, respeitando ANX-130/136. Cada evento deve ser projetável de forma idempotente, com `eventId`, checkpoint e `ownerDomain`; rebuild de uma projeção deve produzir o mesmo estado derivado. Traversals são planos registrados; agente não escreve Cypher livre.

### Fase C — Agentes, orchestration e knowledge

Antes de expor uma tool, publicar CapabilityManifest, grant mínimo, effect class, política de aprovação e política de memória. Runs precisam ser retomáveis após restart, pausa, revogação, quota ou `WAITING_HUMAN_INPUT`. O agente pode propor e explicar; o handler institucional decide.

### Fase D — Fluxo financeiro SIMULATED/PAPER

Implementar o fluxo completo com contas, reservas, fills parciais, taxas, slippage, liquidez, latência, rejeições, corporate actions, funding e valuation conforme a classe de ativo. Stocks e cripto compartilham contratos, mas não compartilham silenciosamente contas, custody, settlement, ledger, adapter, calendário ou kill switch.

### Fase E — Evidência de evolução

Simulation e evaluation devem registrar dataset, snapshot, versão de estratégia/agente, parâmetros, custos, hipóteses, resultado, limitações e aprovação. Promoção de versão é uma mudança governada, nunca um efeito implícito de um score.

### Fase F — Operação e prontidão

Operations e audit devem provar observabilidade, incident response, replay governado, retenção, exportação, restore e reconciliação. O candidato integrado precisa de evidência dos gates G2, G3, G4 e G5 antes de qualquer aceite G7.

## Critérios de entrega por capacidade

G0 exige escopo, fontes, owner, dependências, crítico e oráculos definidos; não equivale a implementação concluída. A lista abaixo é verificada progressivamente em G1–G6 e submetida a G7. `g0_ready` é classificação documental histórica, não status do Dashi nem sinônimo de Definition of Done:

- [ ] ownership de estado, journal e outbox;
- [ ] entidades, invariantes, policies, ports e erros;
- [ ] comandos, queries e workflows retomáveis;
- [ ] eventos emitidos/consumidos com schema, versão e idempotência;
- [ ] CapabilityManifest para toda capacidade exposta a agente;
- [ ] persistência e migrações sob o módulo proprietário;
- [ ] projeção de grafo ou justificativa de não aplicabilidade;
- [ ] API fina, SDK/tool adapter e paridade com o application handler;
- [ ] worker, lease, shutdown e reconciliação quando aplicável;
- [ ] testes de contrato, módulo, integração, negativos e concorrência aplicáveis;
- [ ] redaction, tenancy, grants, epochs e secrets revisados;
- [ ] métricas, logs estruturados, traces, alertas e runbook;
- [ ] evidência anexada à issue e parecer independente do crítico.

## Dependências críticas

```text
W0 → W1 → W2 → W3
W0 → W4 → W5
W2 + W4 → W5
W0..W5 → W6
W0 + organizations → W7
W0..W7 → W8 → G2/G3/G4/G5 → G6 → G7
```

A única exceção é análise documental preliminar em paralelo; nenhum trabalho pode quebrar a ordem de contratos, autoridade e evidência.

## Decisões pendentes

| Decisão | Dono sugerido | Bloqueia |
| --- | --- | --- |
| Taxonomia final de `effectClass` e aprovações | governance + risk | W2, W4 |
| Compatibilidade/depreciação de schemas | contracts | W1–W4 |
| Lease, fencing, retry, DLQ e shutdown | eventing + operations | W1–W4 |
| Fonte, qualidade e calendário de market data | market-data + simulation | W4–W5 |
| Valuation, FX, settlement e corporate actions | accounting + portfolios | W4 |
| Modelo de custos, quotas e fallback de providers | connections + billing | W3, W7 |
| Critérios objetivos para autonomia L0–L4 | governance + evaluation | W2, W5, readiness |
| SLO, RPO, RTO, retenção e exportação | operations + audit | W6, W8 |
| Evidência mínima para qualquer REAL futuro | risk + governance + operations | qualquer habilitação REAL |

## Gates de liberação

- **G0:** issue, ownership, escopo, dependências, crítico e critérios definidos.
- **G1:** implementação/documentação do pacote revisada pelo crítico independente.
- **G2:** contratos, arquitetura, concorrência, migração e manutenção revisados.
- **G3:** comportamento funcional, negativos, integração, regressão e E2E executados.
- **G4:** tenancy, autorização, secrets, dependências e fronteiras de confiança revisados.
- **G5:** cenários adversariais autorizados em fixture/sandbox, incluindo prompt injection e corrida de revogação.
- **G6:** candidato integrado revalidado; evidências antigas não são reaproveitadas automaticamente.
- **G7:** aceite explícito do usuário/revisor autorizado.

## Restrições de release

Até que todos os gates aplicáveis tenham evidência, ficam proibidos:

- capital real, ordens live e credenciais de produção;
- autonomia L3/L4;
- retry cego em estado `UNKNOWN`;
- autoexpansão de grants, orçamento ou políticas;
- Cypher ou credenciais Neo4j para agentes;
- fallback silencioso de provider, modelo, conta ou ambiente;
- declarar 24/7, readiness ou segurança apenas por demo, documentação ou testes unitários.
