---
title: "P09 — Contrato de evolução institucional e rollback"
description: "Contrato de mudança segura para agentes, estratégias, skills, modelos e policies."
type: spec
status: draft
owner: "anxionOS"
issue: ANX-70
tags:
  - evolution
  - promotion
  - rollback
  - evaluation
  - governance
  - agents
  - strategies
---

# P09 — Contrato de evolução institucional e rollback

## 1. Objetivo

Evolução é o processo governado de propor, avaliar, promover, observar e eventualmente reverter uma versão de agente, estratégia, skill, modelo, prompt, policy, schema ou adapter. O sistema aprende com evidências, mas nenhuma aprendizagem altera autoridade, budget, modo ou grants automaticamente.

A evolução ocorre apenas em SIMULATED/PAPER nesta fase. REAL/live, capital real, L3/L4 e autoelevação de autoridade estão fora do contrato.

## 2. ChangeProposal

Toda mudança começa como `ChangeProposal` imutável:

- `proposalId`, tipo, owner, beneficiário e objetivo observável;
- versão atual e versão candidata, hashes e artefatos;
- escopo, não-escopo, dependências e plano de migração;
- dataset/fixture, seed/clock, baseline e critérios de sucesso;
- risco, impacto, budget, rollback e condição de parada;
- capabilities/policies afetadas e análise de autoridade;
- aprovadores exigidos, status e evidências.

Estados:

`DRAFT → EVALUATING → REVIEW_REQUIRED → APPROVED → CANARY → PROMOTED`

com saídas `REJECTED`, `PAUSED`, `ROLLED_BACK` e `ABANDONED`. Promoção não altera a versão anterior nem apaga histórico.

## 3. Tipos de mudança

| Tipo | Exemplo | Controle mínimo |
| --- | --- | --- |
| conteúdo | prompt, regra, knowledge ou skill | diff, provenance, injection/regression tests |
| comportamento | agente, estratégia ou algoritmo | baseline, replay e avaliação comparativa |
| modelo/provider | versão, parâmetros ou provider | capability/quality/cost review, sem fallback silencioso |
| policy | limite, aprovação ou retenção | governance review, epoch bump e aprovação explícita |
| schema | evento, entidade ou API | compatibilidade, migração e replay |
| infraestrutura | adapter, runtime ou storage | failure tests, rollback e observabilidade |

Alteração de grant, authority epoch, modo, segredo, conta ou limite de capital não é uma evolução automática; é mudança de governança com novo escopo e aprovação específica.

## 4. Avaliação

A candidata é comparada à baseline em fixtures versionadas e, quando aplicável, replay histórico. O relatório registra:

- correção, consistência e aderência a fontes;
- cumprimento de schemas e capabilities;
- segurança, tenancy, prompt injection e privilege boundaries;
- custo, latência, consumo de budget e estabilidade;
- taxa de intervenção e `WAITING_HUMAN_INPUT`;
- comportamento em partial fills, UNKNOWN e reconciliação paper;
- regressões por agente, estratégia, ativo e modo;
- incerteza, cobertura e limitações do experimento.

Resultado inconclusivo não aprova promoção. Alteração de dataset, judge, seed, relógio ou ambiente cria avaliação distinta; não se compara como se fosse a mesma execução.

## 5. Aprovação independente

O autor não aprova sozinho a própria mudança. O pacote deve passar, proporcionalmente ao risco, por:

1. crítico do executor;
2. Code Review;
3. QA;
4. Security;
5. Red Team;
6. integração;
7. aceite do responsável autorizado.

Cada parecer referencia o mesmo candidate digest e pode ser `PASS`, `CHANGES_REQUIRED`, `BLOCKED` ou `NOT_APPLICABLE` justificadamente. Qualquer mudança material invalida pareceres afetados.

## 6. Canary e promoção

Canary é executado em sandbox segregado com subset explícito de tenants, instrumentos, agentes, tarefas e budget. O candidate e baseline são observáveis separadamente. Não há tráfego real nem herança de secrets.

A promoção exige:

- critérios de sucesso satisfeitos;
- nenhum achado crítico/alto aberto;
- error budget e custos dentro do limite;
- métricas sem regressão não explicada;
- rollback ensaiado;
- owner e aprovador identificados;
- epoch/versão publicada;
- plano de observação e condição de parada.

O runtime pode pausar canary por threshold, mas não promover por conta própria. A promoção publica uma versão imutável e registra o predecessor.

### 6.1. Reconciliação strategies: publicação, backtest e promoção — ANX-127

Fontes: [strategies R04](./structure-debate/strategies/R04-contracts-events.md) distingue published, backtest requested/completed e certification; [R08 D-ST-001/003](./structure-debate/strategies/R08-decision-log.md) mantém StrategyVersion/Deployment em strategies e menciona promoção via evento de evaluation. R09 S2 exige lifecycle válido; este contrato §§4–6/10 exige avaliação, aprovação independente e aplicação pelo dono da versão. O baseline aceito ADR0002 mantém cada domínio como dono de seu estado. Os registros de debate não autorizam evaluation a escrever diretamente em strategies nem tornam certificado uma aprovação institucional.

**Disposição:** publicar torna o artefato de versão disponível segundo seu contrato, mas não comprova backtest. Backtest concluído precisa de evidência vinculada à versão, dados, parâmetros e resultado; conclusão não é aprovação automática de qualidade. Evaluation produz avaliação/certificação/recomendação; governance registra a aprovação aplicável; strategies aplica a transição de sua StrategyVersion/Deployment por handler próprio. Um evento de certificado pode iniciar o fluxo de promoção, não substituir seus gates. Nenhuma dessas ações concede grant, aumenta orçamento ou habilita REAL.

**Evidência de desvio, não padrão:** em inspeção estática de 2026-09-08, `backend/modules/strategies/src/application/commands/publish-strategy-version.ts` define `toState = "BACKTESTED"` sem verificar um backtest no handler. Isso não prova ausência global de backtests, mas impede usar apenas esse rótulo como evidência de execução ou certificação. Não foi executado o comando.

**Impacto e migração planejada:** ANX-147 deve separar a semântica de publicação da comprovação de backtest no contrato e nos consumidores, sem inventar um resultado histórico. Antes do diff, inventariar enum, eventos, journal, API, projeções e usos de BACKTESTED. Preservar registros/eventos originais; classificar o legado por evidência verificável, mantendo não comprovado o que só recebeu o rótulo. A correção de estado exige transição auditável/versionada do dono, não edição retroativa do journal. A versão exata do schema e a representação de publicação ficam no pacote executável ANX-147/132, sujeitas a revisão de compatibilidade; não há enum ou migration SQL criada aqui.

Leitores devem distinguir evidência de rótulo antes do cutover do produtor; consumidores antigos que tratem published como backtest/certificação não podem continuar autorizando promoção. Rollback bloqueia novas promoções dependentes da semântica incompatível e preserva evidências; não restaura elegibilidade apenas porque o código antigo reconhece BACKTESTED. Deployments e efeitos existentes precisam de análise e reconciliação pelo respectivo dono, sem cancelamento em massa ou desfazimento financeiro implícito.

**Oráculos delegados:** publish idempotente não fabrica backtest; completed sem resultado válido não certifica; certificado sem aprovação aplicável não promove; certificado de outra versão/tenant é negado; replay e concorrência não duplicam transição/evento; revogação ou mudança de candidato invalida evidências dependentes. ANX-147/160/136/171 e ANX-132 devem demonstrar contratos e casos negativos sobre o candidato integrado. Esta disposição documental aguarda revisão independente; não declara testes executados, backtest homologado ou promoção disponível.

## 7. Rollback

Rollback é uma transição explícita para a última versão conhecida e aprovada, acionada por métrica, incidente, achado ou decisão humana. Deve:

1. bloquear novos usos da versão candidata;
2. revogar cache, leases e permits dependentes quando necessário;
3. preservar runs, decisões, outputs e evidência já produzidos;
4. reconciliar efeitos UNKNOWN antes de repetir;
5. restaurar configuração compatível sem apagar migrações;
6. validar health, schema, replay e projeções;
7. registrar impacto e follow-up.

Rollback de código não desfaz automaticamente eventos financeiros. Ledger, fills, posições e auditoria seguem suas regras de correção e reconciliação.

## 8. Aprendizagem e memória

Feedback de usuários, resultados de runs e incidentes podem gerar insight ou nova proposta. A pipeline distingue:

- observação;
- hipótese;
- experimento;
- conclusão;
- mudança candidata;
- mudança aprovada.

Memória corrigida mantém proveniência e versões. Uma falha ou preferência não vira regra institucional sem avaliação e aprovação. O agente não pode escrever instrução de sistema, grant, policy ou skill ativa como efeito de sua própria execução.

## 9. Compatibilidade e migração

Mudanças de schema e eventos devem declarar compatibilidade backward/forward, período de coexistência, reprocessamento e rollback. Migração destrutiva exige backup/restore comprovado, janela, owner e plano de recuperação. Projeções Neo4j e caches são reconstruíveis e nunca substituem journal ou ledger.

Mudanças de modelo/provider devem preservar identificação do provider, versão, parâmetros relevantes e custo. Não é permitido substituir provider por “melhor esforço” sem evidência e autorização.

## 10. Eventos

Nomes abaixo são conceitos do fluxo, não inventário de schemas publicados. Não existe módulo físico evolution no baseline aceito. ANX-171 deve mapear cada evento ao schema/símbolo versionado e ao dono concreto: governance possui ChangeProposal/aprovação; evaluation avaliação/certificação; simulation cenários; agents/strategies/connections e outros donos aplicam suas próprias versões. Operations coordena recuperação sem escrever estado alheio.

| Evento | Owner | Propósito |
| --- | --- | --- |
| `ChangeProposed` | governance | registrar hipótese e escopo da ChangeProposal |
| `EvaluationStarted/Completed` | evaluation | anexar resultado comparável |
| `ReviewCompleted` | gate owner | registrar parecer independente |
| `CanaryStarted/Paused` | domínio proprietário da versão; operations coordena operação | controlar exposição sem transferir ownership do estado |
| `VersionPromoted` | domínio proprietário da versão, após aprovação governance | publicar versão aprovada |
| `RollbackRequested/Completed` | domínio proprietário da versão; operations coordena recuperação | retornar versão segura preservando efeitos anteriores |
| `PolicyEpochBumped` | governance | invalidar autoridade anterior |
| `EvolutionBlocked` | dono do estado bloqueado; orchestration para Task/Run | preservar impedimento e próxima ação |

Eventos incluem digest, predecessor, candidate, ownerDomain, tenant, correlation/causation, schema version, checkpoint e redaction. Nenhum evento contém secret, prompt sensível bruto ou credencial.

## 11. Critérios e gates

- G0: proposta, owner, baseline, candidato, riscos, gates, budget e rollback registrados.
- G1: avaliação reproduzível e crítico independente aprovou a revisão exata.
- G2: contratos, impacto, migração, concorrência e manutenção revisados.
- G3: testes funcionais, regressão, replay, canary e rollback executados em sandbox.
- G4: Security verificou isolamento, secrets, tenancy, policy, injection e escalation.
- G5: Red Team tentou envenenamento de dados, skill maliciosa, autoelevação, bypass e rollback race.
- G6: candidato integrado revalidado; pareceres antigos não são reutilizados automaticamente.
- G7: aceite explícito; promoção/liberação somente dentro do escopo autorizado.

## 12. Questões pendentes

- formato e retenção do registry de versões;
- thresholds iniciais de canary e rollback;
- judge e baseline por tipo de mudança;
- compatibilidade de eventos durante migrações;
- política de aprovação para mudança de provider/modelo;
- observabilidade mínima para evolução contínua;
- governança de dados de feedback e memória.

Nenhuma questão pendente autoriza REAL/live, L3/L4 ou autoalteração de autoridade.

## 13. Referências

- [Matriz de contratos dos 23 módulos](./module-contract-matrix-23.md)
- [Contrato de agentes](./system-capabilities/p07-agents-memory-evolution-contract.md)
- [Pacote de evidências G0-G7](./gate-evidence-handoff-acceptance-contract.md)
- [Roadmap de execução](./execution-roadmap.md)
