---
type: guide
status: published
issue: ANX-504
decision-makers: Sofia Nascimento (critic APPROVE)
draft: Renata Alves
publisher: Marina Okonkwo
date: 2026-09-12
---

# ANX-504 — Kit visual + ledger institucional

Decisão publicada do kit visual e tokens de design para anxionOS. Substitui palette obsoleta (ui-ux-pro-max #020617/#f97316) por ledger institucional com rastreabilidade WCAG e restrições de kit explícitas.

**Status:** DRAFT (PR — Sofia re-gate antes do merge)  
**Crítica:** Sofia Nascimento — APPROVE body v3 (tokens além de ink/copper/type exigem nova fatia)  
**Publisher:** Marina Okonkwo  
**Draft:** Renata Alves  
**CHANGES (Renata):** sem Bone/Paper inventados; sem Rule `#2A2620` na palette publicada; Magic UI sem whitelist de componente nomeado.

---

## Tokens do ledger institucional

### Paleta de cores (ledger canônico — Sofia APPROVE body)

| Papel | Token | Hex | Notas |
|-------|-------|-----|-------|
| Ink (fundo) | `--color-ink` | `#0B100E` | Fundo principal, profundidade OLED |
| Copper (CTA/destaque) | `--color-copper` | `#C4843A` | **Só sobre ink** (≥6.13:1 AA) |

**Tipografia** (parte do ledger aprovado — ver tabela abaixo).

**Fora deste APPROVE (não publicar como canônico):**
- Tokens de foreground / Bone / Paper / Surface com hex inventado ou não medido nesta fatia — **cortados**. Foreground permanece **genérico** até nova fatia com contraste medido + gate Sofia.
- Rule `#2A2620` — APPROVE: **não promover**; **não entra** na palette publicada.

**Contraste validado nesta fatia:**
- Copper `#C4843A` sobre Ink `#0B100E`: **6.13:1** (AA) — aprovado para CTAs, borders, focus rings.
- Copper **só** sobre ink — proibido sobre fundos claros / texto claro sem medição + APPROVE.

### Tipografia

| Papel | Família | Pesos | Uso |
|-------|---------|-------|-----|
| Display | Newsreader | 400, 600, 700 | Títulos / razão (display); **sem** hero / números grandes |
| Body | Public Sans | 400, 500, 600 | Corpo de texto, labels, UI |
| Mono | IBM Plex Mono | 400, 500 | IDs, códigos, logs |

**Google Fonts:**
```css
@import url('https://fonts.googleapis.com/css2?family=Newsreader:wght@400;600;700&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
```

### Signature visual (centro institucional)

**Grafo Archify no centro da composição** — diagrama institucional como identidade visual. Hero centra signature; chrome/sidebar secundários.

---

## Kit de componentes (matriz fechada)

Decisões de kit aceitas e **não reabertas** — violação retorna para Sofia.

### Primitives (shadcn)

- **Fonte:** [shadcn/ui](https://ui.shadcn.com/) — componentes primitivos (Button, Input, Card, Dialog, etc.)
- **Stack:** React + Tailwind (sem Next.js — Astro + islands)
- **Instalação:** `components/ui/` via CLI shadcn
- **Proibição:** não usar versão Next.js/App Router

### Chrome institucional único (Aceternity ANX-448)

- **Fonte:** [Aceternity UI](https://ui.aceternity.com/) — sidebar + nav
- **Issue origem:** ANX-448 — chrome único aceito
- **Proibição:** **não adicionar** segundo sidebar, switcher-chrome ou layout alternativo (Nyxhora sidebar + Aceternity = conflito)

### Motion (Magic UI — default zero)

- **Fonte:** [Magic UI](https://magicui.design/)
- **Política canônica:** **default zero** + **job sentence** na issue + `prefers-reduced-motion` respeitado
- **Empty:** HonestState (sem animação decorativa / spinner infinito)
- **Proibição:** sem componente Magic UI **nomeado** sem job sentence na issue; sem whitelist inventada; não instalar biblioteca completa “por padrão”

### Widgets de dados (Nyxhora — sem segundo chrome)

- **Fonte:** [Nyxhora](https://nyxhora.com/) — stat cards, KPI widgets, timeline
- **Restrição:** **não usar** sidebar/layout chrome de Nyxhora (conflito com Aceternity); apenas widgets de dados isolados
- **Hero KPI proibido:** números grandes como branding = **banido** (Sofia)

### Séries temporais (ECharts)

- **Fonte:** [Apache ECharts](https://echarts.apache.org/en/index.html)
- **A11y obrigatória:** todo chart **precisa** de alternativa textual honesta (tabela/summary) **ou BLOCK** (não usar)
- **Crítica:** chart sem alt honesto = achado BLOCK de a11y (expectAxeClean)

### Diagramas (Archify + Mermaid)

- **Archify:** diagramas interativos institucionais (architecture, workflow, sequence) — `.archify/specs/`
- **Mermaid:** diagramas em docs (flowchart, sequence) — inline em markdown

---

## Requisitos de acessibilidade (fechados)

WCAG 2.2 Level AA obrigatório — violação = BLOCK.

### Checklist a11y (factory closed)

1. **`expectAxeClean` no `#main-content`** — axe-core limpo em testes E2E
2. **Targets ≥44×44 CSS px** — controles clicáveis `min-h-11` (44px Tailwind `h-11`)
3. **Chart sem alt honesto = BLOCK** — toda série temporal precisa de alternativa textual ou tabela (não canvas puro)
4. **Contraste validado nesta fatia** — ledger garante 6.13:1 AA copper-on-ink; texto/foreground genérico até fatia com medição + Sofia
5. **Focus rings visíveis** — `:focus-visible` com `ring-2 ring-copper`
6. **`prefers-reduced-motion`** — qualquer motion (só com job sentence) respeita; sem motion quando desabilitado

### Targets mínimos

| Elemento | Regra |
|----------|-------|
| Botões, links | `min-h-11` (`h-11` = 44px Tailwind) ou ≥44×44 CSS px |
| Checkboxes, radios | wrapper ≥44×44 CSS px |
| Touch targets mobile | espaçamento entre alvos ≥8px |

---

## Proibições explícitas (não reabrir)

Decisões **recusadas** por Sofia — não propor novamente sem aceite explícito:

1. **Hero KPI / big-number-as-brand:** números grandes centralizados como identidade visual — **banido**. Signature = grafo Archify, não métricas.
2. **Copper fora de ink:** copper **só** sobre ink — proibido sobre fundos/textos claros sem contraste medido + APPROVE.
3. **Acid green / neon + Inter:** paletas neon vibrantes — **recusadas**. Ledger institucional (ink + copper + type) prevalece.
4. **Segundo sidebar / switcher-chrome:** Nyxhora layout chrome + Aceternity = conflito — **proibido**. Um chrome (Aceternity ANX-448).
5. **Rule `#2A2620` na palette publicada:** APPROVE disse **não promover** — não publicar como token canônico.
6. **Bone / Paper / Surface hex inventados** nesta fatia — cortados; foreground genérico até nova fatia.
7. **Whitelist Magic UI de componente nomeado** sem job sentence na issue — inventado; canônico = default zero + job sentence + `prefers-reduced-motion`.
8. **Newsreader em hero / números grandes** — **fora**; Newsreader = títulos / razão (display) apenas.

---

## Roadmap de implementação

**ANX-504 é publicação documental** — sem implementação de produto neste PR.

### Post-P0 (separado)

1. Migrar `frontend/src/styles/global.css` para tokens do ledger (`--color-ink`, `--color-copper`; foreground após fatia Sofia)
2. Atualizar primitivos shadcn em `components/ui/` para usar ledger
3. Instalar Aceternity sidebar (ANX-448) como chrome único
4. Motion Magic UI **somente** com job sentence na issue + `prefers-reduced-motion`; empty = HonestState
5. Adicionar widgets Nyxhora (stat cards, timeline) sem layout chrome
6. Configurar ECharts com alt textual obrigatório ou bloquear uso
7. Integrar Archify signature no centro do hero/dashboard
8. Validar `expectAxeClean` e targets ≥44px em E2E

### Partner console (bloqueado)

**Partner não está live** — aguardar autorização explícita antes de implementar UI Partner.

---

## Referências

- **Issue:** ANX-504 (Sofia APPROVE body v3; Renata CHANGES no PR)
- **Chrome Aceternity:** ANX-448
- **Critic:** Sofia Nascimento (re-gate antes do merge)
- **Publisher:** Marina Okonkwo
- **Draft:** Renata Alves

**Fonte de contraste:** [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)  
**WCAG 2.2:** [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)
