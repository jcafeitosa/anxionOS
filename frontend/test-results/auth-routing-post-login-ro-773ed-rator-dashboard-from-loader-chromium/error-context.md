# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auth-routing.spec.ts >> post-login routing (live Better Auth) >> operator membership opens Operator dashboard from loader
- Location: e2e/auth-routing.spec.ts:36:2

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByText('C-level')
Expected: 0
Received: 1
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" getByText('C-level') with timeout 5000ms
  - waiting for getByText('C-level')
    14 × locator resolved to 1 element
       - unexpected value "1"

```

# Page snapshot

```yaml
- generic [active] [ref=f2e1]:
  - link "Pular para o conteúdo principal" [ref=f2e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=f2e4]:
    - complementary "Navegação principal" [ref=f2e5]:
      - generic [ref=f2e11]:
        - paragraph [ref=f2e12]: anxionOS
        - paragraph [ref=f2e13]: Operator Console
      - navigation "Menu Operator Console" [ref=f2e14]:
        - link "Visão geral" [ref=f2e15] [cursor=pointer]:
          - /url: /operator/2f5d7f34-2fd1-41ef-b84a-c3a750871c65
        - link "Equipe" [ref=f2e21] [cursor=pointer]:
          - /url: /operator/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#team
        - link "Atividade" [ref=f2e27] [cursor=pointer]:
          - /url: /operator/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#activity
        - link "Configurações" [ref=f2e30] [cursor=pointer]:
          - /url: /operator/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#settings
    - generic [ref=f2e34]:
      - banner [ref=f2e35]:
        - generic [ref=f2e37]:
          - heading "Operator Console" [level=1] [ref=f2e38]
          - paragraph [ref=f2e39]: Agência 2f5d7f34-2fd1-41ef-b84a-c3a750871c65 · operator
        - status "Sessão" [ref=f2e40]:
          - generic [ref=f2e43]: operator@anxionos.local
      - main [ref=f2e44]:
        - generic [ref=f2e45]:
          - region [ref=f2e46]:
            - heading "Trilha de autorização" [level=2] [ref=f2e47]
            - list [ref=f2e48]:
              - listitem [ref=f2e49]:
                - paragraph [ref=f2e55]: Sessão
                - paragraph [ref=f2e56]: frontend · Better Auth
              - listitem [ref=f2e57]:
                - paragraph [ref=f2e62]: post-login-context
                - paragraph [ref=f2e63]: backend · GET /v1/auth/post-login-context
              - listitem [ref=f2e64]:
                - paragraph [ref=f2e69]: Operator Console
                - paragraph [ref=f2e70]: security · operator · MEMBERSHIP_OPERATOR
          - generic [ref=f2e71]:
            - toolbar "Ações do diagrama" [ref=f2e72]:
              - button "Show all" [ref=f2e73] [cursor=pointer]
              - button "Caminho principal" [pressed] [ref=f2e74] [cursor=pointer]
              - button "Inferência" [ref=f2e75] [cursor=pointer]
            - heading "anxionOS — visão operator" [level=2] [ref=f2e78]
            - paragraph [ref=f2e79]: Consoles Astro até domínio, PostgreSQL autoritativo e projeção Neo4j.
            - generic [ref=f2e80]:
              - complementary [ref=f2e81]:
                - generic [ref=f2e82]: Encontrar nó
                - searchbox "Encontrar nó" [ref=f2e84]
                - list "Nós do diagrama" [ref=f2e85]:
                  - listitem [ref=f2e86]:
                    - button "brain/ External" [ref=f2e87] [cursor=pointer]:
                      - generic [ref=f2e88]: brain/
                      - generic [ref=f2e89]: External
                  - listitem [ref=f2e90]:
                    - button "Humanos External" [ref=f2e91] [cursor=pointer]:
                      - generic [ref=f2e92]: Humanos
                      - generic [ref=f2e93]: External
                  - listitem [ref=f2e94]:
                    - button "Consoles Frontend" [ref=f2e95] [cursor=pointer]:
                      - generic [ref=f2e96]: Consoles
                      - generic [ref=f2e97]: Frontend
                  - listitem [ref=f2e98]:
                    - button "API Backend" [ref=f2e99] [cursor=pointer]:
                      - generic [ref=f2e100]: API
                      - generic [ref=f2e101]: Backend
                  - listitem [ref=f2e102]:
                    - button "Workers Backend" [ref=f2e103] [cursor=pointer]:
                      - generic [ref=f2e104]: Workers
                      - generic [ref=f2e105]: Backend
                  - listitem [ref=f2e106]:
                    - button "Módulos Backend" [ref=f2e107] [cursor=pointer]:
                      - generic [ref=f2e108]: Módulos
                      - generic [ref=f2e109]: Backend
                  - listitem [ref=f2e110]:
                    - button "Neo4j Database" [ref=f2e111] [cursor=pointer]:
                      - generic [ref=f2e112]: Neo4j
                      - generic [ref=f2e113]: Database
                  - listitem [ref=f2e114]:
                    - button "PostgreSQL Database" [ref=f2e115] [cursor=pointer]:
                      - generic [ref=f2e116]: PostgreSQL
                      - generic [ref=f2e117]: Database
                  - listitem [ref=f2e118]:
                    - button "Eventing Message bus" [ref=f2e119] [cursor=pointer]:
                      - generic [ref=f2e120]: Eventing
                      - generic [ref=f2e121]: Message bus
                  - listitem [ref=f2e122]:
                    - button "Connections Backend" [ref=f2e123] [cursor=pointer]:
                      - generic [ref=f2e124]: Connections
                      - generic [ref=f2e125]: Backend
                  - listitem [ref=f2e126]:
                    - button "Providers External" [ref=f2e127] [cursor=pointer]:
                      - generic [ref=f2e128]: Providers
                      - generic [ref=f2e129]: External
              - generic [ref=f2e130]:
                - 'img "anxionOS — visão operator Diagrama institucional Archify classic: consoles Astro, 23 módulos, PostgreSQL autoritativo e Neo4j como projeção." [ref=f2e132]':
                  - generic [ref=f2e133]: HTTPS
                  - generic [ref=f2e135]: /api
                  - generic [ref=f2e137]: commands
                  - generic [ref=f2e139]: projections
                  - generic [ref=f2e142]: journal
                  - button "brain/, External" [ref=f2e144] [cursor=pointer]:
                    - generic [ref=f2e146]: brain/
                    - generic [ref=f2e147]: OKF local
                  - button "Humanos, External" [ref=f2e148] [cursor=pointer]:
                    - generic [ref=f2e150]: Humanos
                    - generic [ref=f2e151]: Owner · papéis
                  - button "Consoles, Frontend" [ref=f2e152] [cursor=pointer]:
                    - generic [ref=f2e154]: Consoles
                    - generic [ref=f2e155]: Astro + React
                  - button "API, Backend" [ref=f2e156] [cursor=pointer]:
                    - generic [ref=f2e158]: API
                    - generic [ref=f2e159]: Bun + Elysia
                  - button "Workers, Backend" [ref=f2e160] [cursor=pointer]:
                    - generic [ref=f2e162]: Workers
                    - generic [ref=f2e163]: TypeScript
                  - button "Módulos, Backend" [ref=f2e164] [cursor=pointer]:
                    - generic [ref=f2e166]: Módulos
                    - generic [ref=f2e167]: 23 contexts
                  - button "Neo4j, Database" [ref=f2e168] [cursor=pointer]:
                    - generic [ref=f2e170]: Neo4j
                    - generic [ref=f2e171]: projeção
                  - button "PostgreSQL, Database" [ref=f2e172] [cursor=pointer]:
                    - generic [ref=f2e174]: PostgreSQL
                    - generic [ref=f2e175]: TS · pgvector
                  - button "Eventing, Message bus" [ref=f2e176] [cursor=pointer]:
                    - generic [ref=f2e178]: Eventing
                    - generic [ref=f2e179]: outbox · NATS
                  - button "Connections, Backend" [ref=f2e180] [cursor=pointer]:
                    - generic [ref=f2e182]: Connections
                    - generic [ref=f2e183]: LLM · venues
                  - button "Providers, External" [ref=f2e184] [cursor=pointer]:
                    - generic [ref=f2e186]: Providers
                    - generic [ref=f2e187]: externos
                - toolbar "Zoom do diagrama" [ref=f2e188]:
                  - button "Diminuir zoom" [ref=f2e189] [cursor=pointer]
                  - button "Redefinir zoom" [ref=f2e191] [cursor=pointer]: 100%
                  - button "Aumentar zoom" [ref=f2e192] [cursor=pointer]
                - list "Legenda semântica" [ref=f2e194]:
                  - listitem [ref=f2e195]: Frontend
                  - listitem [ref=f2e197]: Backend
                  - listitem [ref=f2e199]: Database
                  - listitem [ref=f2e201]: Message bus
                  - listitem [ref=f2e203]: External
              - complementary [ref=f2e205]:
                - paragraph [ref=f2e206]: Semantic passport
                - heading "Consoles" [level=3] [ref=f2e207]
                - generic [ref=f2e208]:
                  - generic [ref=f2e209]:
                    - term [ref=f2e210]: tipo
                    - definition [ref=f2e211]: Frontend
                  - generic [ref=f2e212]:
                    - term [ref=f2e213]: id
                    - definition [ref=f2e214]: frontend
                  - generic [ref=f2e215]:
                    - term [ref=f2e216]: tag
                    - definition [ref=f2e217]: frontend/
                - generic [ref=f2e218]:
                  - paragraph [ref=f2e219]: Relações autoradas
                  - list [ref=f2e220]:
                    - listitem [ref=f2e221]: OUT → API · /api
                    - listitem [ref=f2e222]: IN ← Humanos · HTTPS
                - generic [ref=f2e223]:
                  - paragraph [ref=f2e224]: Dados do loader
                  - generic [ref=f2e225]:
                    - generic [ref=f2e226]:
                      - term [ref=f2e227]: agencyId
                      - definition [ref=f2e228]: 2f5d7f34-2fd1-41ef-b84a-c3a750871c65
                    - generic [ref=f2e229]:
                      - term [ref=f2e230]: role
                      - definition [ref=f2e231]: operator
                  - paragraph [ref=f2e232]: platformAccess=false — console /platform permanece negado.
            - generic [ref=f2e233]:
              - article [ref=f2e234]:
                - heading "Fontes OpenKnowledge" [level=3] [ref=f2e237]
                - list [ref=f2e238]:
                  - listitem [ref=f2e239]: ADR0002 aceito — 23 módulos; tools ainda proposta (ADR0003)
                  - listitem [ref=f2e240]: ADR0004 aceito — Neo4j + PostgreSQL/Timescale/pgvector
                  - listitem [ref=f2e241]: ADR0001 proposto — grafo operacional sem ser ledger
              - article [ref=f2e242]:
                - heading "Evidência no repo" [level=3] [ref=f2e245]
                - list [ref=f2e246]:
                  - listitem [ref=f2e247]: Esqueleto em backend/modules (23 donos + adapter-gateway fora do baseline)
                  - listitem [ref=f2e248]: frontend/ Astro; API Bun+Elysia; eventing/database packages
                  - listitem [ref=f2e249]: Implantação de produção não verificada
            - region [ref=f2e250]:
              - heading "Dados operacionais" [level=2] [ref=f2e251]
              - generic [ref=f2e253]:
                - paragraph [ref=f2e254]: Vazio
                - heading "Agentes e portfólio ainda não alimentam este console" [level=1] [ref=f2e255]
                - paragraph [ref=f2e256]: O vazio é o estado autoritativo. Nenhum C-level, tenant demo ou número financeiro é inventado aqui.
      - contentinfo [ref=f2e257]: anxionOS · Operator Console · shells honestos ANX-297
  - generic [ref=f2e260]:
    - button [ref=f2e261]
    - button [ref=f2e267]
    - button [ref=f2e271]
    - button [ref=f2e279]
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
  29  | 		await expect(page.getByTestId("owner-operational-empty")).toContainText(
  30  | 			"Agentes e portfólio ainda não alimentam este console",
  31  | 		);
  32  | 		await expect(page.getByText("tn_demo_001")).toHaveCount(0);
  33  | 		await expect(page.getByText("C-level")).toHaveCount(0);
  34  | 	});
  35  | 
  36  | 	test("operator membership opens Operator dashboard from loader", async ({ page }) => {
  37  | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  38  | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  39  | 		await expect(
  40  | 			page.getByRole("heading", { name: "Operator Console" }),
  41  | 		).toBeVisible();
  42  | 		await expect(page.getByTestId("operator-dashboard")).toBeVisible();
  43  | 		await expect(page.getByTestId("archify-canvas")).toBeVisible();
  44  | 		const url = page.url();
  45  | 		const agencyId = url.match(/\/operator\/([0-9a-f-]{36})$/)?.[1];
  46  | 		expect(agencyId).toBeTruthy();
  47  | 		await expect(page.getByTestId("operator-membership")).toContainText(agencyId!);
  48  | 		await expect(page.getByTestId("operator-membership")).toContainText("operator");
  49  | 		await expect(page.getByTestId("operator-platform-grant")).toContainText(
  50  | 			"platformAccess=false",
  51  | 		);
  52  | 		await expect(page.getByTestId("operator-operational-empty")).toContainText(
  53  | 			"Agentes e portfólio ainda não alimentam este console",
  54  | 		);
  55  | 		await expect(page.getByText("tn_demo_001")).toHaveCount(0);
> 56  | 		await expect(page.getByText("C-level")).toHaveCount(0);
      |                                           ^ Error: expect(locator).toHaveCount(expected) failed
  57  | 	});
  58  | 
  59  | 	test("zero memberships open onboarding", async ({ page }) => {
  60  | 		await signInLive(page, DEV_SEED_ACCOUNTS.none);
  61  | 		await expect(page).toHaveURL(/\/onboarding$/, { timeout: 20_000 });
  62  | 	});
  63  | 
  64  | 	test("multiple memberships open select-organization", async ({ page }) => {
  65  | 		await signInLive(page, DEV_SEED_ACCOUNTS.multi);
  66  | 		await expect(page).toHaveURL(/\/select-organization$/, { timeout: 20_000 });
  67  | 		await expect(
  68  | 			page.getByRole("heading", { name: "Escolher organização" }),
  69  | 		).toBeVisible();
  70  | 	});
  71  | 
  72  | 	test("without PLATFORM/partner grant does not open those consoles", async ({
  73  | 		page,
  74  | 	}) => {
  75  | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  76  | 		await expect(page).toHaveURL(/\/agency\//, { timeout: 20_000 });
  77  | 		await page.goto("/platform");
  78  | 		await expect(page).not.toHaveURL(/\/platform$/);
  79  | 		await page.goto("/partner");
  80  | 		await expect(page).not.toHaveURL(/\/partner$/);
  81  | 	});
  82  | 
  83  | 	test("operator without PLATFORM grant is blocked from /platform", async ({
  84  | 		page,
  85  | 	}) => {
  86  | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  87  | 		await expect(page).toHaveURL(/\/operator\//, { timeout: 20_000 });
  88  | 		await page.goto("/platform");
  89  | 		await expect(page).not.toHaveURL(/\/platform$/);
  90  | 		await expect(page.getByRole("heading", { name: "Platform Console" })).toHaveCount(
  91  | 			0,
  92  | 		);
  93  | 	});
  94  | 
  95  | 	test("skip-link is reachable on ready Owner shell", async ({ page }) => {
  96  | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  97  | 		await expect(page.getByRole("heading", { name: "Owner Console" })).toBeVisible({
  98  | 			timeout: 20_000,
  99  | 		});
  100 | 		await page.keyboard.press("Tab");
  101 | 		const skip = page.getByRole("link", { name: "Pular para o conteúdo principal" });
  102 | 		await expect(skip).toBeFocused();
  103 | 	});
  104 | });
  105 | 
```