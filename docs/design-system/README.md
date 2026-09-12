---
type: guide
---

# Design system — anxionOS

Documentação do design system. **Tokens e overrides permanecem co-localizados com o frontend** para facilitar implementação; este índice centraliza os caminhos canônicos.

## Caminhos canônicos

| Recurso | Caminho | Descrição |
| --- | --- | --- |
| **Master (tokens globais)** | [frontend/design-system/MASTER.md](../../frontend/design-system/MASTER.md) | Paleta, tipografia, componentes — **promovido com ledger ANX-504** |
| **ANX-504 Visual Kit** | [ANX-504-visual-kit.md](ANX-504-visual-kit.md) | **Decisão publicada** — kit fechado + ledger institucional (Sofia APPROVE) |
| Overrides por página | `frontend/design-system/pages/` | Regras que sobrescrevem o Master |
| CSS tokens | `frontend/src/styles/global.css` | `@theme` Tailwind |
| Variante `anxionos/` | `frontend/design-system/anxionos/` | Master alternativo / namespace |

## Regra de precedência

1. Verificar `frontend/design-system/pages/[page-name].md` — se existir, **sobrescreve** o Master.
2. Caso contrário, seguir `frontend/design-system/MASTER.md`.

## ANX-504 — Kit visual publicado (2026-09-12)

**Decisão fechada** — Sofia Nascimento APPROVE (body v3), publisher Marina Okonkwo, draft Renata Alves.

### Ledger institucional (canônico)

- **Ink** #0B100E (fundo OLED)
- **Copper** #C4843A (CTA/destaque — **só sobre ink**, 7.08:1 AAA)
- **Bone** #F5F1ED (texto primário — 12.62:1 AAA sobre ink)
- **Paper** #E8E2DB (texto secundário — 11.35:1 AAA sobre ink)
- **Rule** #2A2620 (hairline sobre ink, ≥3:1 — **não promover** como CTA)

**Proibições:**
- ❌ Copper sobre bone/paper (2.47:1 FAIL)
- ❌ Hero KPI / big-number-as-brand
- ❌ Segundo sidebar/switcher-chrome (conflito com Aceternity ANX-448)
- ❌ Acid green/neon + Inter

### Tipografia

- **Display:** Newsreader (headings, hero)
- **Body:** Public Sans (texto, labels, UI)
- **Mono:** IBM Plex Mono (IDs, códigos, logs)

### Kit de componentes (matriz fechada)

- **Primitives:** shadcn (React + Tailwind, sem Next.js)
- **Chrome:** Aceternity (ANX-448 — único chrome)
- **Motion:** Magic UI (default zero — apenas AnimatedGridPattern + `prefers-reduced-motion`)
- **Widgets:** Nyxhora (stat cards, timeline — sem layout chrome)
- **Séries:** ECharts (alt textual obrigatório ou BLOCK)
- **Diagramas:** Archify + Mermaid
- **Signature:** grafo Archify no centro (não hero KPI)

### A11y obrigatória

- `expectAxeClean` no `#main-content` (WCAG 2.2 AA)
- Targets ≥44×44 CSS px (`min-h-11`)
- Chart sem alt honesto = BLOCK
- Focus rings visíveis (`ring-2 ring-copper`)
- `prefers-reduced-motion` respeitado

**Ver detalhes:** [ANX-504-visual-kit.md](ANX-504-visual-kit.md)

---

## Migração gradual

MASTER.md **promovido** com ledger ANX-504 (2026-09-12). Palette ui-ux-pro-max obsoleta (#020617/#f97316) → ledger institucional.

Legacy mapping preservado para transição:
- `--color-background` → `--color-ink`
- `--color-accent` → `--color-copper`
- `--color-foreground` → `--color-bone`
- `--color-muted-foreground` → `--color-paper`

Implementação de produto post-P0 (separado de ANX-504 docs-only).

---

## Documentação relacionada

- [Frontend](../frontend/README.md)
- [Org chart da equipe](../team/org-chart.md)
