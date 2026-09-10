# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y-console.spec.ts >> WCAG 2.2 axe — login + shells (ANX-340) >> Owner empty (live seed) is axe-clean
- Location: e2e/a11y-console.spec.ts:39:2

# Error details

```
Error: /agency owner empty: [
  {
    "id": "nested-interactive",
    "impact": "serious",
    "tags": [
      "cat.keyboard",
      "wcag2a",
      "wcag412",
      "TTv5",
      "TT6.a",
      "EN-301-549",
      "EN-9.4.1.2",
      "RGAAv4",
      "RGAA-7.1.1"
    ],
    "description": "Ensure interactive controls are not nested as they are not always announced by screen readers or can cause focus problems for assistive technologies",
    "help": "Interactive controls must not be nested",
    "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/nested-interactive?application=playwright",
    "nodes": [
      {
        "any": [
          {
            "id": "no-focusable-content",
            "data": null,
            "relatedNodes": [
              {
                "html": "<g opacity=\"0.28\" role=\"button\" tabindex=\"0\" aria-label=\"brain/, External\" class=\"cursor-pointer\">",
                "target": [
                  "g[aria-label=\"brain/, External\"]"
                ]
              },
              {
                "html": "<g opacity=\"1\" role=\"button\" tabindex=\"0\" aria-label=\"Humanos, External\" class=\"cursor-pointer\">",
                "target": [
                  "g[aria-label=\"Humanos, External\"]"
                ]
              },
              {
                "html": "<g opacity=\"1\" role=\"button\" tabindex=\"0\" aria-label=\"Consoles, Frontend\" class=\"cursor-pointer\">",
                "target": [
                  "g[aria-label=\"Consoles, Frontend\"]"
                ]
              },
              {
                "html": "<g opacity=\"1\" role=\"button\" tabindex=\"0\" aria-label=\"API, Backend\" class=\"cursor-pointer\">",
                "target": [
                  "g[aria-label=\"API, Backend\"]"
                ]
              },
              {
                "html": "<g opacity=\"0.28\" role=\"button\" tabindex=\"0\" aria-label=\"Workers, Backend\" class=\"cursor-pointer\">",
                "target": [
                  "g[aria-label=\"Workers, Backend\"]"
                ]
              },
              {
                "html": "<g opacity=\"1\" role=\"button\" tabindex=\"0\" aria-label=\"Módulos, Backend\" class=\"cursor-pointer\">",
                "target": [
                  "g[aria-label=\"Módulos, Backend\"]"
                ]
              },
              {
                "html": "<g opacity=\"1\" role=\"button\" tabindex=\"0\" aria-label=\"Neo4j, Database\" class=\"cursor-pointer\">",
                "target": [
                  "g[aria-label=\"Neo4j, Database\"]"
                ]
              },
              {
                "html": "<g opacity=\"1\" role=\"button\" tabindex=\"0\" aria-label=\"PostgreSQL, Database\" class=\"cursor-pointer\">",
                "target": [
                  "g[aria-label=\"PostgreSQL, Database\"]"
                ]
              },
              {
                "html": "<g opacity=\"0.28\" role=\"button\" tabindex=\"0\" aria-label=\"Eventing, Message bus\" class=\"cursor-pointer\">",
                "target": [
                  "g[aria-label=\"Eventing, Message bus\"]"
                ]
              },
              {
                "html": "<g opacity=\"0.28\" role=\"button\" tabindex=\"0\" aria-label=\"Connections, Backend\" class=\"cursor-pointer\">",
                "target": [
                  "g[aria-label=\"Connections, Backend\"]"
                ]
              },
              {
                "html": "<g opacity=\"0.28\" role=\"button\" tabindex=\"0\" aria-label=\"Providers, External\" class=\"cursor-pointer\">",
                "target": [
                  "g[aria-label=\"Providers, External\"]"
                ]
              }
            ],
            "impact": "serious",
            "message": "Element has focusable descendants"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<svg viewBox=\"0 0 1300 588\" role=\"img\" aria-labelledby=\"archify-canvas-title archify-canvas-desc\" class=\"h-auto w-full\" data-testid=\"archify-canvas\">",
        "target": [
          ".h-auto"
        ],
        "failureSummary": "Fix any of the following:\n  Element has focusable descendants"
      }
    ]
  }
]

expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 109

- Array []
+ Array [
+   Object {
+     "description": "Ensure interactive controls are not nested as they are not always announced by screen readers or can cause focus problems for assistive technologies",
+     "help": "Interactive controls must not be nested",
+     "helpUrl": "https://dequeuniversity.com/rules/axe/4.13/nested-interactive?application=playwright",
+     "id": "nested-interactive",
+     "impact": "serious",
+     "nodes": Array [
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": null,
+             "id": "no-focusable-content",
+             "impact": "serious",
+             "message": "Element has focusable descendants",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<g opacity=\"0.28\" role=\"button\" tabindex=\"0\" aria-label=\"brain/, External\" class=\"cursor-pointer\">",
+                 "target": Array [
+                   "g[aria-label=\"brain/, External\"]",
+                 ],
+               },
+               Object {
+                 "html": "<g opacity=\"1\" role=\"button\" tabindex=\"0\" aria-label=\"Humanos, External\" class=\"cursor-pointer\">",
+                 "target": Array [
+                   "g[aria-label=\"Humanos, External\"]",
+                 ],
+               },
+               Object {
+                 "html": "<g opacity=\"1\" role=\"button\" tabindex=\"0\" aria-label=\"Consoles, Frontend\" class=\"cursor-pointer\">",
+                 "target": Array [
+                   "g[aria-label=\"Consoles, Frontend\"]",
+                 ],
+               },
+               Object {
+                 "html": "<g opacity=\"1\" role=\"button\" tabindex=\"0\" aria-label=\"API, Backend\" class=\"cursor-pointer\">",
+                 "target": Array [
+                   "g[aria-label=\"API, Backend\"]",
+                 ],
+               },
+               Object {
+                 "html": "<g opacity=\"0.28\" role=\"button\" tabindex=\"0\" aria-label=\"Workers, Backend\" class=\"cursor-pointer\">",
+                 "target": Array [
+                   "g[aria-label=\"Workers, Backend\"]",
+                 ],
+               },
+               Object {
+                 "html": "<g opacity=\"1\" role=\"button\" tabindex=\"0\" aria-label=\"Módulos, Backend\" class=\"cursor-pointer\">",
+                 "target": Array [
+                   "g[aria-label=\"Módulos, Backend\"]",
+                 ],
+               },
+               Object {
+                 "html": "<g opacity=\"1\" role=\"button\" tabindex=\"0\" aria-label=\"Neo4j, Database\" class=\"cursor-pointer\">",
+                 "target": Array [
+                   "g[aria-label=\"Neo4j, Database\"]",
+                 ],
+               },
+               Object {
+                 "html": "<g opacity=\"1\" role=\"button\" tabindex=\"0\" aria-label=\"PostgreSQL, Database\" class=\"cursor-pointer\">",
+                 "target": Array [
+                   "g[aria-label=\"PostgreSQL, Database\"]",
+                 ],
+               },
+               Object {
+                 "html": "<g opacity=\"0.28\" role=\"button\" tabindex=\"0\" aria-label=\"Eventing, Message bus\" class=\"cursor-pointer\">",
+                 "target": Array [
+                   "g[aria-label=\"Eventing, Message bus\"]",
+                 ],
+               },
+               Object {
+                 "html": "<g opacity=\"0.28\" role=\"button\" tabindex=\"0\" aria-label=\"Connections, Backend\" class=\"cursor-pointer\">",
+                 "target": Array [
+                   "g[aria-label=\"Connections, Backend\"]",
+                 ],
+               },
+               Object {
+                 "html": "<g opacity=\"0.28\" role=\"button\" tabindex=\"0\" aria-label=\"Providers, External\" class=\"cursor-pointer\">",
+                 "target": Array [
+                   "g[aria-label=\"Providers, External\"]",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has focusable descendants",
+         "html": "<svg viewBox=\"0 0 1300 588\" role=\"img\" aria-labelledby=\"archify-canvas-title archify-canvas-desc\" class=\"h-auto w-full\" data-testid=\"archify-canvas\">",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           ".h-auto",
+         ],
+       },
+     ],
+     "tags": Array [
+       "cat.keyboard",
+       "wcag2a",
+       "wcag412",
+       "TTv5",
+       "TT6.a",
+       "EN-301-549",
+       "EN-9.4.1.2",
+       "RGAAv4",
+       "RGAA-7.1.1",
+     ],
+   },
+ ]
```

# Page snapshot

```yaml
- generic [active] [ref=f3e1]:
  - link "Pular para o conteúdo principal" [ref=f3e2] [cursor=pointer]:
    - /url: "#main-content"
  - generic [ref=f3e4]:
    - complementary "Navegação principal" [ref=f3e5]:
      - generic [ref=f3e11]:
        - paragraph [ref=f3e12]: anxionOS
        - paragraph [ref=f3e13]: Owner Console
      - navigation "Menu Owner Console" [ref=f3e14]:
        - link "Visão geral" [ref=f3e15] [cursor=pointer]:
          - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65
        - link "Equipe" [ref=f3e21] [cursor=pointer]:
          - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#team
        - link "Atividade" [ref=f3e27] [cursor=pointer]:
          - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#activity
        - link "Configurações" [ref=f3e30] [cursor=pointer]:
          - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#settings
    - generic [ref=f3e34]:
      - banner [ref=f3e35]:
        - generic [ref=f3e37]:
          - heading "Owner Console" [level=1] [ref=f3e38]
          - paragraph [ref=f3e39]: Agência 2f5d7f34-2fd1-41ef-b84a-c3a750871c65 · owner
        - status "Sessão" [ref=f3e40]:
          - generic [ref=f3e43]: owner@anxionos.local
      - main [ref=f3e44]:
        - generic [ref=f3e45]:
          - region [ref=f3e46]:
            - heading "Trilha de autorização" [level=2] [ref=f3e47]
            - list [ref=f3e48]:
              - listitem [ref=f3e49]:
                - paragraph [ref=f3e55]: Sessão
                - paragraph [ref=f3e56]: frontend · Better Auth
              - listitem [ref=f3e57]:
                - paragraph [ref=f3e62]: post-login-context
                - paragraph [ref=f3e63]: backend · GET /v1/auth/post-login-context
              - listitem [ref=f3e64]:
                - paragraph [ref=f3e69]: Owner Console
                - paragraph [ref=f3e70]: security · owner · MEMBERSHIP_OWNER
          - generic [ref=f3e71]:
            - toolbar "Ações do diagrama" [ref=f3e72]:
              - button "Show all" [ref=f3e73] [cursor=pointer]
              - button "Caminho principal" [pressed] [ref=f3e74] [cursor=pointer]
              - button "Inferência" [ref=f3e75] [cursor=pointer]
            - heading "anxionOS — visão de plataforma" [level=2] [ref=f3e78]
            - paragraph [ref=f3e79]: Consoles Astro até domínio, PostgreSQL autoritativo e projeção Neo4j.
            - generic [ref=f3e80]:
              - complementary [ref=f3e81]:
                - generic [ref=f3e82]: Encontrar nó
                - searchbox "Encontrar nó" [ref=f3e84]
                - list "Nós do diagrama" [ref=f3e85]:
                  - listitem [ref=f3e86]:
                    - button "brain/ External" [ref=f3e87] [cursor=pointer]:
                      - generic [ref=f3e88]: brain/
                      - generic [ref=f3e89]: External
                  - listitem [ref=f3e90]:
                    - button "Humanos External" [ref=f3e91] [cursor=pointer]:
                      - generic [ref=f3e92]: Humanos
                      - generic [ref=f3e93]: External
                  - listitem [ref=f3e94]:
                    - button "Consoles Frontend" [ref=f3e95] [cursor=pointer]:
                      - generic [ref=f3e96]: Consoles
                      - generic [ref=f3e97]: Frontend
                  - listitem [ref=f3e98]:
                    - button "API Backend" [ref=f3e99] [cursor=pointer]:
                      - generic [ref=f3e100]: API
                      - generic [ref=f3e101]: Backend
                  - listitem [ref=f3e102]:
                    - button "Workers Backend" [ref=f3e103] [cursor=pointer]:
                      - generic [ref=f3e104]: Workers
                      - generic [ref=f3e105]: Backend
                  - listitem [ref=f3e106]:
                    - button "Módulos Backend" [ref=f3e107] [cursor=pointer]:
                      - generic [ref=f3e108]: Módulos
                      - generic [ref=f3e109]: Backend
                  - listitem [ref=f3e110]:
                    - button "Neo4j Database" [ref=f3e111] [cursor=pointer]:
                      - generic [ref=f3e112]: Neo4j
                      - generic [ref=f3e113]: Database
                  - listitem [ref=f3e114]:
                    - button "PostgreSQL Database" [ref=f3e115] [cursor=pointer]:
                      - generic [ref=f3e116]: PostgreSQL
                      - generic [ref=f3e117]: Database
                  - listitem [ref=f3e118]:
                    - button "Eventing Message bus" [ref=f3e119] [cursor=pointer]:
                      - generic [ref=f3e120]: Eventing
                      - generic [ref=f3e121]: Message bus
                  - listitem [ref=f3e122]:
                    - button "Connections Backend" [ref=f3e123] [cursor=pointer]:
                      - generic [ref=f3e124]: Connections
                      - generic [ref=f3e125]: Backend
                  - listitem [ref=f3e126]:
                    - button "Providers External" [ref=f3e127] [cursor=pointer]:
                      - generic [ref=f3e128]: Providers
                      - generic [ref=f3e129]: External
              - generic [ref=f3e130]:
                - 'img "anxionOS — visão de plataforma Diagrama institucional Archify classic: consoles Astro, 23 módulos, PostgreSQL autoritativo e Neo4j como projeção." [ref=f3e132]':
                  - generic [ref=f3e133]: HTTPS
                  - generic [ref=f3e135]: /api
                  - generic [ref=f3e137]: commands
                  - generic [ref=f3e139]: projections
                  - generic [ref=f3e142]: journal
                  - button "brain/, External" [ref=f3e144] [cursor=pointer]:
                    - generic [ref=f3e146]: brain/
                    - generic [ref=f3e147]: OKF local
                  - button "Humanos, External" [ref=f3e148] [cursor=pointer]:
                    - generic [ref=f3e150]: Humanos
                    - generic [ref=f3e151]: Owner · papéis
                  - button "Consoles, Frontend" [ref=f3e152] [cursor=pointer]:
                    - generic [ref=f3e154]: Consoles
                    - generic [ref=f3e155]: Astro + React
                  - button "API, Backend" [ref=f3e156] [cursor=pointer]:
                    - generic [ref=f3e158]: API
                    - generic [ref=f3e159]: Bun + Elysia
                  - button "Workers, Backend" [ref=f3e160] [cursor=pointer]:
                    - generic [ref=f3e162]: Workers
                    - generic [ref=f3e163]: TypeScript
                  - button "Módulos, Backend" [ref=f3e164] [cursor=pointer]:
                    - generic [ref=f3e166]: Módulos
                    - generic [ref=f3e167]: 23 contexts
                  - button "Neo4j, Database" [ref=f3e168] [cursor=pointer]:
                    - generic [ref=f3e170]: Neo4j
                    - generic [ref=f3e171]: projeção
                  - button "PostgreSQL, Database" [ref=f3e172] [cursor=pointer]:
                    - generic [ref=f3e174]: PostgreSQL
                    - generic [ref=f3e175]: TS · pgvector
                  - button "Eventing, Message bus" [ref=f3e176] [cursor=pointer]:
                    - generic [ref=f3e178]: Eventing
                    - generic [ref=f3e179]: outbox · NATS
                  - button "Connections, Backend" [ref=f3e180] [cursor=pointer]:
                    - generic [ref=f3e182]: Connections
                    - generic [ref=f3e183]: LLM · venues
                  - button "Providers, External" [ref=f3e184] [cursor=pointer]:
                    - generic [ref=f3e186]: Providers
                    - generic [ref=f3e187]: externos
                - toolbar "Zoom do diagrama" [ref=f3e188]:
                  - button "Diminuir zoom" [ref=f3e189] [cursor=pointer]
                  - button "Redefinir zoom" [ref=f3e191] [cursor=pointer]: 100%
                  - button "Aumentar zoom" [ref=f3e192] [cursor=pointer]
                - list "Legenda semântica" [ref=f3e194]:
                  - listitem [ref=f3e195]: Frontend
                  - listitem [ref=f3e197]: Backend
                  - listitem [ref=f3e199]: Database
                  - listitem [ref=f3e201]: Message bus
                  - listitem [ref=f3e203]: External
              - complementary [ref=f3e205]:
                - paragraph [ref=f3e206]: Semantic passport
                - heading "Consoles" [level=3] [ref=f3e207]
                - generic [ref=f3e208]:
                  - generic [ref=f3e209]:
                    - term [ref=f3e210]: tipo
                    - definition [ref=f3e211]: Frontend
                  - generic [ref=f3e212]:
                    - term [ref=f3e213]: id
                    - definition [ref=f3e214]: frontend
                  - generic [ref=f3e215]:
                    - term [ref=f3e216]: tag
                    - definition [ref=f3e217]: frontend/
                - generic [ref=f3e218]:
                  - paragraph [ref=f3e219]: Relações autoradas
                  - list [ref=f3e220]:
                    - listitem [ref=f3e221]: OUT → API · /api
                    - listitem [ref=f3e222]: IN ← Humanos · HTTPS
                - generic [ref=f3e223]:
                  - paragraph [ref=f3e224]: Dados do loader
                  - generic [ref=f3e225]:
                    - generic [ref=f3e226]:
                      - term [ref=f3e227]: agencyId
                      - definition [ref=f3e228]: 2f5d7f34-2fd1-41ef-b84a-c3a750871c65
                    - generic [ref=f3e229]:
                      - term [ref=f3e230]: role
                      - definition [ref=f3e231]: owner
                    - generic [ref=f3e232]:
                      - term [ref=f3e233]: e-mail verificado
                      - definition [ref=f3e234]: "true"
                    - generic [ref=f3e235]:
                      - term [ref=f3e236]: TTL
                      - definition [ref=f3e237]: Dentro do TTL
                    - generic [ref=f3e238]:
                      - term [ref=f3e239]: policyVersion
                      - definition [ref=f3e240]: post-login.v1
                  - paragraph [ref=f3e241]: platformAccess=false — console /platform permanece negado.
                  - paragraph [ref=f3e242]: partnerAccess=false — console /partner permanece negado.
            - generic [ref=f3e243]:
              - article [ref=f3e244]:
                - heading "Fontes OpenKnowledge" [level=3] [ref=f3e247]
                - list [ref=f3e248]:
                  - listitem [ref=f3e249]: ADR0002 aceito — 23 módulos; tools ainda proposta (ADR0003)
                  - listitem [ref=f3e250]: ADR0004 aceito — Neo4j + PostgreSQL/Timescale/pgvector
                  - listitem [ref=f3e251]: ADR0001 proposto — grafo operacional sem ser ledger
              - article [ref=f3e252]:
                - heading "Evidência no repo" [level=3] [ref=f3e255]
                - list [ref=f3e256]:
                  - listitem [ref=f3e257]: Esqueleto em backend/modules (23 donos + adapter-gateway fora do baseline)
                  - listitem [ref=f3e258]: frontend/ Astro; API Bun+Elysia; eventing/database packages
                  - listitem [ref=f3e259]: Implantação de produção não verificada
            - region [ref=f3e260]:
              - heading "Dados operacionais" [level=2] [ref=f3e261]
              - generic [ref=f3e263]:
                - paragraph [ref=f3e264]: Vazio
                - heading "Agentes e portfólio ainda não alimentam este console" [level=3] [ref=f3e265]
                - paragraph [ref=f3e266]: ANX-143 (teammates) e ANX-153 (posições/valuation) continuam abertos no board. O vazio é o estado autoritativo.
      - contentinfo [ref=f3e267]: anxionOS · Owner Console · shells honestos ANX-297
  - generic [ref=f3e270]:
    - button [ref=f3e271]
    - button [ref=f3e277]
    - button [ref=f3e281]
    - button [ref=f3e289]
```

# Test source

```ts
  1  | import AxeBuilder from "@axe-core/playwright";
  2  | import { expect, type Page } from "@playwright/test";
  3  | 
  4  | export async function expectAxeClean(page: Page, label: string): Promise<void> {
  5  | 	const results = await new AxeBuilder({ page })
  6  | 		.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
  7  | 		.analyze();
> 8  | 	expect(results.violations, `${label}: ${JSON.stringify(results.violations, null, 2)}`).toEqual(
     |                                                                                         ^ Error: /agency owner empty: [
  9  | 		[],
  10 | 	);
  11 | }
  12 | 
  13 | export const deniedPostLoginFixture = {
  14 | 	authenticated: true,
  15 | 	emailVerified: true,
  16 | 	mfaRequired: false,
  17 | 	principal: {
  18 | 		id: "principal-denied-a11y",
  19 | 		authUserId: "auth-denied-a11y",
  20 | 		email: "denied-a11y@anxionos.local",
  21 | 		displayName: null,
  22 | 	},
  23 | 	membershipsActive: [],
  24 | 	membershipsPending: [],
  25 | 	platformAccess: false,
  26 | 	partnerAccess: false,
  27 | 	onboardingState: {
  28 | 		needsProfile: false,
  29 | 		needsOrganization: false,
  30 | 	},
  31 | 	decision: {
  32 | 		kind: "denied" as const,
  33 | 		reason: "no_authorized_console",
  34 | 	},
  35 | };
  36 | 
```