# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y-console.spec.ts >> WCAG 2.2 axe — login + shells (ANX-340) >> Operator intervention panels (live seed) are axe-clean
- Location: e2e/a11y-console.spec.ts:73:2

# Error details

```
Error: /operator intervention panels: [
  {
    "id": "color-contrast",
    "impact": "serious",
    "tags": [
      "cat.color",
      "wcag2aa",
      "wcag143",
      "TTv5",
      "TT13.c",
      "EN-301-549",
      "EN-9.1.4.3",
      "ACT",
      "RGAAv4",
      "RGAA-3.2.1"
    ],
    "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
    "help": "Elements must meet minimum color contrast ratio thresholds",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright",
    "nodes": [
      {
        "any": [
          {
            "id": "color-contrast",
            "data": {
              "fgColor": "#f8fafc",
              "bgColor": "#ef4444",
              "contrastRatio": 3.59,
              "fontSize": "10.5pt (14px)",
              "fontWeight": "normal",
              "messageKey": null,
              "expectedContrastRatio": "4.5:1"
            },
            "relatedNodes": [
              {
                "html": "<button type=\"button\" class=\"inline-flex min-h-11...\" data-testid=\"operator-kill-switch...\">",
                "target": [
                  ".border-destructive"
                ]
              }
            ],
            "impact": "serious",
            "message": "Element has insufficient color contrast of 3.59 (foreground color: #f8fafc, background color: #ef4444, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<button type=\"button\" class=\"inline-flex min-h-11...\" data-testid=\"operator-kill-switch...\">",
        "target": [
          ".border-destructive"
        ],
        "failureSummary": "Fix any of the following:\n  Element has insufficient color contrast of 3.59 (foreground color: #f8fafc, background color: #ef4444, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1"
      }
    ]
  }
]

expect(received).toEqual(expected) // deep equality

- Expected  -  1
+ Received  + 58

- Array []
+ Array [
+   Object {
+     "description": "Ensure the contrast between foreground and background colors meets WCAG 2 AA minimum contrast ratio thresholds",
+     "help": "Elements must meet minimum color contrast ratio thresholds",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/color-contrast?application=playwright",
+     "id": "color-contrast",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#ef4444",
+               "contrastRatio": 3.59,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#f8fafc",
+               "fontSize": "10.5pt (14px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.59 (foreground color: #f8fafc, background color: #ef4444, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<button type=\"button\" class=\"inline-flex min-h-11...\" data-testid=\"operator-kill-switch...\">",
+                 "target": Array [
+                   ".border-destructive",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.59 (foreground color: #f8fafc, background color: #ef4444, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<button type=\"button\" class=\"inline-flex min-h-11...\" data-testid=\"operator-kill-switch...\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".border-destructive",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.color",
+       "wcag2aa",
+       "wcag143",
+       "TTv5",
+       "TT13.c",
+       "EN-301-549",
+       "EN-9.1.4.3",
+       "ACT",
+       "RGAAv4",
+       "RGAA-3.2.1",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=f2e1]:
  - link "Pular para o conteúdo principal" [ref=f2e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=f2e4]:
    - generic [ref=f2e5]:
      - navigation "Menu Operator Console" [ref=f2e12]:
        - link [ref=f2e13] [cursor=pointer]:
          - /url: /operator/2f5d7f34-2fd1-41ef-b84a-c3a750871c65
        - link [ref=f2e19] [cursor=pointer]:
          - /url: /operator/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#activity
        - link [ref=f2e24] [cursor=pointer]:
          - /url: /operator/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#settings
        - link [ref=f2e28] [cursor=pointer]:
          - /url: /login
      - generic [ref=f2e32]:
        - status "Sessão" [ref=f2e33]
        - generic [ref=f2e36]:
          - generic [aria-hidden] [ref=f2e37]: O
          - generic [ref=f2e38]: operator@anxionos.local
    - generic [ref=f2e39]:
      - banner [ref=f2e40]:
        - generic [ref=f2e41]:
          - heading "Operator Console" [level=1] [ref=f2e42]
          - paragraph [ref=f2e43]: Agência 2f5d7f34-2fd1-41ef-b84a-c3a750871c65 · operator
        - status "Sessão" [ref=f2e44]:
          - generic [ref=f2e47]: operator@anxionos.local
      - main [ref=f2e48]:
        - generic [ref=f2e49]:
          - region [ref=f2e50]:
            - heading "Trilha de autorização" [level=2] [ref=f2e51]
            - list [ref=f2e52]:
              - listitem [ref=f2e53]:
                - paragraph [ref=f2e59]: Sessão
                - paragraph [ref=f2e60]: frontend · Better Auth
              - listitem [ref=f2e61]:
                - paragraph [ref=f2e66]: post-login-context
                - paragraph [ref=f2e67]: backend · GET /v1/auth/post-login-context
              - listitem [ref=f2e68]:
                - paragraph [ref=f2e73]: Operator Console
                - paragraph [ref=f2e74]: security · operator · MEMBERSHIP_OPERATOR
          - generic [ref=f2e75]:
            - toolbar "Ações do diagrama" [ref=f2e76]:
              - button "Show all" [ref=f2e77] [cursor=pointer]
              - button "Caminho principal" [pressed] [ref=f2e78] [cursor=pointer]
              - button "Inferência" [ref=f2e79] [cursor=pointer]
            - heading "anxionOS — visão operator" [level=2] [ref=f2e82]
            - paragraph [ref=f2e83]: Consoles Astro até domínio, PostgreSQL autoritativo e projeção Neo4j.
            - generic [ref=f2e84]:
              - complementary [ref=f2e85]:
                - generic [ref=f2e86]: Encontrar nó
                - searchbox "Encontrar nó" [ref=f2e88]
                - list "Nós do diagrama" [ref=f2e89]:
                  - listitem [ref=f2e90]:
                    - button "brain/ External" [ref=f2e91] [cursor=pointer]:
                      - generic [ref=f2e92]: brain/
                      - generic [ref=f2e93]: External
                  - listitem [ref=f2e94]:
                    - button "Humanos External" [ref=f2e95] [cursor=pointer]:
                      - generic [ref=f2e96]: Humanos
                      - generic [ref=f2e97]: External
                  - listitem [ref=f2e98]:
                    - button "Consoles Frontend" [ref=f2e99] [cursor=pointer]:
                      - generic [ref=f2e100]: Consoles
                      - generic [ref=f2e101]: Frontend
                  - listitem [ref=f2e102]:
                    - button "API Backend" [ref=f2e103] [cursor=pointer]:
                      - generic [ref=f2e104]: API
                      - generic [ref=f2e105]: Backend
                  - listitem [ref=f2e106]:
                    - button "Workers Backend" [ref=f2e107] [cursor=pointer]:
                      - generic [ref=f2e108]: Workers
                      - generic [ref=f2e109]: Backend
                  - listitem [ref=f2e110]:
                    - button "Módulos Backend" [ref=f2e111] [cursor=pointer]:
                      - generic [ref=f2e112]: Módulos
                      - generic [ref=f2e113]: Backend
                  - listitem [ref=f2e114]:
                    - button "Neo4j Database" [ref=f2e115] [cursor=pointer]:
                      - generic [ref=f2e116]: Neo4j
                      - generic [ref=f2e117]: Database
                  - listitem [ref=f2e118]:
                    - button "PostgreSQL Database" [ref=f2e119] [cursor=pointer]:
                      - generic [ref=f2e120]: PostgreSQL
                      - generic [ref=f2e121]: Database
                  - listitem [ref=f2e122]:
                    - button "Eventing Message bus" [ref=f2e123] [cursor=pointer]:
                      - generic [ref=f2e124]: Eventing
                      - generic [ref=f2e125]: Message bus
                  - listitem [ref=f2e126]:
                    - button "Connections Backend" [ref=f2e127] [cursor=pointer]:
                      - generic [ref=f2e128]: Connections
                      - generic [ref=f2e129]: Backend
                  - listitem [ref=f2e130]:
                    - button "Providers External" [ref=f2e131] [cursor=pointer]:
                      - generic [ref=f2e132]: Providers
                      - generic [ref=f2e133]: External
              - generic [ref=f2e134]:
                - 'group "anxionOS — visão operator Diagrama institucional Archify classic: consoles Astro, 23 módulos, PostgreSQL autoritativo e Neo4j como projeção." [ref=f2e136]':
                  - generic [ref=f2e137]: HTTPS
                  - generic [ref=f2e139]: /api
                  - generic [ref=f2e141]: commands
                  - generic [ref=f2e143]: projections
                  - generic [ref=f2e146]: journal
                  - button "brain/, External" [ref=f2e148] [cursor=pointer]:
                    - generic [ref=f2e150]: brain/
                    - generic [ref=f2e151]: OKF local
                  - button "Humanos, External" [ref=f2e152] [cursor=pointer]:
                    - generic [ref=f2e154]: Humanos
                    - generic [ref=f2e155]: Owner · papéis
                  - button "Consoles, Frontend" [ref=f2e156] [cursor=pointer]:
                    - generic [ref=f2e158]: Consoles
                    - generic [ref=f2e159]: Astro + React
                  - button "API, Backend" [ref=f2e160] [cursor=pointer]:
                    - generic [ref=f2e162]: API
                    - generic [ref=f2e163]: Bun + Elysia
                  - button "Workers, Backend" [ref=f2e164] [cursor=pointer]:
                    - generic [ref=f2e166]: Workers
                    - generic [ref=f2e167]: TypeScript
                  - button "Módulos, Backend" [ref=f2e168] [cursor=pointer]:
                    - generic [ref=f2e170]: Módulos
                    - generic [ref=f2e171]: 23 contexts
                  - button "Neo4j, Database" [ref=f2e172] [cursor=pointer]:
                    - generic [ref=f2e174]: Neo4j
                    - generic [ref=f2e175]: projeção
                  - button "PostgreSQL, Database" [ref=f2e176] [cursor=pointer]:
                    - generic [ref=f2e178]: PostgreSQL
                    - generic [ref=f2e179]: TS · pgvector
                  - button "Eventing, Message bus" [ref=f2e180] [cursor=pointer]:
                    - generic [ref=f2e182]: Eventing
                    - generic [ref=f2e183]: outbox · NATS
                  - button "Connections, Backend" [ref=f2e184] [cursor=pointer]:
                    - generic [ref=f2e186]: Connections
                    - generic [ref=f2e187]: LLM · venues
                  - button "Providers, External" [ref=f2e188] [cursor=pointer]:
                    - generic [ref=f2e190]: Providers
                    - generic [ref=f2e191]: externos
                - toolbar "Zoom do diagrama" [ref=f2e192]:
                  - button "Diminuir zoom" [ref=f2e193] [cursor=pointer]
                  - button "Redefinir zoom" [ref=f2e195] [cursor=pointer]: 100%
                  - button "Aumentar zoom" [ref=f2e196] [cursor=pointer]
                - list "Legenda semântica" [ref=f2e198]:
                  - listitem [ref=f2e199]: Frontend
                  - listitem [ref=f2e201]: Backend
                  - listitem [ref=f2e203]: Database
                  - listitem [ref=f2e205]: Message bus
                  - listitem [ref=f2e207]: External
              - complementary [ref=f2e209]:
                - paragraph [ref=f2e210]: Semantic passport
                - heading "Consoles" [level=3] [ref=f2e211]
                - generic [ref=f2e212]:
                  - generic [ref=f2e213]:
                    - term [ref=f2e214]: tipo
                    - definition [ref=f2e215]: Frontend
                  - generic [ref=f2e216]:
                    - term [ref=f2e217]: id
                    - definition [ref=f2e218]: frontend
                  - generic [ref=f2e219]:
                    - term [ref=f2e220]: tag
                    - definition [ref=f2e221]: frontend/
                - generic [ref=f2e222]:
                  - paragraph [ref=f2e223]: Relações autoradas
                  - list [ref=f2e224]:
                    - listitem [ref=f2e225]: OUT → API · /api
                    - listitem [ref=f2e226]: IN ← Humanos · HTTPS
                - generic [ref=f2e227]:
                  - paragraph [ref=f2e228]: Dados do loader
                  - generic [ref=f2e229]:
                    - generic [ref=f2e230]:
                      - term [ref=f2e231]: agencyId
                      - definition [ref=f2e232]: 2f5d7f34-2fd1-41ef-b84a-c3a750871c65
                    - generic [ref=f2e233]:
                      - term [ref=f2e234]: role
                      - definition [ref=f2e235]: operator
                  - paragraph [ref=f2e236]: platformAccess=false — console /platform permanece negado.
                  - paragraph [ref=f2e237]: partnerAccess=false — console /partner permanece negado.
            - generic [ref=f2e238]:
              - article [ref=f2e239]:
                - heading "Fontes OpenKnowledge" [level=3] [ref=f2e242]
                - list [ref=f2e243]:
                  - listitem [ref=f2e244]: ADR0002 aceito — 23 módulos; tools ainda proposta (ADR0003)
                  - listitem [ref=f2e245]: ADR0004 aceito — Neo4j + PostgreSQL/Timescale/pgvector
                  - listitem [ref=f2e246]: ADR0001 proposto — grafo operacional sem ser ledger
              - article [ref=f2e247]:
                - heading "Evidência no repo" [level=3] [ref=f2e250]
                - list [ref=f2e251]:
                  - listitem [ref=f2e252]: Esqueleto em backend/modules (23 donos + adapter-gateway fora do baseline)
                  - listitem [ref=f2e253]: frontend/ Astro; API Bun+Elysia; eventing/database packages
                  - listitem [ref=f2e254]: Implantação de produção não verificada
            - generic [ref=f2e255]:
              - region [ref=f2e256]:
                - heading "Dados operacionais" [level=2] [ref=f2e257]
                - region [ref=f2e258]:
                  - heading "Incidentes operacionais" [level=3] [ref=f2e259]
                  - generic [ref=f2e260]:
                    - paragraph [ref=f2e261]: Vazio
                    - heading "Nenhum incidente registrado" [level=3] [ref=f2e262]
                    - paragraph [ref=f2e263]: "Nenhum incidente aberto nesta agência. Contrato: GET /v1/operations/agencies/:agencyId/incidents (collection). createOperationsPlugin handleListIncidents → listIncidents; DTO incidentSnapshotSchema em @anxionos/contracts/operations. Mutations exigem operator+ e Idempotency-Key."
                - region [ref=f2e264]:
                  - heading "Takeover operacional" [level=3] [ref=f2e265]
                  - paragraph [ref=f2e266]: GET /v1/agencies/:agencyId/agents (collection) + GET /v1/agencies/:agencyId/agents/:agentId/autonomy por agente. Nível L0–L4 só quando a API devolve; sem atribuição = honesto vazio. Operator console não inventa agentes nem níveis.
                  - paragraph [ref=f2e267]: "POST /v1/agencies/:agencyId/agents/:agentId/autonomy/transition — transitionKind: takeover, targetLevel (L2 operator), evidenceHash, approvalId. Idempotency-Key (institutional UUID). DTO governanceCommandResultSchema em @anxionos/contracts/governance."
                  - generic [ref=f2e268]:
                    - paragraph [ref=f2e269]: Vazio
                    - heading "Listagem de agentes ainda não publicada" [level=3] [ref=f2e270]
                    - paragraph [ref=f2e271]: Listagem de agentes ainda não publicada. GET /v1/agencies/:agencyId/agents (collection) + GET /v1/agencies/:agencyId/agents/:agentId/autonomy por agente. Nível L0–L4 só quando a API devolve; sem atribuição = honesto vazio. Operator console não inventa agentes nem níveis.
                - region [ref=f2e272]:
                  - heading "Kill switch de risco" [level=3] [ref=f2e273]
                  - paragraph [ref=f2e274]: GET /v1/risk/agencies/:agencyId/kill-switch. Montado em apps/api via createRiskPlugin; DTO alinhado a riskKillSwitchScopeSchema e riskCommandResultSchema em @anxionos/contracts/risk.
                  - paragraph [ref=f2e275]: "POST /v1/risk/agencies/:agencyId/kill-switch/{activate|release}. Montado em apps/api via createRiskPlugin + Idempotency-Key (institutional UUID). DTO riskCommandResultSchema em @anxionos/contracts/risk."
                  - generic [ref=f2e276]:
                    - paragraph [ref=f2e277]: Inativo · ORGANIZATION
                    - paragraph [ref=f2e278]: sem killSwitchId · org 2f5d7f34-2fd1-41ef-b84a-c3a750871c65 · riskEpoch 0
                    - generic [ref=f2e279]:
                      - button "Ativar kill switch" [ref=f2e280] [cursor=pointer]
                      - button "Liberar kill switch" [disabled] [ref=f2e281]
              - region [ref=f2e282]:
                - heading "Ordens de execução" [level=2] [ref=f2e283]
                - paragraph [ref=f2e284]: GET /v1/execution/agencies/:agencyId/orders (collection). Montado em apps/api via createExecutionPlugin; DTO alinhado a executionOrderStatusSchema e executionOrderSideSchema em @anxionos/contracts/execution. Cancel/reconcile = slices futuros com Idempotency-Key.
                - generic [ref=f2e285]:
                  - paragraph [ref=f2e286]: Vazio
                  - heading "Nenhuma ordem registrada" [level=3] [ref=f2e287]
                  - paragraph [ref=f2e288]: "Nenhuma ordem aberta nesta agência. Contrato: GET /v1/execution/agencies/:agencyId/orders (collection). Montado em apps/api via createExecutionPlugin; DTO alinhado a executionOrderStatusSchema e executionOrderSideSchema em @anxionos/contracts/execution. Cancel/reconcile = slices futuros com Idempotency-Key."
              - region [ref=f2e289]:
                - heading "Reconciliação venue" [level=2] [ref=f2e290]
                - paragraph [ref=f2e291]: GET /v1/execution/agencies/:agencyId/reconciliation-cases (collection). Montado em apps/api via createExecutionPlugin; DTO alinhado a executionReconciliationCase*Schema em @anxionos/contracts/execution. Resolve mutations = slice futuro com Idempotency-Key.
                - generic [ref=f2e292]:
                  - paragraph [ref=f2e293]: Vazio
                  - heading "Nenhum caso de reconciliação" [level=3] [ref=f2e294]
                  - paragraph [ref=f2e295]: "Nenhum caso de reconciliação venue nesta agência. Contrato: GET /v1/execution/agencies/:agencyId/reconciliation-cases (collection). Montado em apps/api via createExecutionPlugin; DTO alinhado a executionReconciliationCase*Schema em @anxionos/contracts/execution. Resolve mutations = slice futuro com Idempotency-Key."
      - contentinfo [ref=f2e296]: anxionOS · Operator Console · shells honestos ANX-297
  - generic [ref=f2e299]:
    - button [ref=f2e300]
    - button [ref=f2e306]
    - button [ref=f2e310]
    - button [ref=f2e318]
```

# Test source

```ts
  1   | import AxeBuilder from "@axe-core/playwright";
  2   | import { expect, test } from "@playwright/test";
  3   | import { deniedPostLoginFixture, expectAxeClean } from "./a11y";
  4   | import { DEV_SEED_ACCOUNTS, signInLive } from "./fixtures/live-auth";
  5   | 
  6   | async function holdPostLoginContext(page: import("@playwright/test").Page): Promise<void> {
  7   | 	await page.route("**/v1/auth/post-login-context", async (route) => {
  8   | 		await new Promise((resolve) => {
  9   | 			setTimeout(resolve, 45_000);
  10  | 		});
  11  | 		await route.continue();
  12  | 	});
  13  | }
  14  | 
  15  | async function stalePostLoginContext(page: import("@playwright/test").Page): Promise<void> {
  16  | 	await page.route("**/v1/auth/post-login-context", (route) =>
  17  | 		route.fulfill({
  18  | 			status: 503,
  19  | 			contentType: "application/json",
  20  | 			body: JSON.stringify({ error: "unavailable" }),
  21  | 		}),
  22  | 	);
  23  | }
  24  | 
  25  | test.describe("WCAG 2.2 axe — login + shells (ANX-340)", () => {
  26  | 	test.describe.configure({ mode: "serial", timeout: 60_000 });
  27  | 	test("/login loading form is axe-clean and skip-link has a target", async ({
  28  | 		page,
  29  | 	}) => {
  30  | 		await page.goto("/login");
  31  | 		await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  32  | 		await expect(page.locator("#main-content")).toHaveCount(1);
  33  | 		await page.keyboard.press("Tab");
  34  | 		await expect(
  35  | 			page.getByRole("link", { name: "Pular para o conteúdo principal" }),
  36  | 		).toBeFocused();
  37  | 		await expectAxeClean(page, "/login");
  38  | 	});
  39  | 
  40  | 	test("Owner finance panel (live seed) is axe-clean", async ({ page }) => {
  41  | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  42  | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  43  | 		await expect(page.getByTestId("owner-finance-panel")).toBeVisible();
  44  | 		await expect(
  45  | 			page.getByTestId("owner-finance-panel").getByTestId("honest-state-empty"),
  46  | 		).toBeVisible();
  47  | 		await expectAxeClean(page, "/agency owner finance panel");
  48  | 	});
  49  | 
  50  | 	test("Owner loading HonestState is axe-clean", async ({ page }) => {
  51  | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  52  | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  53  | 		await holdPostLoginContext(page);
  54  | 		await page.reload({ waitUntil: "domcontentloaded" });
  55  | 		await expect(page.getByTestId("honest-state-loading")).toBeVisible({
  56  | 			timeout: 10_000,
  57  | 		});
  58  | 		await expectAxeClean(page, "/agency loading");
  59  | 		await page.unroute("**/v1/auth/post-login-context");
  60  | 	});
  61  | 
  62  | 	test("Owner stale HonestState is axe-clean", async ({ page }) => {
  63  | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  64  | 		await expect(page).toHaveURL(/\/agency\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  65  | 		await stalePostLoginContext(page);
  66  | 		await page.reload({ waitUntil: "domcontentloaded" });
  67  | 		await expect(page.getByTestId("honest-state-stale")).toBeVisible({
  68  | 			timeout: 10_000,
  69  | 		});
  70  | 		await expectAxeClean(page, "/agency stale");
  71  | 	});
  72  | 
  73  | 	test("Operator intervention panels (live seed) are axe-clean", async ({ page }) => {
  74  | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  75  | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  76  | 		for (const testId of [
  77  | 			"operator-incidents-panel",
  78  | 			"operator-takeover-panel",
  79  | 			"operator-kill-switch-panel",
  80  | 			"operator-orders-panel",
  81  | 			"operator-reconciliation-panel",
  82  | 		] as const) {
  83  | 			await expect(page.getByTestId(testId)).toBeVisible();
  84  | 		}
  85  | 		const results = await new AxeBuilder({ page })
  86  | 			.include("#main-content")
  87  | 			.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
  88  | 			.analyze();
  89  | 		expect(
  90  | 			results.violations,
  91  | 			`/operator intervention panels: ${JSON.stringify(results.violations, null, 2)}`,
> 92  | 		).toEqual([]);
      |     ^ Error: /operator intervention panels: [
  93  | 	});
  94  | 
  95  | 	test("Operator loading HonestState is axe-clean", async ({ page }) => {
  96  | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  97  | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  98  | 		await holdPostLoginContext(page);
  99  | 		await page.reload({ waitUntil: "domcontentloaded" });
  100 | 		await expect(page.getByTestId("honest-state-loading")).toBeVisible({
  101 | 			timeout: 10_000,
  102 | 		});
  103 | 		await expectAxeClean(page, "/operator loading");
  104 | 		await page.unroute("**/v1/auth/post-login-context");
  105 | 	});
  106 | 
  107 | 	test("Operator stale HonestState is axe-clean", async ({ page }) => {
  108 | 		await signInLive(page, DEV_SEED_ACCOUNTS.operator);
  109 | 		await expect(page).toHaveURL(/\/operator\/[0-9a-f-]{36}$/, { timeout: 20_000 });
  110 | 		await stalePostLoginContext(page);
  111 | 		await page.reload({ waitUntil: "domcontentloaded" });
  112 | 		await expect(page.getByTestId("honest-state-stale")).toBeVisible({
  113 | 			timeout: 10_000,
  114 | 		});
  115 | 		await expectAxeClean(page, "/operator stale");
  116 | 	});
  117 | 
  118 | 	test("denied panel (loader fixture, platformAccess=false) is axe-clean", async ({
  119 | 		page,
  120 | 	}) => {
  121 | 		await page.route("**/v1/auth/post-login-context", (route) =>
  122 | 			route.fulfill({
  123 | 				status: 200,
  124 | 				contentType: "application/json",
  125 | 				body: JSON.stringify(deniedPostLoginFixture),
  126 | 			}),
  127 | 		);
  128 | 		await page.goto("/access-denied");
  129 | 		await expect(page.getByTestId("honest-state-denied")).toBeVisible({
  130 | 			timeout: 10_000,
  131 | 		});
  132 | 		await expect(page.getByRole("heading", { name: "Acesso não autorizado" })).toBeVisible();
  133 | 		await expectAxeClean(page, "/access-denied");
  134 | 	});
  135 | 
  136 | 	test("/platform bounce fail-closed lands on axe-clean Owner shell", async ({
  137 | 		page,
  138 | 	}) => {
  139 | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  140 | 		await expect(page).toHaveURL(/\/agency\//, { timeout: 20_000 });
  141 | 		await page.goto("/platform");
  142 | 		await expect(page).not.toHaveURL(/\/platform$/, { timeout: 20_000 });
  143 | 		await expect(page.getByRole("heading", { name: "Platform Console" })).toHaveCount(
  144 | 			0,
  145 | 		);
  146 | 		await expect(page).toHaveURL(/\/agency\//);
  147 | 		await expectAxeClean(page, "after /platform bounce");
  148 | 	});
  149 | 
  150 | 	test("/partner bounce fail-closed lands on axe-clean Owner shell", async ({
  151 | 		page,
  152 | 	}) => {
  153 | 		await signInLive(page, DEV_SEED_ACCOUNTS.owner);
  154 | 		await expect(page).toHaveURL(/\/agency\//, { timeout: 20_000 });
  155 | 		await page.goto("/partner");
  156 | 		await expect(page).not.toHaveURL(/\/partner$/, { timeout: 20_000 });
  157 | 		await expect(page.getByRole("heading", { name: "Partner Console" })).toHaveCount(
  158 | 			0,
  159 | 		);
  160 | 		await expect(page).toHaveURL(/\/agency\//);
  161 | 		await expectAxeClean(page, "after /partner bounce");
  162 | 	});
  163 | });
  164 | 
```