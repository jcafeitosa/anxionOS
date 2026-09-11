# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y-console.spec.ts >> WCAG 2.2 axe — login + shells (ANX-340) >> Owner empty (live seed) is axe-clean
- Location: e2e/a11y-console.spec.ts:39:2

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('owner-operational-empty')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByTestId('owner-operational-empty') with timeout 5000ms
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
  2   | import { deniedPostLoginFixture, expectAxeClean } from "./a11y";
  3   | import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";
  4   | 
  5   | async function holdPostLoginContext(page: import("@playwright/test").Page): Promise<void> {
  6   | 	await page.route("**/v1/auth/post-login-context", async (route) => {
  7   | 		await new Promise((resolve) => {
  8   | 			setTimeout(resolve, 45_000);
  9   | 		});
  10  | 		await route.continue();
  11  | 	});
  12  | }
  13  | 
  14  | async function stalePostLoginContext(page: import("@playwright/test").Page): Promise<void> {
  15  | 	await page.route("**/v1/auth/post-login-context", (route) =>
  16  | 		route.fulfill({
  17  | 			status: 503,
  18  | 			contentType: "application/json",
  19  | 			body: JSON.stringify({ error: "unavailable" }),
  20  | 		}),
  21  | 	);
  22  | }
  23  | 
  24  | test.describe("WCAG 2.2 axe — login + shells (ANX-340)", () => {
  25  | 	test.describe.configure({ mode: "serial", timeout: 60_000 });
  26  | 	test("/login loading form is axe-clean and skip-link has a target", async ({
  27  | 		page,
  28  | 	}) => {
  29  | 		await page.goto("/login");
  30  | 		await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  31  | 		await expect(page.locator("#main-content")).toHaveCount(1);
  32  | 		await page.keyboard.press("Tab");
  33  | 		await expect(
  34  | 			page.getByRole("link", { name: "Pular para o conteúdo principal" }),
  35  | 		).toBeFocused();
  36  | 		await expectAxeClean(page, "/login");
  37  | 	});
  38  | 
  39  | 	test("Owner empty (live seed) is axe-clean", async ({ page }) => {
  40  | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  41  | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
> 42  | 		await expect(page.getByTestId("owner-operational-empty")).toBeVisible();
      |                                                             ^ Error: expect(locator).toBeVisible() failed
  43  | 		await expect(page.getByTestId("honest-state-empty")).toBeVisible();
  44  | 		await expectAxeClean(page, "/agency owner empty");
  45  | 	});
  46  | 
  47  | 	test("Owner loading HonestState is axe-clean", async ({ page }) => {
  48  | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  49  | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  50  | 		await holdPostLoginContext(page);
  51  | 		await page.reload({ waitUntil: "domcontentloaded" });
  52  | 		await expect(page.getByTestId("honest-state-loading")).toBeVisible({
  53  | 			timeout: 10_000,
  54  | 		});
  55  | 		await expectAxeClean(page, "/agency loading");
  56  | 		await page.unroute("**/v1/auth/post-login-context");
  57  | 	});
  58  | 
  59  | 	test("Owner stale HonestState is axe-clean", async ({ page }) => {
  60  | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  61  | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  62  | 		await stalePostLoginContext(page);
  63  | 		await page.reload({ waitUntil: "domcontentloaded" });
  64  | 		await expect(page.getByTestId("honest-state-stale")).toBeVisible({
  65  | 			timeout: 10_000,
  66  | 		});
  67  | 		await expectAxeClean(page, "/agency stale");
  68  | 	});
  69  | 
  70  | 	test("Operator empty is axe-clean", async ({ page }) => {
  71  | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  72  | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  73  | 		await expect(page.getByTestId("operator-operational-empty")).toBeVisible();
  74  | 		await expectAxeClean(page, "/operator empty");
  75  | 	});
  76  | 
  77  | 	test("Operator loading HonestState is axe-clean", async ({ page }) => {
  78  | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  79  | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  80  | 		await holdPostLoginContext(page);
  81  | 		await page.reload({ waitUntil: "domcontentloaded" });
  82  | 		await expect(page.getByTestId("honest-state-loading")).toBeVisible({
  83  | 			timeout: 10_000,
  84  | 		});
  85  | 		await expectAxeClean(page, "/operator loading");
  86  | 		await page.unroute("**/v1/auth/post-login-context");
  87  | 	});
  88  | 
  89  | 	test("Operator stale HonestState is axe-clean", async ({ page }) => {
  90  | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  91  | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  92  | 		await stalePostLoginContext(page);
  93  | 		await page.reload({ waitUntil: "domcontentloaded" });
  94  | 		await expect(page.getByTestId("honest-state-stale")).toBeVisible({
  95  | 			timeout: 10_000,
  96  | 		});
  97  | 		await expectAxeClean(page, "/operator stale");
  98  | 	});
  99  | 
  100 | 	test("denied panel (loader fixture, platformAccess=false) is axe-clean", async ({
  101 | 		page,
  102 | 	}) => {
  103 | 		await page.route("**/v1/auth/post-login-context", (route) =>
  104 | 			route.fulfill({
  105 | 				status: 200,
  106 | 				contentType: "application/json",
  107 | 				body: JSON.stringify(deniedPostLoginFixture),
  108 | 			}),
  109 | 		);
  110 | 		await page.goto("/access-denied");
  111 | 		await expect(page.getByTestId("honest-state-denied")).toBeVisible({
  112 | 			timeout: 10_000,
  113 | 		});
  114 | 		await expect(page.getByRole("heading", { name: "Acesso não autorizado" })).toBeVisible();
  115 | 		await expectAxeClean(page, "/access-denied");
  116 | 	});
  117 | 
  118 | 	test("/platform bounce fail-closed lands on axe-clean Owner shell", async ({
  119 | 		page,
  120 | 	}) => {
  121 | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  122 | 		await expect(page).toHaveURL(/\/agency\//, { timeout: 20_000 });
  123 | 		await page.goto("/platform");
  124 | 		await expect(page).not.toHaveURL(/\/platform$/, { timeout: 20_000 });
  125 | 		await expect(page.getByRole("heading", { name: "Platform Console" })).toHaveCount(
  126 | 			0,
  127 | 		);
  128 | 		await expect(page).toHaveURL(/\/agency\//);
  129 | 		await expectAxeClean(page, "after /platform bounce");
  130 | 	});
  131 | 
  132 | 	test("/partner bounce fail-closed lands on axe-clean Owner shell", async ({
  133 | 		page,
  134 | 	}) => {
  135 | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  136 | 		await expect(page).toHaveURL(/\/agency\//, { timeout: 20_000 });
  137 | 		await page.goto("/partner");
  138 | 		await expect(page).not.toHaveURL(/\/partner$/, { timeout: 20_000 });
  139 | 		await expect(page.getByRole("heading", { name: "Partner Console" })).toHaveCount(
  140 | 			0,
  141 | 		);
  142 | 		await expect(page).toHaveURL(/\/agency\//);
```