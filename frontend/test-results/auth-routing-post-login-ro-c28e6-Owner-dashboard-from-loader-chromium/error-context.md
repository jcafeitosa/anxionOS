# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-routing.spec.ts >> post-login routing (live Better Auth) >> owner membership opens Owner dashboard from loader
- Location: e2e/auth-routing.spec.ts:15:2

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByTestId('owner-operational-empty')
Expected substring: "Portfólio ainda não alimenta este console"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" getByTestId('owner-operational-empty') with timeout 5000ms
  - waiting for getByTestId('owner-operational-empty')

```

```yaml
- link "Pular para o conteúdo principal":
  - /url: "#main-content"
- complementary "Navegação principal":
  - paragraph: anxionOS
  - paragraph: Owner Console
  - navigation "Menu Owner Console":
    - link "Visão geral":
      - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65
    - link "Equipe":
      - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#team
    - link "Atividade":
      - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#activity
    - link "Configurações":
      - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#settings
- banner:
  - heading "Owner Console" [level=1]
  - paragraph: Agência 2f5d7f34-2fd1-41ef-b84a-c3a750871c65 · owner
  - status "Sessão": owner@anxionos.local
- main:
  - region "Trilha de autorização":
    - heading "Trilha de autorização" [level=2]
    - list:
      - listitem:
        - paragraph: Sessão
        - paragraph: frontend · Better Auth
      - listitem:
        - paragraph: post-login-context
        - paragraph: backend · GET /v1/auth/post-login-context
      - listitem:
        - paragraph: Owner Console
        - paragraph: security · owner · MEMBERSHIP_OWNER
  - toolbar "Ações do diagrama":
    - button "Show all"
    - button "Caminho principal" [pressed]
    - button "Inferência"
  - heading "anxionOS — visão de plataforma" [level=2]
  - paragraph: Consoles Astro até domínio, PostgreSQL autoritativo e projeção Neo4j.
  - complementary:
    - text: Encontrar nó
    - searchbox "Encontrar nó"
    - list "Nós do diagrama":
      - listitem:
        - button "brain/ External"
      - listitem:
        - button "Humanos External"
      - listitem:
        - button "Consoles Frontend"
      - listitem:
        - button "API Backend"
      - listitem:
        - button "Workers Backend"
      - listitem:
        - button "Módulos Backend"
      - listitem:
        - button "Neo4j Database"
      - listitem:
        - button "PostgreSQL Database"
      - listitem:
        - button "Eventing Message bus"
      - listitem:
        - button "Connections Backend"
      - listitem:
        - button "Providers External"
  - 'group "anxionOS — visão de plataforma Diagrama institucional Archify classic: consoles Astro, 23 módulos, PostgreSQL autoritativo e Neo4j como projeção."':
    - text: HTTPS /api commands projections journal
    - button "brain/, External": brain/ OKF local
    - button "Humanos, External": Humanos Owner · papéis
    - button "Consoles, Frontend": Consoles Astro + React
    - button "API, Backend": API Bun + Elysia
    - button "Workers, Backend": Workers TypeScript
    - button "Módulos, Backend": Módulos 23 contexts
    - button "Neo4j, Database": Neo4j projeção
    - button "PostgreSQL, Database": PostgreSQL TS · pgvector
    - button "Eventing, Message bus": Eventing outbox · NATS
    - button "Connections, Backend": Connections LLM · venues
    - button "Providers, External": Providers externos
  - toolbar "Zoom do diagrama":
    - button "Diminuir zoom"
    - button "Redefinir zoom": 100%
    - button "Aumentar zoom"
  - list "Legenda semântica":
    - listitem: Frontend
    - listitem: Backend
    - listitem: Database
    - listitem: Message bus
    - listitem: External
  - complementary "Consoles":
    - paragraph: Semantic passport
    - heading "Consoles" [level=3]
    - term: tipo
    - definition: Frontend
    - term: id
    - definition: frontend
    - term: tag
    - definition: frontend/
    - paragraph: Relações autoradas
    - list:
      - listitem: OUT → API · /api
      - listitem: IN ← Humanos · HTTPS
    - paragraph: Dados do loader
    - term: agencyId
    - definition: 2f5d7f34-2fd1-41ef-b84a-c3a750871c65
    - term: role
    - definition: owner
    - term: e-mail verificado
    - definition: "true"
    - term: TTL
    - definition: Dentro do TTL
    - term: policyVersion
    - definition: post-login.v1
    - paragraph: platformAccess=false — console /platform permanece negado.
    - paragraph: partnerAccess=false — console /partner permanece negado.
  - article:
    - heading "Fontes OpenKnowledge" [level=3]
    - list:
      - listitem: ADR0002 aceito — 23 módulos; tools ainda proposta (ADR0003)
      - listitem: ADR0004 aceito — Neo4j + PostgreSQL/Timescale/pgvector
      - listitem: ADR0001 proposto — grafo operacional sem ser ledger
  - article:
    - heading "Evidência no repo" [level=3]
    - list:
      - listitem: Esqueleto em backend/modules (23 donos + adapter-gateway fora do baseline)
      - listitem: frontend/ Astro; API Bun+Elysia; eventing/database packages
      - listitem: Implantação de produção não verificada
  - region "Equipe":
    - heading "Equipe" [level=2]
    - list:
      - listitem:
        - paragraph: owner · active
        - paragraph: dda03cf9-8ab9-4f03-9123-3d25a95c9876 · 3e5baade-6c4c-4e75-b90f-ece93944ee59
      - listitem:
        - paragraph: operator · active
        - paragraph: 16b23284-843e-4095-97c6-e507d0d7cc09 · 16894192-21b7-46be-ae23-2c5ddc377b20
  - region "Grants e autonomia":
    - heading "Grants e autonomia" [level=2]
    - paragraph: Vazio
    - heading "Nenhum grant efetivo nesta agência" [level=3]
    - paragraph: "Nenhum grant efetivo para o principal nesta agência. Contrato: GET /v1/agencies/:agencyId/grants (collection). createGovernancePlugin handleListGrants → listEffectiveGrants; DTO em handlers/grants toGrantDto. Autonomia L0–L4 por agente: GET /v1/agencies/:agencyId/agents/:agentId/autonomy. ANX-402 slice 3."
    - paragraph: GET /v1/agencies/:agencyId/agents/:agentId/autonomy — requer agentId; matriz global em GET /v1/governance/autonomy/matrix. Nível L0–L4 só quando a API devolve; sem atribuição = honesto vazio. ANX-403 slice 4.
  - region "Fila de aprovações":
    - heading "Fila de aprovações" [level=2]
    - paragraph: Vazio
    - heading "Listagem de aprovações ainda não publicada" [level=3]
    - paragraph: "Listagem pública ainda não existe. GET /v1/agencies/:agencyId/change-proposals (collection). createGovernancePlugin handleListPendingChangeProposals → findPendingByScope; DTO em handlers/change-proposals toChangeProposalDto. Resolver: POST /v1/governance/approvals/resolve. ANX-404 slice 5."
    - paragraph: POST /v1/governance/approvals/resolve — resolve aprovação de ChangeProposal (command idempotente). O Owner console lista pendentes; resolver exige commandId e changeProposalId.
  - region "Agentes da agência":
    - heading "Agentes da agência" [level=2]
    - paragraph: Vazio
    - heading "Listagem de agentes ainda não publicada" [level=3]
    - paragraph: Listagem pública ainda não existe. GET /v1/agencies/:agencyId/agents (collection). createAgentsPlugin só POST "" + GET /:agentId; AgentRepository.save/findById sem listByOrganization; OpenAPI getAgent/listAgentVersions (por agentId). ANX-143 done não publica listagem. ANX-385.
  - region "Portfólio e valuation":
    - heading "Portfólio e valuation" [level=2]
    - paragraph: Vazio
    - heading "Listagem de portfólios ainda não publicada" [level=3]
    - paragraph: Listagem pública ainda não existe. GET /v1/agencies/:agencyId/portfolios (collection). createPortfoliosPlugin handleListAgencyPortfolios → listAgencyPortfolioOverview; DTO em handlers/overview. ANX-153 G7 + ANX-164 slice 6.
    - paragraph: GET /v1/agencies/:agencyId/portfolios (collection). createPortfoliosPlugin handleListAgencyPortfolios → listAgencyPortfolioOverview; DTO em handlers/overview. ANX-153 G7 + ANX-164 slice 6.
- contentinfo: anxionOS · Owner Console · shells honestos ANX-297
```

# Test source

```ts
  1   | import { expect, test } from "@playwright/test";
  2   | import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";
  3   | 
  4   | test.describe("post-login routing (live Better Auth)", () => {
  5   | 	test("unauthenticated landing stays public", async ({ page }) => {
  6   | 		await page.goto("/");
  7   | 		await expect(
  8   | 			page.getByRole("heading", {
  9   | 				name: "Investimentos autônomos com governança institucional",
  10  | 			}),
  11  | 		).toBeVisible();
  12  | 		await expect(page.getByRole("link", { name: "Entrar" }).first()).toBeVisible();
  13  | 	});
  14  | 
  15  | 	test("owner membership opens Owner dashboard from loader", async ({ page }) => {
  16  | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  17  | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  18  | 		await expect(page.getByRole("heading", { name: "Owner Console" })).toBeVisible();
  19  | 		await expect(page.getByTestId("owner-dashboard")).toBeVisible();
  20  | 		await expect(page.getByTestId("archify-canvas")).toBeVisible();
  21  | 		const url = page.url();
  22  | 		const agencyId = url.match(/\/agency\/([0-9a-f-]{36})$/)?.[1];
  23  | 		expect(agencyId).toBeTruthy();
  24  | 		await expect(page.getByTestId("owner-membership")).toContainText(agencyId!);
  25  | 		await expect(page.getByTestId("owner-membership")).toContainText("owner");
  26  | 		await expect(page.getByTestId("owner-platform-grant")).toContainText(
  27  | 			"platformAccess=false",
  28  | 		);
> 29  | 		await expect(page.getByTestId("owner-operational-empty")).toContainText(
      |                                                             ^ Error: expect(locator).toContainText(expected) failed
  30  | 			"Portfólio ainda não alimenta este console",
  31  | 		);
  32  | 		await expect(page.getByTestId("owner-operational-empty")).toContainText("ANX-153");
  33  | 		const teamPanel = page.getByTestId("owner-team-panel");
  34  | 		await expect(teamPanel).toBeVisible();
  35  | 		await expect(teamPanel).toContainText(
  36  | 			"GET /v1/organizations/agencies/:agencyId/memberships",
  37  | 		);
  38  | 		const teamList = page.getByTestId("owner-team-list");
  39  | 		const teamEmpty = teamPanel.getByTestId("honest-state-empty");
  40  | 		const teamDenied = teamPanel.getByTestId("honest-state-denied");
  41  | 		const teamStale = teamPanel.getByTestId("honest-state-stale");
  42  | 		await expect(
  43  | 			teamList.or(teamEmpty).or(teamDenied).or(teamStale),
  44  | 		).toBeVisible({ timeout: 20_000 });
  45  | 		if (await teamList.isVisible()) {
  46  | 			await expect(teamList).toContainText("owner");
  47  | 		}
  48  | 		const grantsPanel = page.getByTestId("owner-grants-panel");
  49  | 		await expect(grantsPanel).toBeVisible();
  50  | 		await expect(grantsPanel).toContainText("GET /v1/agencies/:agencyId/grants");
  51  | 		const grantsList = page.getByTestId("owner-grants-list");
  52  | 		const grantsEmpty = grantsPanel.getByTestId("honest-state-empty");
  53  | 		const grantsDenied = grantsPanel.getByTestId("honest-state-denied");
  54  | 		const grantsStale = grantsPanel.getByTestId("honest-state-stale");
  55  | 		await expect(
  56  | 			grantsList.or(grantsEmpty).or(grantsDenied).or(grantsStale),
  57  | 		).toBeVisible({ timeout: 20_000 });
  58  | 		await expect(page.getByTestId("owner-autonomy-contract")).toContainText(
  59  | 			"/agents/:agentId/autonomy",
  60  | 		);
  61  | 		const approvalsPanel = page.getByTestId("owner-approvals-panel");
  62  | 		await expect(approvalsPanel).toBeVisible();
  63  | 		await expect(approvalsPanel).toContainText(
  64  | 			"GET /v1/agencies/:agencyId/change-proposals",
  65  | 		);
  66  | 		const approvalsList = page.getByTestId("owner-approvals-list");
  67  | 		const approvalsEmpty = approvalsPanel.getByTestId("honest-state-empty");
  68  | 		const approvalsDenied = approvalsPanel.getByTestId("honest-state-denied");
  69  | 		const approvalsStale = approvalsPanel.getByTestId("honest-state-stale");
  70  | 		await expect(
  71  | 			approvalsList.or(approvalsEmpty).or(approvalsDenied).or(approvalsStale),
  72  | 		).toBeVisible({ timeout: 20_000 });
  73  | 		await expect(page.getByTestId("owner-approval-resolve-contract")).toContainText(
  74  | 			"/v1/governance/approvals/resolve",
  75  | 		);
  76  | 		const agentsCatalog = page.getByTestId("owner-agents-catalog");
  77  | 		await expect(agentsCatalog).toBeVisible();
  78  | 		await expect(agentsCatalog.getByTestId("honest-state-empty")).toBeVisible({
  79  | 			timeout: 20_000,
  80  | 		});
  81  | 		await expect(agentsCatalog).toContainText("GET /v1/agencies/:agencyId/agents");
  82  | 		await expect(page.getByTestId("owner-agents-list")).toHaveCount(0);
  83  | 		await expect(page.getByTestId("owner-agents-autonomy-contract")).toHaveCount(0);
  84  | 		await expect(page.getByText(/^L[0-4]$/)).toHaveCount(0);
  85  | 		await expect(page.getByText("tn_demo_001")).toHaveCount(0);
  86  | 		await expect(page.getByText("C-level")).toHaveCount(0);
  87  | 	});
  88  | 
  89  | 	test("operator membership opens Operator dashboard from loader", async ({ page }) => {
  90  | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  91  | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  92  | 		await expect(
  93  | 			page.getByRole("heading", { name: "Operator Console" }),
  94  | 		).toBeVisible();
  95  | 		await expect(page.getByTestId("operator-dashboard")).toBeVisible();
  96  | 		await expect(page.getByTestId("archify-canvas")).toBeVisible();
  97  | 		const url = page.url();
  98  | 		const agencyId = url.match(/\/operator\/([0-9a-f-]{36})$/)?.[1];
  99  | 		expect(agencyId).toBeTruthy();
  100 | 		await expect(page.getByTestId("operator-membership")).toContainText(agencyId!);
  101 | 		await expect(page.getByTestId("operator-membership")).toContainText("operator");
  102 | 		await expect(page.getByTestId("operator-platform-grant")).toContainText(
  103 | 			"platformAccess=false",
  104 | 		);
  105 | 		await expect(page.getByTestId("operator-operational-empty")).toContainText(
  106 | 			"Este console não lista Owner capabilities",
  107 | 		);
  108 | 		await expect(page.getByTestId("owner-team-panel")).toHaveCount(0);
  109 | 		await expect(page.getByTestId("owner-grants-panel")).toHaveCount(0);
  110 | 		await expect(page.getByTestId("owner-agents-catalog")).toHaveCount(0);
  111 | 		await expect(page.getByTestId("owner-dashboard")).toHaveCount(0);
  112 | 		await expect(page.getByRole("heading", { name: "Owner Console" })).toHaveCount(0);
  113 | 		await expect(page.getByText("tn_demo_001")).toHaveCount(0);
  114 | 		await expect(page.getByText("C-level")).toHaveCount(0);
  115 | 	});
  116 | 
  117 | 	test("zero memberships open onboarding", async ({ page }) => {
  118 | 		await signInLive(page, DEV_SEED_ACCOUNTS.none);
  119 | 		await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });
  120 | 	});
  121 | 
  122 | 	test("multiple memberships open select-organization", async ({ page }) => {
  123 | 		await signInLive(page, DEV_SEED_ACCOUNTS.multi);
  124 | 		await expect(page).toHaveURL(/\/select-organization$/, { timeout: 20_000 });
  125 | 		await expect(
  126 | 			page.getByRole("heading", { name: "Escolher organização" }),
  127 | 		).toBeVisible();
  128 | 	});
  129 | 
```