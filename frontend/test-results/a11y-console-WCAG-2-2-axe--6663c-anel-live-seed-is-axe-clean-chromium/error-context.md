# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a11y-console.spec.ts >> WCAG 2.2 axe — login + shells (ANX-340) >> Owner finance panel (live seed) is axe-clean
- Location: e2e/a11y-console.spec.ts:40:2

# Error details

```
Error: /agency owner finance panel: [
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
              "fgColor": "#67686a",
              "bgColor": "#0a0a0c",
              "contrastRatio": 3.54,
              "fontSize": "10.5pt (14px)",
              "fontWeight": "normal",
              "messageKey": null,
              "expectedContrastRatio": "4.5:1"
            },
            "relatedNodes": [
              {
                "html": "<div class=\"hidden h-dvh w-[300px] shrink-0 flex-col border-r border-border bg-surface px-4 py-4 md:flex justify-between gap-10 overflow-hidden\" data-testid=\"console-sidebar\" data-console=\"owner\" style=\"width: 146.546px;\">",
                "target": [
                  ".h-dvh"
                ]
              }
            ],
            "impact": "serious",
            "message": "Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<span class=\"m-0 inline-block whitespace-pre p-0 text-sm transition duration-150 group-hover/sidebar:translate-x-1\" style=\"display: block; opacity: 1;\">Visão geral</span>",
        "target": [
          "a[data-testid=\"console-nav-dashboard\"] > .m-0.inline-block.whitespace-pre"
        ],
        "failureSummary": "Fix any of the following:\n  Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1"
      },
      {
        "any": [
          {
            "id": "color-contrast",
            "data": {
              "fgColor": "#67686a",
              "bgColor": "#0a0a0c",
              "contrastRatio": 3.54,
              "fontSize": "10.5pt (14px)",
              "fontWeight": "normal",
              "messageKey": null,
              "expectedContrastRatio": "4.5:1"
            },
            "relatedNodes": [
              {
                "html": "<div class=\"hidden h-dvh w-[300px] shrink-0 flex-col border-r border-border bg-surface px-4 py-4 md:flex justify-between gap-10 overflow-hidden\" data-testid=\"console-sidebar\" data-console=\"owner\" style=\"width: 146.546px;\">",
                "target": [
                  ".h-dvh"
                ]
              }
            ],
            "impact": "serious",
            "message": "Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<span class=\"m-0 inline-block whitespace-pre p-0 text-sm transition duration-150 group-hover/sidebar:translate-x-1\" style=\"display: block; opacity: 1;\">Agência</span>",
        "target": [
          "a[data-testid=\"console-nav-owner-agency\"] > .m-0.inline-block.whitespace-pre"
        ],
        "failureSummary": "Fix any of the following:\n  Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1"
      },
      {
        "any": [
          {
            "id": "color-contrast",
            "data": {
              "fgColor": "#67686a",
              "bgColor": "#0a0a0c",
              "contrastRatio": 3.54,
              "fontSize": "10.5pt (14px)",
              "fontWeight": "normal",
              "messageKey": null,
              "expectedContrastRatio": "4.5:1"
            },
            "relatedNodes": [
              {
                "html": "<div class=\"hidden h-dvh w-[300px] shrink-0 flex-col border-r border-border bg-surface px-4 py-4 md:flex justify-between gap-10 overflow-hidden\" data-testid=\"console-sidebar\" data-console=\"owner\" style=\"width: 146.546px;\">",
                "target": [
                  ".h-dvh"
                ]
              }
            ],
            "impact": "serious",
            "message": "Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<span class=\"m-0 inline-block whitespace-pre p-0 text-sm transition duration-150 group-hover/sidebar:translate-x-1\" style=\"display: block; opacity: 1;\">Acesso</span>",
        "target": [
          "a[data-testid=\"console-nav-access\"] > .m-0.inline-block.whitespace-pre"
        ],
        "failureSummary": "Fix any of the following:\n  Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1"
      },
      {
        "any": [
          {
            "id": "color-contrast",
            "data": {
              "fgColor": "#67686a",
              "bgColor": "#0a0a0c",
              "contrastRatio": 3.54,
              "fontSize": "10.5pt (14px)",
              "fontWeight": "normal",
              "messageKey": null,
              "expectedContrastRatio": "4.5:1"
            },
            "relatedNodes": [
              {
                "html": "<div class=\"hidden h-dvh w-[300px] shrink-0 flex-col border-r border-border bg-surface px-4 py-4 md:flex justify-between gap-10 overflow-hidden\" data-testid=\"console-sidebar\" data-console=\"owner\" style=\"width: 146.546px;\">",
                "target": [
                  ".h-dvh"
                ]
              }
            ],
            "impact": "serious",
            "message": "Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1"
          }
        ],
        "all": [],
        "none": [],
        "impact": "serious",
        "html": "<span class=\"m-0 inline-block whitespace-pre p-0 text-sm transition duration-150 group-hover/sidebar:translate-x-1\" style=\"display: block; opacity: 1;\">Sair</span>",
        "target": [
          "a[href$=\"login\"] > .m-0.inline-block.whitespace-pre"
        ],
        "failureSummary": "Fix any of the following:\n  Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1"
      }
    ]
  }
]

expect(received).toEqual(expected) // deep equality

- Expected  -   1
+ Received  + 163

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
+               "bgColor": "#0a0a0c",
+               "contrastRatio": 3.54,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#67686a",
+               "fontSize": "10.5pt (14px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"hidden h-dvh w-[300px] shrink-0 flex-col border-r border-border bg-surface px-4 py-4 md:flex justify-between gap-10 overflow-hidden\" data-testid=\"console-sidebar\" data-console=\"owner\" style=\"width: 146.546px;\">",
+                 "target": Array [
+                   ".h-dvh",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"m-0 inline-block whitespace-pre p-0 text-sm transition duration-150 group-hover/sidebar:translate-x-1\" style=\"display: block; opacity: 1;\">Visão geral</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[data-testid=\"console-nav-dashboard\"] > .m-0.inline-block.whitespace-pre",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#0a0a0c",
+               "contrastRatio": 3.54,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#67686a",
+               "fontSize": "10.5pt (14px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"hidden h-dvh w-[300px] shrink-0 flex-col border-r border-border bg-surface px-4 py-4 md:flex justify-between gap-10 overflow-hidden\" data-testid=\"console-sidebar\" data-console=\"owner\" style=\"width: 146.546px;\">",
+                 "target": Array [
+                   ".h-dvh",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"m-0 inline-block whitespace-pre p-0 text-sm transition duration-150 group-hover/sidebar:translate-x-1\" style=\"display: block; opacity: 1;\">Agência</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[data-testid=\"console-nav-owner-agency\"] > .m-0.inline-block.whitespace-pre",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#0a0a0c",
+               "contrastRatio": 3.54,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#67686a",
+               "fontSize": "10.5pt (14px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"hidden h-dvh w-[300px] shrink-0 flex-col border-r border-border bg-surface px-4 py-4 md:flex justify-between gap-10 overflow-hidden\" data-testid=\"console-sidebar\" data-console=\"owner\" style=\"width: 146.546px;\">",
+                 "target": Array [
+                   ".h-dvh",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"m-0 inline-block whitespace-pre p-0 text-sm transition duration-150 group-hover/sidebar:translate-x-1\" style=\"display: block; opacity: 1;\">Acesso</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[data-testid=\"console-nav-access\"] > .m-0.inline-block.whitespace-pre",
+         ],
+       },
+       Object {
+         "all": Array [],
+         "any": Array [
+           Object {
+             "data": Object {
+               "bgColor": "#0a0a0c",
+               "contrastRatio": 3.54,
+               "expectedContrastRatio": "4.5:1",
+               "fgColor": "#67686a",
+               "fontSize": "10.5pt (14px)",
+               "fontWeight": "normal",
+               "messageKey": null,
+             },
+             "id": "color-contrast",
+             "impact": "serious",
+             "message": "Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+             "relatedNodes": Array [
+               Object {
+                 "html": "<div class=\"hidden h-dvh w-[300px] shrink-0 flex-col border-r border-border bg-surface px-4 py-4 md:flex justify-between gap-10 overflow-hidden\" data-testid=\"console-sidebar\" data-console=\"owner\" style=\"width: 146.546px;\">",
+                 "target": Array [
+                   ".h-dvh",
+                 ],
+               },
+             ],
+           },
+         ],
+         "failureSummary": "Fix any of the following:
+   Element has insufficient color contrast of 3.54 (foreground color: #67686a, background color: #0a0a0c, font size: 10.5pt (14px), font weight: normal). Expected contrast ratio of 4.5:1",
+         "html": "<span class=\"m-0 inline-block whitespace-pre p-0 text-sm transition duration-150 group-hover/sidebar:translate-x-1\" style=\"display: block; opacity: 1;\">Sair</span>",
+         "impact": "serious",
+         "none": Array [],
+         "target": Array [
+           "a[href$=\"login\"] > .m-0.inline-block.whitespace-pre",
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
      - navigation "Menu Owner Console" [ref=f2e12]:
        - link [ref=f2e13] [cursor=pointer]:
          - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65
        - link [ref=f2e19] [cursor=pointer]:
          - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#team
        - link [ref=f2e24] [cursor=pointer]:
          - /url: /agency/2f5d7f34-2fd1-41ef-b84a-c3a750871c65#grants
        - link [ref=f2e28] [cursor=pointer]:
          - /url: /login
      - generic [ref=f2e32]:
        - status "Sessão" [ref=f2e33]
        - generic [ref=f2e36]:
          - generic [aria-hidden] [ref=f2e37]: O
          - generic [ref=f2e38]: owner@anxionos.local
    - generic [ref=f2e39]:
      - banner [ref=f2e40]:
        - generic [ref=f2e41]:
          - heading "Owner Console" [level=1] [ref=f2e42]
          - paragraph [ref=f2e43]: Agência 2f5d7f34-2fd1-41ef-b84a-c3a750871c65 · owner
        - status "Sessão" [ref=f2e44]:
          - generic [ref=f2e47]: owner@anxionos.local
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
                - paragraph [ref=f2e73]: Owner Console
                - paragraph [ref=f2e74]: security · owner · MEMBERSHIP_OWNER
          - generic [ref=f2e75]:
            - toolbar "Ações do diagrama" [ref=f2e76]:
              - button "Show all" [ref=f2e77] [cursor=pointer]
              - button "Caminho principal" [pressed] [ref=f2e78] [cursor=pointer]
              - button "Inferência" [ref=f2e79] [cursor=pointer]
            - heading "anxionOS — visão de plataforma" [level=2] [ref=f2e82]
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
                - 'group "anxionOS — visão de plataforma Diagrama institucional Archify classic: consoles Astro, 23 módulos, PostgreSQL autoritativo e Neo4j como projeção." [ref=f2e136]':
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
                      - definition [ref=f2e235]: owner
                    - generic [ref=f2e236]:
                      - term [ref=f2e237]: e-mail verificado
                      - definition [ref=f2e238]: "true"
                    - generic [ref=f2e239]:
                      - term [ref=f2e240]: TTL
                      - definition [ref=f2e241]: Dentro do TTL
                    - generic [ref=f2e242]:
                      - term [ref=f2e243]: policyVersion
                      - definition [ref=f2e244]: post-login.v1
                  - paragraph [ref=f2e245]: platformAccess=false — console /platform permanece negado.
                  - paragraph [ref=f2e246]: partnerAccess=false — console /partner permanece negado.
            - generic [ref=f2e247]:
              - article [ref=f2e248]:
                - heading "Fontes OpenKnowledge" [level=3] [ref=f2e251]
                - list [ref=f2e252]:
                  - listitem [ref=f2e253]: ADR0002 aceito — 23 módulos; tools ainda proposta (ADR0003)
                  - listitem [ref=f2e254]: ADR0004 aceito — Neo4j + PostgreSQL/Timescale/pgvector
                  - listitem [ref=f2e255]: ADR0001 proposto — grafo operacional sem ser ledger
              - article [ref=f2e256]:
                - heading "Evidência no repo" [level=3] [ref=f2e259]
                - list [ref=f2e260]:
                  - listitem [ref=f2e261]: Esqueleto em backend/modules (23 donos + adapter-gateway fora do baseline)
                  - listitem [ref=f2e262]: frontend/ Astro; API Bun+Elysia; eventing/database packages
                  - listitem [ref=f2e263]: Implantação de produção não verificada
            - region [ref=f2e264]:
              - heading "Equipe" [level=2] [ref=f2e265]
              - list [ref=f2e266]:
                - listitem [ref=f2e267]:
                  - paragraph [ref=f2e268]: owner · active
                  - paragraph [ref=f2e269]: dda03cf9-8ab9-4f03-9123-3d25a95c9876 · 3e5baade-6c4c-4e75-b90f-ece93944ee59
                - listitem [ref=f2e270]:
                  - paragraph [ref=f2e271]: operator · active
                  - paragraph [ref=f2e272]: 16b23284-843e-4095-97c6-e507d0d7cc09 · 16894192-21b7-46be-ae23-2c5ddc377b20
              - paragraph [ref=f2e273]: GET /v1/organizations/agencies/:agencyId/memberships (collection). organizations plugin listMemberships; membershipDtoSchema em @anxionos/contracts/organizations. ANX-135 done. ANX-401 slice 2.
            - region [ref=f2e274]:
              - heading "Grants e autonomia" [level=2] [ref=f2e275]
              - generic [ref=f2e276]:
                - paragraph [ref=f2e277]: Vazio
                - heading "Nenhum grant efetivo nesta agência" [level=3] [ref=f2e278]
                - paragraph [ref=f2e279]: "Nenhum grant efetivo para o principal nesta agência. Contrato: GET /v1/agencies/:agencyId/grants (collection). createGovernancePlugin handleListGrants → listEffectiveGrants; DTO em handlers/grants toGrantDto. Autonomia L0–L4 por agente: GET /v1/agencies/:agencyId/agents/:agentId/autonomy. ANX-402 slice 3."
              - paragraph [ref=f2e280]: GET /v1/agencies/:agencyId/agents/:agentId/autonomy — requer agentId; matriz global em GET /v1/governance/autonomy/matrix. Nível L0–L4 só quando a API devolve; sem atribuição = honesto vazio. ANX-403 slice 4.
            - region [ref=f2e281]:
              - heading "Fila de aprovações" [level=2] [ref=f2e282]
              - generic [ref=f2e283]:
                - paragraph [ref=f2e284]: Vazio
                - heading "Listagem de aprovações ainda não publicada" [level=3] [ref=f2e285]
                - paragraph [ref=f2e286]: "Listagem pública ainda não existe. GET /v1/agencies/:agencyId/change-proposals (collection). createGovernancePlugin handleListPendingChangeProposals → findPendingByScope; DTO em handlers/change-proposals toChangeProposalDto. Resolver: POST /v1/governance/approvals/resolve. ANX-404 slice 5."
              - paragraph [ref=f2e287]: POST /v1/governance/approvals/resolve — resolve aprovação de ChangeProposal (command idempotente). O Owner console lista pendentes; resolver exige commandId e changeProposalId.
            - region [ref=f2e288]:
              - heading "Agentes da agência" [level=2] [ref=f2e289]
              - generic [ref=f2e290]:
                - paragraph [ref=f2e291]: Vazio
                - heading "Listagem de agentes ainda não publicada" [level=3] [ref=f2e292]
                - paragraph [ref=f2e293]: Listagem pública ainda não existe. GET /v1/agencies/:agencyId/agents (collection). createAgentsPlugin só POST "" + GET /:agentId; AgentRepository.save/findById sem listByOrganization; OpenAPI getAgent/listAgentVersions (por agentId). ANX-143 done não publica listagem. ANX-385.
            - region [ref=f2e294]:
              - heading "Portfólio e valuation" [level=2] [ref=f2e295]
              - generic [ref=f2e296]:
                - paragraph [ref=f2e297]: Vazio
                - heading "Listagem de portfólios ainda não publicada" [level=3] [ref=f2e298]
                - paragraph [ref=f2e299]: Listagem pública ainda não existe. GET /v1/agencies/:agencyId/portfolios (collection). createPortfoliosPlugin handleListAgencyPortfolios → listAgencyPortfolioOverview; DTO em handlers/overview. ANX-153 G7 + ANX-164 slice 6.
              - paragraph [ref=f2e300]: GET /v1/agencies/:agencyId/portfolios (collection). createPortfoliosPlugin handleListAgencyPortfolios → listAgencyPortfolioOverview; DTO em handlers/overview. ANX-153 G7 + ANX-164 slice 6.
      - contentinfo [ref=f2e301]: anxionOS · Owner Console · shells honestos ANX-297
  - generic [ref=f2e304]:
    - button [ref=f2e305]
    - button [ref=f2e311]
    - button [ref=f2e315]
    - button [ref=f2e323]
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
     |                                                                                         ^ Error: /agency owner finance panel: [
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