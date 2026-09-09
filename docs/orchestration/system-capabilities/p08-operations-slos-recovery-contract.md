---
title: "P08 — Contrato de operação 24/7, SLOs e recovery"
description: "Contrato operacional para observabilidade, continuidade, incidentes, readiness e consoles institucionais."
type: spec
status: draft
owner: "anxionOS"
issue: ANX-63
tags:
  - operations
  - observability
  - slo
  - recovery
  - readiness
  - consoles
  - governance
---

# P08 — Contrato de operação 24/7, SLOs e recovery

## 1. Objetivo

Este contrato define as condições para operar continuamente em SIMULATED/PAPER com segurança observável. Ele não declara prontidão, não habilita capital real e não substitui os gates G0–G7. Toda métrica deve ter fonte, janela, owner, limitação e ação associada.

## 2. Sinais, rastreabilidade e ownership

Cada request, command, evento, job, decisão, ordem simulada, fill, lançamento e reconciliação carrega `tenantId`, `traceId`, `correlationId`, `causationId`, `aggregateId`, `eventId`, versão de schema e modo. Logs estruturados são redacted e correlacionáveis; métricas não incluem segredos ou payloads sensíveis; traces respeitam classificação de dados.

| Sinal | Owner | Ação inicial |
| --- | --- | --- |
| disponibilidade da API e consoles | apps/operations | investigação e failover autorizado |
| atraso de outbox/inbox | eventing/workers | pausar consumidores afetados e reprocessar por checkpoint |
| erro de schema ou contrato | contracts/owner domain | quarantine, não retry cego |
| stale permit/epoch | governance | revogar cache e exigir nova avaliação |
| divergência de ledger/posição | accounting (financeira), execution (venue), portfolios (projeção) | dono do estado abre/trata caso por contrato; bloquear efeitos dependentes e preservar evidência em audit |
| atraso/qualidade de market data | market-data/connections | degradar para leitura segura ou pausar |
| custo/latência de inferência | connections | aplicar budget e policy, sem fallback silencioso; knowledge consome o serviço autorizado |
| pool, fila ou storage saturado | platform/operations | backpressure, scale autorizado ou shutdown controlado |

## 3. SLO/SLI

Os valores iniciais devem ser aprovados pelo owner e medidos antes de se tornarem compromisso. A ficha de cada SLO contém indicador, fórmula, janela, exclusões, orçamento de erro, destino de alerta e runbook.

SLIs mínimos:

- disponibilidade por endpoint e por tenant;
- latência p50/p95/p99 por operação;
- idade máxima de eventos não processados;
- taxa de erro por código tipado;
- percentual de comandos idempotentes repetidos;
- tempo de resolução de UNKNOWN e reconciliação;
- divergência entre ledger, posição e valuation;
- frescor e qualidade de market data;
- utilização e custo por modelo/provider;
- sucesso de backup, restore e replay.

Não há “99,9%” presumido: o SLO só pode ser afirmado após evidência de carga, janela representativa e limites documentados.

## 4. Estados operacionais

O ambiente possui estados explícitos:

`STARTING → HEALTHY → DEGRADED → PAUSED → DRAINING → STOPPED → RECOVERING → HEALTHY`

- `DEGRADED`: somente capacidades cujo risco e qualidade permanecem aceitáveis.
- `PAUSED`: bloqueia novos efeitos; permite leitura, diagnóstico e reconciliação.
- `DRAINING`: não aceita novo trabalho e finaliza ou marca jobs conforme checkpoint.
- `STOPPED`: sem workers ativos; evidência preservada.
- `RECOVERING`: reconstitui schema, checkpoints, outbox/inbox, projections e casos pendentes antes de retomar.

Transições exigem causa, actor, policy, timestamp, autorização e auditoria. Kill switch é fail-closed, revoga novos permits e não apaga ordens, fills ou ledger.

## 5. Shutdown, leases e checkpoints

Workers devem:

1. parar de aceitar novos jobs;
2. renovar ou liberar leases de forma explícita;
3. confirmar a transição de domínio, journal e inserção no outbox na mesma transação PostgreSQL do dono; o checkpoint não pode avançar além desse commit (se persistido separadamente, pode atrasar, nunca antecipar o progresso durável);
4. publicar/drenar pelo relay apenas registros do outbox já confirmados; entrega/ack no transporte não fazem parte do commit do domínio e permitem repetição idempotente;
5. preservar dispatch e marcar resultado externo ambíguo como UNKNOWN conforme o protocolo do dono; reconciliar antes de novo efeito, sem prometer atomicidade entre PostgreSQL e adapter externo;
6. fechar conexões e registrar o estado de saída pelo caminho auditável.

Esta sequência aplica a atomicidade do [ADR0004 — Consistência e fronteiras preservadas](../../../brain/project-docs/decisions/0004-postgresql-timescaledb-pgvector.md). Lease expirado não autoriza commit tardio. Fencing token e versão esperada impedem worker antigo de confirmar transições. Reprocessamento começa no último checkpoint confirmado e é idempotente; não usa timeout como prova de sucesso.

**Oráculo de implementação — ANX-130/133/158/169:** interromper antes do commit, depois do commit e antes do ack/publicação, e entre commit e checkpoint separado. Verificar que nenhum checkpoint salta estado+journal+outbox não duráveis, que registros confirmados são republicáveis sem duplicar efeitos e que resultado externo UNKNOWN exige reconciliação. Esses testes ficam nas tarefas de implementação; a revisão deste contrato não declara que foram executados.

## 6. Backup, restore e reconstrução

PostgreSQL, TimescaleDB, Neo4j, objetos de replay e configurações de policy têm retenção, criptografia, owner e teste de restauração. O plano deve declarar:

- RPO por classe de dado;
- RTO por serviço e modo;
- ordem de restore;
- validação de schema e integridade;
- reconstrução do grafo a partir de eventos;
- replay de outbox/inbox;
- tratamento de eventos duplicados ou ausentes;
- evidência e aprovação para retomar.

Restore é executado em ambiente isolado. Nunca restaurar fixture sobre produção nem considerar backup existente como prova de restore.

## 7. Incident response

Incidente tem severidade, detecção, impacto, escopo, commander, owner técnico, timeline, evidências, contenção, recuperação, causa contribuinte e ações verificáveis. Runbooks mínimos:

- perda ou atraso de eventing;
- provider indisponível;
- market data inválido;
- divergência de ledger;
- ordem/fill UNKNOWN;
- vazamento ou suspeita de secret;
- epoch/grant revogado;
- saturação de pool/fila;
- falha de restore;
- prompt injection ou agente fora de capability.

Durante incidente, prevalecem pausa, isolamento e preservação de evidência. Mudança emergencial exige break-glass com TTL e revisão posterior.

## 8. Consoles e papéis

| Console | Pode ver | Pode fazer |
| --- | --- | --- |
| Owner | sua agência, risco, capital paper, agentes e auditoria | aprovar políticas dentro do grant e solicitar ações |
| Operator | saúde, filas, jobs, reconciliação e incidentes delegados | pausar, drenar, reprocessar e escalar dentro do grant |
| Platform | tenants, capacity, providers, SLOs, custos e recovery | operar infraestrutura sem ler payload financeiro desnecessário |
| Partner | referrals, comissões, reversões e status de payout do seu escopo comercial | solicitar ações comerciais autorizadas; não recebe administração de feeds/connections por ser parceiro |

O backend é a autoridade de autorização; o console não esconde estados de risco nem cria uma trilha paralela. Agente e humano usam os mesmos handlers, erros e permits. Takeover humano preserva contexto e revoga a ação concorrente quando necessário.

## 9. Readiness

Readiness é uma matriz de evidências por ambiente e modo, não um booleano baseado em demo. Cada item registra requisito, comando/cenário, resultado, data, revisão, owner e limitação.

Categorias obrigatórias:

- contratos, migrações e compatibilidade;
- tenancy, RLS e autorização;
- eventing, retry, DLQ e UNKNOWN;
- observabilidade e alertas;
- carga, backpressure e limites;
- backup/restore/replay;
- segurança, secrets e isolamento;
- fluxos SIMULATED/PAPER de stocks, cripto e multi-asset;
- consoles e takeover;
- incidentes e rollback;
- custos e retenção;
- gates independentes G2, G3, G4 e G5.

Qualquer requisito sem evidência, ferramenta indisponível, timeout ou achado alto/crítico mantém o item pendente ou bloqueado. “NOT_APPLICABLE” exige justificativa verificável e aprovação do owner do gate.

## 10. Critérios dos gates

- G0: contrato, ownership, dependências, limites e críticos registrados.
- G1: cenários controlados de shutdown, lease, replay, degradação, alerta e recovery preparados.
- G2: revisar concorrência, persistência, schemas, manutenção e migrações.
- G3: executar E2E e falhas em ambiente isolado, incluindo operação contínua simulada.
- G4: verificar tenancy, redaction, secrets, isolamento, SSRF, autorização e retenção.
- G5: testar bypass de papel, replay, perda de checkpoint, provider confusion, flood e takeover em sandbox.
- G6: revalidar o candidato integrado e a evidência da mesma revisão.
- G7: aceite explícito; deploy ou REAL exigem escopo e autorização adicionais.

## 11. Decisões pendentes

- SLO/SLA por plano, tenant e modo;
- RPO/RTO por domínio e retenção de artefatos;
- ferramenta de alerting e escalonamento;
- limites de carga e política de backpressure;
- frequência mínima de restore drill;
- matriz final de permissões dos quatro consoles;
- orçamento operacional e política de custo de inferência.

REAL/live, capital real e autonomia L3/L4 continuam fora do escopo.

## Continuação e limites de evidência — ANX-127

O título P08 é histórico: operations/comercial/consoles pertencem a P07 e provas de recovery/readiness avançam em P09 conforme baseline. Reconciliação do ownership: inferência pertence a connections; parceiro comercial não equivale a administrador de provider/feed.

ANX-169 cobre restore/RPO/RTO; ANX-170 cobre carga/SLO/custos; ANX-158 os workflows operacionais. Na inspeção de nomes de arquivos em backend/deploy e backend/tests, a busca restore/backup/recovery/load/slo/benchmark retornou apenas graph/integration/load-test-app.ts. Isso **não prova ausência global** de scripts equivalentes nem restore executado: inventariar também automações/artefatos autorizados e recuperar evidências do ambiente antes de implementar.

Não preencher números de RPO/RTO/SLO sem decisão e medição. Os próximos executores devem registrar objetivo aprovado e resultado medido separadamente, janela, dataset, volume, hardware, dependências, revisão e limites do teste. Restore drill exige destino isolado e autorização de retomada, não apenas sucesso de comandos.

## 12. Referências

- [Roadmap de execução](../execution-roadmap.md)
- [Matriz de prontidão dos gates](../gate-readiness-matrix.md)
- [Contrato P05 de Connections](./p05-connections-binding-inference-contract.md)
- [Contrato P06 do ciclo financeiro](./p06-financial-lifecycle-contract.md)
