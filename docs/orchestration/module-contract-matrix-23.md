---
title: "Matriz de contratos dos 23 módulos"
description: "Cobertura mínima verificável de ownership, capacidades, eventos, erros, idempotência, oráculos e gates do backend modular."
type: spec
status: draft
owner: "anxionOS"
issue: ANX-68
tags:
  - contracts
  - modules
  - capabilities
  - eventing
  - roadmap
  - gates
---

# Matriz de contratos dos 23 módulos

## 1. Propósito

Esta matriz transforma o mapa de capacidades em backlog verificável. Ela não cria módulos vazios nem declara implementação. Cada linha é um contrato mínimo que deve ser refinado em schema, testes e adapter antes do gate de execução correspondente.

Os módulos são donos de estado e casos de uso. `packages/eventing` fornece transporte, mas não define regra de negócio. Comunicação cross-module usa contrato público ou evento versionado; nenhum módulo acessa repositório privado de outro.

## 2. Contrato comum obrigatório

Todo módulo deve declarar:

- `CapabilityManifest`: capability, owner, input/output schema, grant, modo, effect class, approval, budget, idempotência e auditoria;
- entidades e invariantes de domínio sem framework;
- comandos, eventos, erros tipados e versões;
- idempotency key, expected version, lease/checkpoint e comportamento UNKNOWN quando aplicável;
- owner de PostgreSQL/TimescaleDB/Neo4j/pgvector ou objeto externo;
- API, workers, adapters, graph projection e limites de dependência;
- oráculos de aceitação: testes determinísticos, contract tests, integração, E2E e observabilidade;
- gates, riscos residuais, decisões pendentes e critérios de rollback.

Estado autoritativo, journal e outbox são atômicos por domínio. Projeções são reconstruíveis. Secrets nunca aparecem em eventos, DTOs, prompts ou grafo.

## 3. Matriz

Reconciliação ANX-127: a lista e os owners seguem a [estrutura aceita, seção Responsabilidades que não podem se sobrepor](../../brain/notes/anxionos-backend-structure.md) e o [ADR0002 — organização modular](../../brain/project-docs/decisions/0002-adopt-modular-backend-layout.md). Esta matriz permanece draft; alinhamento de ownership não homologa schemas nem execução.

Inferência é capacidade de connections. Evolução é um fluxo entre governance (ChangeProposal/aprovação), simulation (cenário), evaluation (avaliação/certificação) e os donos que aplicam a mudança. Não são módulos adicionais. Permits devem distinguir aprovação institucional, autorização de risco e consumo/revalidação em execution; o contrato específico deve ser reconciliado, sem mover todos os permits para governance por conveniência. O kill switch pertence a risk.

Os antigos nomes de eventos/erros desta matriz eram exemplos conceituais, não inventário de schemas publicados. Para cada capacidade, ANX-127/ANX-132 devem registrar símbolo/caminho real, versão, envelope, erro, retry e teste; item sem essa evidência fica **não verificado**, não implicitamente atendido. A tabela abaixo não elimina essa obrigação.

| # | Módulo | Dono de estado e função | Capacidades mínimas | Idempotência/oráculo a verificar | Pacote baseline | Continuação no board |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | identity | Principal e sessão | Registrar, autenticar, revogar e recuperar acesso | principal/sessão + versão; revogação, MFA e tenancy | P02 | ANX-134 |
| 2 | organizations | Agency, Owner, membership e onboarding | Convites, equipes, ownership e mercados habilitados | tenant + recurso + versão; convites concorrentes e bootstrap | P02 | ANX-135 |
| 3 | governance | Grant, mandato, delegação, approval e authority epoch | Conceder/revogar autoridade e aprovar mudanças | scope + epoch + versão; revogação entre consulta e efeito | P02 | ANX-136/ANX-137 |
| 4 | graph | Controle de projeção/rebuild e grafo derivado | Traversals governados, contexto, linhagem e reconstrução | eventId + checkpoint + ownerDomain; replay e stale denial | P03 | ANX-138 |
| 5 | agents | Agent, AgentVersion, configuração e referências a skills | Versionar agente e oferecer fachada Brain; não possuir Run | agent + versão; grants, rollback e paridade de acesso | P04 | ANX-139/ANX-143/ANX-144 |
| 6 | orchestration | Goal, Task, Run, scheduler, lease e checkpoint do produto | Agendar, delegar, pausar, retomar e WAITING_HUMAN_INPUT | task/run + versão + fencing; cancelamento e retomada | P04 | ANX-140/ANX-133 |
| 7 | connections | Provider, conta, modelo/oferta, binding, quota e uso de inferência | Catálogo, inferência governada, routing explícito e reconciliação de uso | binding/request + reserva de quota; timeout, custo e redaction | P05 | ANX-141/ANX-129 |
| 8 | knowledge | Document, Memory, Evidence e ContextManifest | Ingestão, memória, retrieval autorizado e proveniência | hash + versão + ACL; revogação, poisoning e recall | P04 | ANX-142 |
| 9 | market-data | Instrumento, feed, observação e séries temporais | Histórico/realtime, qualidade, calendários e eventos de mercado | fonte + sequência + tempo; gaps, backfill e point-in-time | P06 | ANX-145/ANX-146 |
| 10 | strategies | StrategyVersion, backtest e Deployment | Versionar, processar backtest e aplicar deployment aprovado | versão + dataset + parâmetros; replay sem lookahead | P06 | ANX-147 |
| 11 | capital | Conta de capital, alocação e reserva | Reservar, consumir, liberar e reconciliar alocações | conta + moeda + reserva; concorrência e consumo parcial | P06 | ANX-148 |
| 12 | portfolios | Posição, lote, exposição, snapshot e valuation | Aplicar fatos confirmados e valorar posições | fill/action + versão; FX, stale e comparação com ledger | P06 | ANX-153 |
| 13 | decisions | Decision e TradeIntent | Explicar, versionar, aprovar e cancelar intenção | intent + payload + versão; validade e aprovação | P06 | ANX-149 |
| 14 | risk | RiskPolicy, RiskCheck, limites, risk epoch e kill switch | Checar risco e autorizar/revogar permit de risco conforme contrato | intent + estado de risco + epoch; limite e revogação concorrentes | P06 | ANX-150 |
| 15 | execution | ExecutionSession, Order, Fill e reconciliação de venue | Dispatch, cancelamento, fills e revalidação/consumo de permit | ordem + permit + fencing; UNKNOWN sem retry cego | P06 | ANX-151/ANX-163 |
| 16 | accounting | Ledger, lançamentos, taxas e ajustes financeiros | Postar, reverter e reconciliar saldos financeiros | evento fonte + entry; balanceamento e reversão imutável | P06 | ANX-152 |
| 17 | performance | P&L, retornos, métricas e atribuição derivadas | Calcular métricas sobre ledger e valuation | snapshot + versão; oráculos de P&L/FX/fees | P06 | ANX-154 |
| 18 | evaluation | Evaluation, Certification, Reputation e critérios de promoção | Avaliar/certificar candidato e detectar regressão | candidato + dataset + versão; regressão impede promoção | P08 | ANX-160/ANX-171 |
| 19 | simulation | Snapshot, SimulationRun e cenários isolados | Digital Twin, relógio simulado e replay de cenário | run + seed + input hash; isolamento e reprodução | P08 | ANX-159 |
| 20 | audit | Flight Recorder, manifests, linhagem e replay governado | Indexar evidências e reconstruir explicação sem novos efeitos | evento + digest; integridade, ACL e replay sem ordens | P06 | ANX-155 |
| 21 | billing | Assinatura/Invoice da plataforma e ciclo comercial | Faturar, reconciliar uso comercial e reverter cobrança | evento de uso/pagamento + período; webhook idempotente | P07 | ANX-156 |
| 22 | partners | Referral, Commission e Payout comercial | Atribuir indicação, calcular/reverter comissão e aprovar payout | invoice paga/revertida + regra; duplicata e isolamento | P07 | ANX-157 |
| 23 | operations | Incident, procedimentos, retenção, exportação e recuperação | Operar, recuperar e administrar dados sob governança | operação + scope + versão; restore e ações auditadas | P07 | ANX-158/ANX-169/ANX-170 |

## 4. Oráculos transversais

A prova de cada linha exige, conforme aplicável:

1. schema válido no boundary e erros tipados;
2. happy path e casos negativos;
3. repetição idempotente e payload conflitante;
4. concorrência com expected version, lease ou fencing;
5. isolamento tenant/ambiente/conta;
6. evento, journal/outbox e projeção verificáveis;
7. timeout e UNKNOWN sem retry cego;
8. shutdown, checkpoint, replay e reconstrução;
9. observabilidade com trace/correlation e redaction;
10. documentação do risco residual e do rollback.

Para P06, o fluxo integrado mínimo é market-data → strategies → decisions → risk → capital (reserva) → execution (revalidação/consumo de permit e adapter simulado) → accounting → portfolios → performance, com reconciliação de venue em execution e financeira em accounting. Simulation fornece cenários/relógio isolado, não substitui o dono institucional de Order/Fill. Stocks, cripto e carteira combinada exigem evidência SIMULATED/PAPER na ANX-163.

## 5. Dependências e backlog

A sequência abaixo reproduz os pacotes da [estrutura aceita](../../brain/notes/anxionos-backend-structure.md); os prefixos de fase em documentos anteriores não redefinem ownership nem dispensam o [SDD institucional](../../brain/project-docs/specs/001-institutional-contract/spec.md):

- P01/P02: tooling/boundaries, contracts, eventing, database, secrets, observability, identity, organizations e governance;
- P03: graph e projeções reconstruíveis;
- P04: agents, orchestration e knowledge;
- P05: connections e inferência governada;
- P06: market-data, strategies, capital, portfolios, decisions, risk, execution, accounting, performance e audit;
- P07: billing, partners, operations e experiências humanas;
- P08: evaluation, simulation e workflows avançados;
- P09: recovery, benchmarks e lançamento conforme evidências e autorização.

O Dashi local gerencia o desenvolvimento; seu claim não é o estado de Task/Run do produto. As dependências executáveis são as relações do programa ANX-126. Planos de gates por slice continuam obrigatórios; revisar o programa não aprova automaticamente seus filhos.

Cada linha sem schema, owner, oráculo ou issue ativa é backlog, não readiness. Não scaffoldar os 23 módulos vazios.

## 6. Gates da matriz

- G0: linha, owner, issue, crítico, dependências e não-escopo registrados.
- G1: contrato e testes proporcionais escritos; nenhum TODO ambíguo.
- G2: revisão de ownership, boundary, concorrência, persistência e migração.
- G3: integração/E2E conforme o oráculo da linha.
- G4: Security avalia tenancy, secrets, capability e isolamento.
- G5: Red Team testa replay, bypass, confused deputy, injection e corrida em sandbox.
- G6: integração revalidada no mesmo candidato.
- G7: aceite explícito; documentação não equivale a PASS.

REAL/live, capital real e autonomia L3/L4 não estão autorizados para ativação. O planejamento futuro permanece rastreado em ANX-172/ANX-173, condicionado a evidências e autorização separada; autoexpansão de autoridade continua proibida. Criar backlog não concede capacidade de execução.

## 6.1. Pendências de reconciliação ANX-127

A correção de owners acima é incremental. Continuam pendentes: inventário completo de cada capacidade dos R09/R10 contra símbolos/schemas/testes atuais; atualização da fila e roadmap A5; decisão de posicionamento do adapter-gateway sem criar um 24º dono por inferência; e pareceres independentes G1–G7 aplicáveis. Não declarar ANX-127 concluída apenas por corrigir esta tabela. A [auditoria ANX-118](../../brain/notes/anxionos-backend-conformance-2026-09-08.md) é fonte de achados a revalidar, não prova de ausência atual.

## 7. Referências

- [Mapa de capacidades](./system-capabilities/CAPABILITY-MAP.md)
- [Checklist estrutural](./system-capabilities/MODULE-STRUCTURE-CHECKLIST.md)
- [Roadmap de execução](./execution-roadmap.md)
- [Pacote de evidências G0-G7](./gate-evidence-handoff-acceptance-contract.md)
- [Contrato P05 Connections](./system-capabilities/p05-connections-binding-inference-contract.md)
- [Contrato P06 financeiro](./system-capabilities/p06-financial-lifecycle-contract.md)
- [Contrato P07 agentes](./system-capabilities/p07-agents-memory-evolution-contract.md)
- [Contrato P08 operacional](./system-capabilities/p08-operations-slos-recovery-contract.md)
