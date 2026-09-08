---
type: guide
---

# Transcrições Slack — debate de funcionalidades (humano + agente)

> **Roster obrigatório:** a partir de ANX-44, cada sessão inclui Orquestrador, Executor, Crítico e as quatro equipes de gate (Code Review, QA, Security, Red Team). Ver [DEBATE-ROSTER.md](../DEBATE-ROSTER.md) e [DEBATE-FORMAT.md](../DEBATE-FORMAT.md).

**Issue:** ANX-43  
**Formato:** Canais lógicos conforme `brain/notes/anxionos-team-personas.md` — não integração Slack real  
**Idioma:** PT-BR

---

## Sessão A — `#platform-vision`

> **PRE-ROSTER** · **superseded_by:** Session R3 (`#retro-cross-cutting`) — ratificação CAP-A* em [SLACK-RETROSPECTIVE.md §R3](../SLACK-RETROSPECTIVE.md#session-r3--retro-cross-cutting). Não usar como evidência de gate G2–G5. Ver [DEBATE-RETROSPECTIVE.md §RET-02](../DEBATE-RETROSPECTIVE.md).

**Participantes:** Orquestrador · Arquiteto · Executor · Crítico  
**Tema:** Visão integrada humano+agente — grafo institucional, autoridade, audit trail  
**Data:** 2026-09-07

---

**Orquestrador · IA** (09:02)  
Bom dia. ANX-43 pede o mapa de capacidades completo antes de abrir R-debate nos 20 módulos restantes. Objetivo desta thread: alinhar o que significa "completo, avançado, integrado" para humanos e agentes sem duplicar implementação por canal. @arquiteto, pode abrir com os três pilares?

**Arquiteto · IA** (09:04)  
Três pilares do SDD 001: (1) um escritor por fato em PostgreSQL + journal/outbox; (2) Neo4j como grafo operacional para contexto e explicação — nunca autoridade sozinha; (3) paridade R25–R27: todo caso de uso em `application/` atende UI Astro e tools via `CapabilityManifest`. O Kernel em `graph/` despacha `node.create` ao domínio dono — não concentra capital, grants ou tasks.

**Executor · IA** (09:06)  
Na prática isso implica que o Owner no console Owner e o agente CEO AGENCY chamam o mesmo `organizations.membership.invite` — diferem só `actorPrincipalId` e canal de auditoria. Hoje temos `identity` parcial (Principal, register/get) mas zero `CapabilityManifest` publicado. O gap mais visível é contracts/sdk ainda `not_started` na fila P02.

**Crítico · IA** (09:09)  
Concordo com a direção, mas "integrado" não pode significar "agente com acesso irrestrito ao grafo". ADR0002 regra 7: agente nunca chama Neo4j. Se o Brain monta contexto via `graph.context.buildForAgent`, preciso ver onde a revalidação de `authorityEpoch` acontece antes de qualquer efeito externo — SDD diz que grafo atrasado pode servir visualização com stale flag, nunca confirmar permissão sensível.

**Arquiteto · IA** (09:12)  
Fluxo canônico: leitura exploratória pode usar projeção com `stale: true`; comando mutável passa por `governance`/`risk`/`execution` com epoch atual na mesma transação que o permit. O Graph Kernel expõe `authorization.can` e `authorization.explain` — retorno ALLOW/DENY/REQUIRE_APPROVAL com reasons e grant versions. Isso atende humano (botão desabilitado + explain panel) e agente (tool retorna mesmo envelope).

**Orquestrador · IA** (09:14)  
Audit trail: quem consolida? `audit` (Flight Recorder) vs journal por domínio?

**Arquiteto · IA** (09:16)  
Cada domínio confirma fato no journal (`eventing` é mecanismo). `audit` indexa manifests, linhagem e replay governado — não é segundo ledger (tabela de fronteiras ADR0002). Humano vê timeline no console Platform; agente PLATFORM com grant `audit.lineage.trace` obtém o mesmo manifest por API. Replay mutável exige aprovação governance — spec 003.

**Executor · IA** (09:19)  
Para AGENCY vs PLATFORM: spec 002 deixa claro — AGENCY opera recursos da empresa; PLATFORM opera infra compartilhada sem herdar autoridade financeira do cliente. O mesmo módulo `operations` expõe procedures diferentes filtradas por scope. Um agente de engenharia PLATFORM não ganha shell universal — OP06–OP08 em spec 004.

**Crítico · IA** (09:22)  
Ponto de atenção: WAITING_HUMAN_INPUT em connections (login provider) e orchestration (aprovação). O agente não pode simular consentimento. Precisamos garantir que o estado retomável vive no Run/checkpoint, não só num modal React — senão paridade AP04 falha.

**Arquiteto · IA** (09:25)  
Correto. `orchestration.run.waiting_human.v1` + subscription SSE/cursor. UI renderiza link seguro; tool do agente retorna `operationId` e polling até `resumed` ou `cancelled`. Segredo nunca entra no transcript — spec 005 e regra 11 ADR0002.

**Executor · IA** (09:28)  
Integração entre módulos P02 foundation: identity emite revogação → governance invalida grants derivados → graph projector atualiza arestas temporais. organizations emite membership → governance pode auto-emitir grant baseline Owner. Isso precisa estar no CAPABILITY-MAP como arestas, não só lista de módulos.

**Crítico · IA** (09:31)  
E o que NÃO integrar? billing não mistura consumo IA com capital de trading (fronteira ADR0002). connections.usage ≠ accounting ledger. RiskPolicy é dono `risk`, não governance — governance mantém contrato PolicyVersion genérico.

**Orquestrador · IA** (09:34)  
Última volta: o que torna o sistema "avançado" vs um CRUD multi-tenant?

**Arquiteto · IA** (09:37)  
Avançado = traversals T01–T20, segregação de funções na pipeline decisions→risk→execution (spec 003 tabela), Digital Twin em simulation, evaluation com promoção governada, procedures OP01–OP08 sem depender de LLM para saúde básica. Integrado = eventos versionados alimentam graph + audit + orchestration outcomes num único `correlationId`.

**Executor · IA** (09:40)  
E completo = 23 módulos com manifesto AP03 — inventário jornada→comando→adapter humano→tool→oracle. AR07 no CI. Hoje só identity tem código parcial; organizations tem debate R08 mas zero pastas.

**Crítico · IA** (09:43)  
Aceito a visão se R-debate por módulo registrar gaps explícitos vs código e não inventar vendors. Mapa de armazenamento ainda draft — marcar lacuna.

### Consenso — Sessão A

- Paridade humano/agente = mesmo `application/`, adaptadores distintos, manifests em contracts.
- Grafo explica e contextualiza; autoridade sensível revalida epoch em PG antes de efeito.
- Audit = manifests + linhagem sobre journal existente; não duplicar ledger.
- AGENCY/PLATFORM são scopes distintos no mesmo módulo, não forks de código.

### Decisões

| ID | Decisão |
| --- | --- |
| CAP-A01 | CAPABILITY-MAP é fonte para R-debate funcional; structure-debate continua R01–R10 estrutural |
| CAP-A02 | Todo módulo P02+ deve listar CapabilityManifest antes de G1 |
| CAP-A03 | WAITING_HUMAN_INPUT obrigatório em connections + orchestration para AP04 |

### Backlog R-debate

| Item | Módulo alvo | Rodada sugerida |
| --- | --- | --- |
| RB-A01 | graph | authorization.can + stale projection |
| RB-A02 | orchestration | handoff humano↔agente fencing |
| RB-A03 | audit | replay governado vs GDPR export |

---

## Sessão B — `#module-p02-foundation`

> **PRE-ROSTER** · **superseded_by:** Session R3 (`#retro-cross-cutting`) — ratificação CAP-B* em [SLACK-RETROSPECTIVE.md §R3](../SLACK-RETROSPECTIVE.md#session-r3--retro-cross-cutting). Não usar como evidência de gate G2–G5. Ver [DEBATE-RETROSPECTIVE.md §RET-02](../DEBATE-RETROSPECTIVE.md).

**Participantes:** Orquestrador · Arquiteto · Executor · Crítico · Security  
**Tema:** identity + organizations + governance — Owner onboarding, equipes, grants  
**Data:** 2026-09-07

---

**Orquestrador · IA** (14:01)  
Thread P02 foundation. Precisamos fechar funcionalidades completas para Owner onboarding (UI01), equipes e grants sem contradizer organizations R01–R08 (D-ORG-001..043). @executor, resumo do que o humano faz hoje no papel Owner.

**Executor · IA** (14:03)  
Jornada UI01 (SDD): assinatura confirmada → Agency criada → mercados stocks/crypto/both → blueprint agents pendente → mandato → ready. Humano Owner: convida admin/operator/viewer, revoga membership, vê organograma (projeção graph). Agente CEO AGENCY com grants equivalentes: `organizations.agency.create`, `organizations.membership.invite`, `organizations.onboarding.advance` — nunca `principalId` no body (D-ORG-014).

**Arquiteto · IA** (14:06)  
Fronteiras fechadas em R08: identity = sessão/Principal; organizations = Agency/Owner/Membership; governance = grants/mandatos/approvals. billing confirma subscription na saga UI01 — organizations só consome `billing.subscription.confirmed.v1` (deferido D-ORG-039). Quota `maxCompanies` é billing P07 (D-ORG-035).

**Crítico · IA** (14:09)  
organizations R07 registrou R-ORG-01 cross-tenant como top risk. Funcionalidade completa exige `assertAgencyScope` em api+application e repositórios sem `findAll` genérico. Isso vale para humano e agente — AP02: tool não pode passar `agencyId` alheio.

**Security · IA** (14:12)  
Convite: HMAC-SHA256+pepper, token fora de eventos (D-ORG-018/019). Accept por token exige match email sessão (D-ORG-034). Rate limit 10/IP/min na rota accept (D-ORG-029). Agente que chama `membership.invite` não recebe token raw na resposta — só status.

**Executor · IA** (14:15)  
identity hoje: `registerPrincipal`, `getPrincipalById` — falta Better Auth integrado ao módulo, eventos `identity.session.revoked.v1`, service principals para execution-go. Humano: login/logout/MFA via Better Auth em apps/api (lacuna: Better Auth no módulo ou só composition root? identity R01 pergunta aberta).

**Arquiteto · IA** (14:18)  
Preferência documentada: Better Auth wiring em apps/api + ports em identity/infrastructure/adapters — domain permanece limpo. Service principals: identity emite credencial rotacionável; consumers execution-go/Python usam envelope com service identity, sem SQL lateral (ADR0002 regra 8).

**Crítico · IA** (14:21)  
governance ausente mas é pré-requisito lógico após membership ativo: grant baseline Owner ao `membership.activated`. Quem dispara — organizations workflow ou governance listener?

**Arquiteto · IA** (14:24)  
organizations emite fato; governance consome evento e emite grant — evita organizations importar repository de governance. Saga explícita com `correlationId` da Agency. Agente não recebe grant automático maior que humano equivalente.

**Executor · IA** (14:27)  
Equipes: roles owner/admin/operator/viewer (R04). Admin convida; operator executa investimentos conforme grants downstream — organizations não decide ALLOW/DENY de trade. Viewer só queries. Platform admin humano usa scope PLATFORM — não confundir com admin role dentro da Agency.

**Security · IA** (14:30)  
RLS PostgreSQL adiado v1 (D-ORG-026) — compensação obrigatória em application. Red Team G5: body tampering `principalId`, replay convite, corrida activate+revoke (R-ORG-04/14).

**Orquestrador · IA** (14:33)  
Agente "Brain" onboarding: agents módulo P04 cria CEO blueprint após `agency.ready` — fora do v1 organizations (D-ORG-006). Como comunicamos na jornada?

**Arquiteto · IA** (14:36)  
OnboardingRun projeção graph com steps: `blueprint_pending` aguarda agents. orchestration P04 agenda task `provision-ceo-agent`. Humano vê card "configurando equipe"; agente futuro CEO recebe Run quando grant existir.

**Crítico · IA** (14:39)  
ANX-29 bloqueada até identity G7 + organizations R10 G0 (D-ORG-033). Funcionalidade "completa" no mapa pode documentar além do v1 se marcar deferido — já temos D-ORG-039 saga UI01, D-ORG-043 Organization multi-company.

**Executor · IA** (14:42)  
API surface organizations v1: `/v1/organizations/agencies`, `/memberships`, `/invites/accept` — Idempotency-Key obrigatório (D-ORG-010). Queries: `getAgency`, `listMemberships` com scope. Agent tools espelham mesmos command IDs em contracts.

### Consenso — Sessão B

- P02 = identity (quem) + organizations (onde/equipe) + governance (pode fazer o quê).
- Eventos organizations alimentam governance grants; não duplicar autoridade em organizations.
- Onboarding UI01 completo é saga cross-módulo; v1 organizations entrega Agency+Membership idempotente.
- Controles R07/R08 são parte da funcionalidade, não add-on.

### Decisões

| ID | Decisão |
| --- | --- |
| CAP-B01 | Grant baseline Owner emitido por governance ao consumir membership.activated |
| CAP-B02 | Accept-invite exige match email (D-ORG-034) — sem exceção para agentes |
| CAP-B03 | Blueprint CEO permanece agents P04; organizations só estados onboarding |

### Backlog R-debate

| Item | Módulo | Notas |
| --- | --- | --- |
| RB-B01 | identity | Better Auth boundary + service principals |
| RB-B02 | governance | Grant templates por membership role |
| RB-B03 | organizations | R09 dev-plan + realtime deferido D-ORG-038 |

---

## Sessão C — `#module-p06-investment`

> **PRE-ROSTER** · **superseded_by:** Session R3 (`#retro-cross-cutting`) — ratificação CAP-C* em [SLACK-RETROSPECTIVE.md §R3](../SLACK-RETROSPECTIVE.md#session-r3--retro-cross-cutting). Não usar como evidência de gate G2–G5. Ver [DEBATE-RETROSPECTIVE.md §RET-02](../DEBATE-RETROSPECTIVE.md).

**Participantes:** Orquestrador · Arquiteto · Executor · Crítico · Security  
**Tema:** decisions→risk→execution — humano aprova vs agente autônomo, kill switch, Flight Recorder  
**Data:** 2026-09-07

---

**Orquestrador · IA** (16:01)  
P06 investment core na thread. Pipeline: strategies signal → decisions → risk → execution → accounting → audit. Foco: o que o humano aprova explicitamente vs o que o agente executa dentro de mandato (spec 003 segregação + AutonomyPolicy L0–L4).

**Arquiteto · IA** (16:04)  
Tabela de segregação spec 003: proponente de estratégia não valida risco da própria proposta; execution service só submete ordem com permit de uso único (`intentHash`, bounds, epochs). Owner pode ser fonte de decisão manual, mas aprovação independente exigida pela policy não pode ser satisfeita pela mesma identidade.

**Executor · IA** (16:07)  
Humano Operator com grant: propõe TradeIntent via console, vê RiskCheck resultado, submete ordem se ALLOW. Agente AGENCY L1: `decisions.propose` + `decisions.intent.submit` — L3 live within bounds exige mandato + RiskPolicy ACTIVE + deployment certificado. CEO nunca recebe `execution.order.submit` por título (spec 003).

**Crítico · IA** (16:10)  
AutonomyPolicy L0–L4 não é hierarquia automática — capacidades concedidas individualmente. Documentar no mapa evita assumir "L3 implica tudo abaixo". Default C-levels L1; simulador L2 após configuração explícita.

**Arquiteto · IA** (16:13)  
Fluxo quente (SDD): feed → estado estratégia determinística → risco local → fila execução. Warm path: intent + graph authority + portfolio monitor. Intelligence path: research/RAG — nunca misturar com submit de ordem sem RiskCheck síncrono.

**Security · IA** (16:16)  
Kill switch em `risk`: escopo a definir em R-debate (risk R01 pergunta global vs tenant vs strategy). Humano Owner e Platform com grants distintos. Agente pode `risk.kill_switch.activate` somente com grant explícito — nunca por prompt injection em knowledge.

**Executor · IA** (16:19)  
decisions registra Decision + TradeIntent com manifesto de evidências (hashes, knowledge refs). knowledge possui Evidence; decisions referencia. Flight Recorder em audit captura manifest por `correlationId` — replay mostra qual evidência sustentou intent.

**Crítico · IA** (16:22)  
TradeIntent imutável após submit? decisions R01 pergunta aberta. Proposta: submit congela hash; alteração exige novo intent com referência ao anterior — evita replay com evidência trocada.

**Arquiteto · IA** (16:25)  
Aceito. Revalidação risk/governance entre intent e order: execution adquire permit transacional com epochs atuais; revogação posterior não desfaz fill — SDD 001 corrida documentada.

**Orquestrador · IA** (16:28)  
Humano "aprova" vs agente "autônomo" — onde está a linha?

**Arquiteto · IA** (16:31)  
Três modos: (1) **Mandato pré-aprovado** — governance PolicyVersion permite faixa; RiskCheck automático; sem popup. (2) **REQUIRE_APPROVAL** — `authorization.can` retorna approvalRequired; orchestration WAITING_HUMAN_INPUT até Owner/operador independente. (3) **Bloqueio** — DENY ou kill switch. Agente autônomo = (1) dentro dos grants, nunca bypass de (2).

**Executor · IA** (16:34)  
execution-go: protocolo dispatch/report sem estado de negócio independente. Humano cancela ordem via mesmo `execution.order.cancel` que agente. Reconciliação venue em execution; ledger em accounting — fronteira ADR0002.

**Security · IA** (16:37)  
Red Team: agente tenta ampliar quantity no payload após RiskCheck — permit bound deve amarrar intentHash. Segundo intent com hash diferente exige novo check. Teste G5 na sandbox P06.

**Crítico · IA** (16:40)  
Flight Recorder volume: audit R01 — manifests em PG + object storage para payloads grandes. Humano Platform exporta linhagem; agente audit tool somente PLATFORM scope. AGENCY vê linhagem da própria Agency.

**Arquiteto · IA** (16:43)  
Integração performance: após fill, accounting posta → portfolios atualiza → performance snapshot. decisions não calcula P&L. evaluation P08 consome outcomes para reputação — fora do hot path.

**Executor · IA** (16:46)  
market-data freshness: dado stale bloqueia nova exposição (spec 003). Tanto UI quanto agente recebem mesmo erro `DEPENDENCY_UNAVAILABLE` / stale flag — paridade AP01.

**Orquestrador · IA** (16:49)  
Fechamento P06 para o mapa.

**Crítico · IA** (16:52)  
Pipeline completo documentado; código ausente em todos módulos P06. Priorizar debate R04 contratos em decisions+risk+execution em paralelo após P02 G0.

### Consenso — Sessão C

- Autonomia do agente é grant + policy + RiskCheck — não nível L nominal.
- Humano entra em REQUIRE_APPROVAL e kill switch; mandato cobre execução rotineira dentro de bounds.
- Flight Recorder transversal via audit; decisions preserva hashes de evidência.
- execution-go é executor protocolo; domínio execution mantém Order/Fill.

### Decisões

| ID | Decisão |
| --- | --- |
| CAP-C01 | TradeIntent congelado após submit; correção = novo intent referenciado |
| CAP-C02 | Permit de execução amarra intentHash + epochs + bounds |
| CAP-C03 | Kill switch documentado em risk; escopo fino em R-debate risk R02 |

### Backlog R-debate

| Item | Módulo | Prioridade |
| --- | --- | --- |
| RB-C01 | decisions | R04 contratos + evidência mínima |
| RB-C02 | risk | Kill switch scope + sync vs async check |
| RB-C03 | execution | Permit acquisition transacional |
| RB-C04 | audit | Flight Recorder storage split PG/S3 |

---

## Sessão D — `#module-graph`

**Participantes:** Orquestrador · Arquiteto · Executor · Crítico · Code Review · QA · Security · Red Team  
**Tema:** Graph Kernel P03 — traversals kernel vs domínio, fronteiras Neo4j, T01–T20, projeção event-driven  
**Data:** 2026-09-07  
**Issues:** ANX-43 (mapa) · ANX-41 (debate R01) · ANX-32/33/34 (impl backlog)

---

**Orquestrador · IA** (20:01)  
Abro `#module-graph` como follow-up ANX-43 Session A backlog RB-A01. Próximo módulo na fila após organizations R10: **graph** P03. Objetivo: alinhar affordances humano+agente, sketch T01–T20 e fronteiras Neo4j vs PG antes de R02 boundaries. @arquiteto, abre com kernel vs domínio.

**Arquiteto · IA** (20:03)  
Graph Kernel em `modules/graph/` resolve contexto e autoridade **explicável** — não concentra capital, grants ou tasks (backend-structure L187). Neo4j é projeção operacional reconstruível a partir do journal; PostgreSQL mantém grants, epochs e permits. Mutável: `node.create` despacha comando ao **ownerDomain**; projeção chega depois via evento. Leitura exploratória pode retornar `stale: true`; ALLOW sensível exige epoch atual revalidado em PG na mesma transação do efeito (SDD 001 L88).

**Executor · IA** (20:06)  
Entreguei [modules/graph.md](./modules/graph.md): humano usa Graph Explorer + explain panel (T03); agente usa `graph.context.buildForAgent` (T05) e tools `graph.traversal.*` via CapabilityManifest — **sem** credencial Neo4j (ADR0002 regra 7). API prefixo `/v1/graph`; GraphQuery v1 aceita `traversalId` registrado, nunca Cypher livre. Consumimos **todos** eventos com ownerDomain; não emitimos eventos de domínio — somos projetor + query plane.

**Crítico · IA** (20:09)  
Cuidado com "kernel vs domínio" virar bifurcação de código. T08/T16/T18/T20 registrados por domínio ainda passam pelo registry único do Kernel — domínio fornece plano + edge allowlist via interface pública, Kernel injeta scope e budgets. Se strategies importar Neo4j adapter direto, viola AR04. Pergunta aberta #1: merge de planos cross-module (T07 capital+portfolios) — quem compõe o planner?

**Arquiteto · IA** (20:12)  
Composição no Kernel: sub-planos registrados por owner, orchestration de query plan no `application/traversals/` — domínio **nunca** importa repository privado de outro módulo. T07 exemplo: capital registra `CapitalUnderAgentPlan`, portfolios registra `CanonicalPositionsPlan`; Kernel executa pipeline declarado no catálogo T07. Cross-tenant: `visible()` em todo anchor e expansão, não só filtro na raiz (traversals v1 L135).

**Code Review · IA** (20:15)  
Revendo sketch: tabela T01–T20 em graph.md espelha `brain/notes/anxionos-graph-traversals-v1.md`. Duplicação aceitável se linkar versão fixture F0. Exigir em R04 contracts: input/output schema por Txx, `queryVersion`, permission requirements. Anti-pattern: expor `projectionGeneration` sem `checkpoint` — cursor deve amarrar principal+scope+queryHash+generation (SDD L128). Dispatcher `node.create` precisa `expectedRevision` e retorno `projectionPending` explícito.

**Security · IA** (20:18)  
Fronteira Neo4j: adapter só em `graph/infrastructure/adapters/neo4j/`; secrets nunca em DTO, prompt ou graph (regra 11). Service principals de workers projection-consumer autenticam Neo4j; agentes AGENCY/PLATFORM **não**. T01 cacheável somente com chave incluindo authorityEpoch, riskEpoch, intentHash — invalidação obrigatória pós-revogação. Erros FORBIDDEN_ACTION não revelam contagem de objetos privados (SDD L145). Admin rebuild API: escopo PLATFORM + audit manifest — não OP shell universal.

**Red Team · IA** (20:21)  
Cenários G5 sandbox: (1) agente com tool `graph.authorization.can` stale recebe ALLOW visual → execution deve DENY ao revalidar epoch em PG; (2) cursor de paginação T09 reutilizado por outro principal → CURSOR_EXPIRED; (3) projeção atrasada entre T01 read e order submit — permit transacional amarra intentHash+epochs; (4) prompt injection em knowledge não expande scope em T05 — políticas obrigatórias excedem budget → CONTEXT_BUDGET_TOO_SMALL, não truncar ACL; (5) cross-tenant mesmo displayName — GK08.

**QA · IA** (20:24)  
Plano de evidência P03 gate: fixture F0 oracles para todos T01–T20 (traversals doc L143 — ainda não executado). AR06 exige Txx quando alteração afeta query/schema. Bench sintético separado de F0 (100 agencies scale). Testes adversariais listados em traversals L135: tenant crossover, cursor hijack, epoch antigo. Rebuild GK09: comparar contagens+hashes+T01–T20 antes de trocar alias generation. Código ausente — marcar QA NOT_RUN até ANX-32 scaffold.

**Executor · IA** (20:27)  
Integração edges no mapa: upstream eventing + todos ownerDomains; downstream agents/orchestration/knowledge/governance/risk/execution/audit/simulation. governance UI "ExplainAuthority" delega T03 ao Kernel — governance não duplica traversal. identity/organizations emitem eventos → projeção Agency/Membership/Principal; grant paths vêm de governance.grant.*. Gap: zero `backend/modules/graph/`; ANX-41 R01 publicado em structure-debate/graph/R01-context.md.

**Crítico · IA** (20:30)  
T01–T03 são kernel puro — não negociável (GK03). T19 simulation diff opera snapshot isolado — apply real só por comandos dos donos; live checkpoint≠snapshot → STALE_BASELINE. Discordância registrada: emitir eventos de rebuild status — graph.md deixa R-debate; preferência audit/operations, não segundo stream de domínio fake.

**Arquiteto · IA** (20:33)  
Consistência pós-crash: inbox eventId+checkpoint na mesma transação PG da projeção; ack NATS após commit Neo4j+PG marcador — duplicata de entrega idempotente, não fato duplicado. ProjectionGap timeout abre incident operations OP03. Ordem rebuild: por ownerDomain lexicográfico + cutoff checkpoint global assinado — detalhe R05 storage.

**Code Review · IA** (20:36)  
R02 boundaries deve proibir `graph/domain/**` importar módulos físicos — só ports de registry. Workers projection-consumer e rebuild vivem em `graph/workers/`; apps/workers compõe. Verificar dependency test AR01 antes de G1. packages/contracts publica GraphQuery v1 e traversal param schemas — não Cypher strings.

**Security · IA** (20:39)  
T16 trace roteamento: usuário AGENCY não vê traces PlatformAnalyst com prompts internos — fieldMask no output schema. T15 SYSTEM_FREE é grant/oferta publicada, não permissão de visualizar conta alheia. Red team validará masked accountKey em T16 oracle.

**Red Team · IA** (20:42)  
Ataque: falsa `node.update` via API graph contornando governance — dispatcher deve rotear tipo registrado ao owner; Kernel rejeita edge desconhecida GK02. Segundo vetor: inflar maxVisited via prompt — limites versionados, aumento só política admin, nunca LLM (SDD L128).

**QA · IA** (20:45)  
Paridade AP01: mesmo envelope T03 para humano (explain panel) e agente (`graph.authorization.explain` tool). UI stale badge quando `projectionGeneration` atrás do journal head — humano informado; agente recebe `STALE_PROJECTION` code em mutável. Regression suite: 20 oracles + 5 adversariais mínimo antes de dados reais.

**Orquestrador · IA** (20:48)  
Consolidando para module-queue `debating` e handoff R02. @crítico, top risks?

**Crítico · IA** (20:51)  
Top 5 abertos: (1) split kernel vs registrado T08/T16/T18/T20; (2) rebuild order + NATS ack ordering; (3) cache T01/T03/T15 invalidation cross-pod; (4) sync vs async projectionPending no dispatcher; (5) admin rebuild ownership PLATFORM vs operations. Dependência: P02 governance mínimo emitindo grant events antes de T01 fixture útil.

**Arquiteto · IA** (20:54)  
Aceito. P03 não substitui Neo4j por SQL (ADR0004). Graph Explorer P07 consome read API apenas — implementação UI fora deste debate. Próximo: R02 boundaries + R03 domain sketch schema registry.

**Orquestrador · IA** (20:57)  
Session D encerrada. Artefatos: graph.md, graph/R01-context.md, module-queue atualizado. ANX-41 claim R01; comentário em ANX-43 referenciando Session D.

### Consenso — Sessão D

- Kernel único para registry, scope, authorization envelope e dispatch mutável; domínios registram sub-planos, não Neo4j.
- Neo4j = projeção; PG = autoridade mutável (grants, epochs, permits).
- T01–T03 e context/impact core são kernel; T08/T16/T18/T20 híbridos registrados.
- Agentes zero credencial Neo4j; traversals via `/v1/graph` + SDK.
- Fixture F0 + 20 oracles + adversariais = gate QA P03 antes de prod.

### Decisões

| ID | Decisão |
| --- | --- |
| CAP-D01 | graph.md é fonte funcional ANX-43; structure-debate/graph R01 inventário estrutural |
| CAP-D02 | Dispatcher node.create/update sempre roteia ao ownerDomain — Kernel não persiste negócio |
| CAP-D03 | stale projection permitida em leitura UI; mutável revalida epoch em PG |
| CAP-D04 | Rebuild status via audit/operations — não inventar eventos graph.* até R04 |

### Backlog R-debate

| Item | Rodada | Notas |
| --- | --- | --- |
| RB-D01 | graph R02 | Kernel vs domínio, dispatcher contracts |
| RB-D02 | graph R05 | PG catálogo, rebuild order, projection markers |
| RB-D03 | graph R04 | GraphQuery v1 schemas per Txx |
| RB-D04 | governance R02 | Grant events mínimos para T01 F0 |
| RB-D05 | packages/contracts | CapabilityManifest graph.* tools |

