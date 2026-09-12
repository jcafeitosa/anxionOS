---
type: reference
---

# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** anxionOS  
**Promoted:** 2026-09-12 (ANX-504 ledger institucional)  
**Category:** Fintech / Institutional SaaS  
**Reference:** [ANX-504 Visual Kit](../../docs/design-system/ANX-504-visual-kit.md) — kit fechado + ledger

---

## Global Rules

### Color Palette (ledger institucional ANX-504)

**Ledger canônico** — substitui palette ui-ux-pro-max obsoleta (#020617/#f97316).

| Role | Hex | CSS Variable | Notas |
|------|-----|--------------|-------|
| Ink (fundo) | `#0B100E` | `--color-ink` | Fundo principal OLED |
| Copper (CTA/destaque) | `#C4843A` | `--color-copper` | **Só sobre ink** (7.08:1 AAA); proibido sobre bone (2.47:1 ↯) |
| Bone (texto primário) | `#E8E4DA` | `--color-bone` | Corpo de texto (lock v3) |
| Surface | `#121816` | `--color-surface` | Superfície elevada sobre ink (lock v3; sem `paper`) |
| Rule (hairline) | `#2A2620` | `--color-rule` | Divisores discretos sobre ink (≥3:1); **não promover** como CTA |

**Contraste validado (WebAIM):**
- Copper #C4843A sobre Ink #0B100E: **7.08:1** (AAA) ✓
- Bone `#E8E4DA` sobre Ink `#0B100E`: corpo de texto (lock v3)
- Surface `#121816` sobre Ink `#0B100E`: superfície elevada (lock v3)
- Copper sobre bone/surface clara: **proibido** (copper só sobre ink)
- Sem role `paper`; tokens oficiais: bone `#E8E4DA`, surface `#121816` (Sofia lock v3)

**Proibições ANX-504:**
- ❌ Copper sobre bone/surface clara (contraste insuficiente)
- ❌ Hero KPI / big-number-as-brand (números grandes como identidade)
- ❌ Acid green/neon + Inter (palette neon recusada)
- ❌ Segundo sidebar/switcher-chrome (conflito com Aceternity ANX-448)

**Legacy mapping (preservado para migração gradual):**

| Legacy (ui-ux-pro-max) | Ledger ANX-504 |
|------------------------|----------------|
| `--color-background` (#020617) | `--color-ink` (#0B100E) |
| `--color-accent` (#f97316) | `--color-copper` (#C4843A) |
| `--color-foreground` (#f8fafc) | `--color-bone` (#E8E4DA) |
| `--color-surface` / muted | `--color-surface` (#121816) |

### Typography

- **Display Font:** Newsreader (headings, hero, números grandes — ANX-504)
- **Body Font:** Public Sans (corpo de texto, labels, UI — ANX-504)
- **Mono:** IBM Plex Mono (IDs, códigos, logs — ANX-504)
- **Mood:** institucional, confiança, signature Archify no centro (não hero KPI)
- **Google Fonts:** [Newsreader + Public Sans + IBM Plex Mono](https://fonts.googleapis.com/css2?family=Newsreader:wght@400;600;700&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Newsreader:wght@400;600;700&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
```

**Hero scale:** `font-size: clamp(2.5rem, 6vw, 4.5rem); letter-spacing: -0.03em;` (Newsreader display)

**Legacy (migração gradual):**
- Plus Jakarta Sans (display) → Newsreader
- Inter (body) → Public Sans
- JetBrains Mono (mono) → IBM Plex Mono

### Spacing (8px rhythm)

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` | Tight gaps |
| `--space-sm` | `8px` | Icon gaps |
| `--space-md` | `16px` | Standard padding |
| `--space-lg` | `24px` | Card padding |
| `--space-xl` | `32px` | Section gaps |
| `--space-2xl` | `48px` | Section margins |
| `--space-3xl` | `64px` | Hero padding |

**Containers:** `max-w-7xl` marketing, `max-w-md` auth forms, `max-w-lg` MFA.

### Shadows & Glass

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.4)` | Subtle lift |
| `--shadow-md` | `0 4px 24px rgba(0,0,0,0.35)` | Cards |
| `--shadow-glow-copper` | `0 0 40px rgba(196,132,58,0.15)` | Primary CTA (copper glow) |
| Glass border | `1px solid rgba(245,241,237,0.08)` | Cards, auth panels (bone opacity) |
| Glass blur | `backdrop-filter: blur(12px)` | Nav, modals |

**Nota ANX-504:** `--shadow-glow-accent` (orange #f97316) → `--shadow-glow-copper` (copper #C4843A).

### Internationalization

- **Locales:** `pt-BR` (default), `en`, `es`
- **Auto-detect:** geo IP (ipapi.co) → cookie `anxion_locale` → `Accept-Language` → `pt-BR`
- **Manual override:** seletor de idioma no header (landing) e auth shell
- **Override URL:** `?locale=en` | `?locale=es` | `?locale=pt-BR`

### Motion

- Transitions: **150–300ms** `ease-out`
- Entrance: `animate-fade-in-up`, `stagger-children` (respect `prefers-reduced-motion`)
- Hover: opacity / border-color only — **no layout-shifting scale**
- `prefers-reduced-motion`: disable ambient animations (Magic UI AnimatedGridPattern respects — ANX-504)
- **Default zero (ANX-504):** apenas AnimatedGridPattern (job sentence); estado vazio = HonestState (sem spinner decorativo infinito)

---

## Kit de componentes (ANX-504 — matriz fechada)

Decisões de kit aceitas e **não reabertas** — ver [ANX-504 Visual Kit](../../docs/design-system/ANX-504-visual-kit.md).

### Primitives (shadcn)

- **Fonte:** [shadcn/ui](https://ui.shadcn.com/) — React + Tailwind (sem Next.js)
- **Instalação:** `components/ui/` via CLI shadcn
- **Proibição:** não usar versão Next.js/App Router

### Chrome institucional único (Aceternity ANX-448)

- **Fonte:** [Aceternity UI](https://ui.aceternity.com/) — sidebar + nav
- **Issue:** ANX-448 — chrome único aceito
- **Proibição:** não adicionar segundo sidebar/layout (conflito com Nyxhora)

### Motion (Magic UI — default zero)

- **Fonte:** [Magic UI](https://magicui.design/)
- **Uso:** **apenas** `AnimatedGridPattern` (job sentence) + `prefers-reduced-motion`
- **Proibição:** não instalar biblioteca completa; empty state = HonestState

### Widgets (Nyxhora — sem chrome)

- **Fonte:** [Nyxhora](https://nyxhora.com/) — stat cards, KPI widgets, timeline
- **Restrição:** **não usar** sidebar/layout chrome (conflito com Aceternity); apenas widgets isolados
- **Hero KPI proibido:** números grandes como branding = **banido**

### Séries temporais (ECharts)

- **Fonte:** [Apache ECharts](https://echarts.apache.org/en/index.html)
- **A11y obrigatória:** todo chart precisa de alternativa textual (tabela/summary) **ou BLOCK**
- **Crítica:** chart sem alt honesto = achado BLOCK

### Diagramas (Archify + Mermaid)

- **Archify:** diagramas interativos (architecture, workflow, sequence) — `.archify/specs/`
- **Mermaid:** diagramas em docs (flowchart, sequence) — inline markdown
- **Signature:** grafo Archify no centro do hero/dashboard (ANX-504)

---

## Component Specs

### Buttons

- **Primary:** `bg-copper text-ink`, glow on hover, `min-h-11` (≥44px ANX-504), `rounded-lg`, `font-semibold`
- **Destructive filled:** `bg-destructive text-on-destructive` (≥4.5:1; do not use `text-foreground` on the fill)
- **Secondary:** `border border-rule bg-transparent text-bone`, hover `bg-glass`
- **Ghost:** text only, hover muted background
- All: `cursor-pointer`, visible `:focus-visible ring-2 ring-copper`

**Nota ANX-504:** 
- `bg-accent` → `bg-copper`
- `text-on-accent` → `text-ink`
- `border-border` → `border-rule`
- `text-foreground` → `text-bone`
- `ring-ring` → `ring-copper`
- Targets ≥44×44 CSS px obrigatório

### Cards (OLED / glass)

```css
.glass-card {
  background: rgba(11, 16, 14, 0.6); /* ink com opacidade */
  border: 1px solid rgba(245, 241, 237, 0.08); /* bone opacidade */
  border-radius: 16px;
  backdrop-filter: blur(12px);
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
.glass-card:hover {
  border-color: rgba(196, 132, 58, 0.3); /* copper opacidade */
}
```

**Nota ANX-504:** valores ajustados para ledger (ink/bone/copper).

### Inputs

- `min-h-11` (≥44px ANX-504), `bg-ink`, `border-rule`, `rounded-lg`
- Focus: `ring-2 ring-copper border-copper/50`
- Labels: always visible, `text-sm font-medium text-bone`
- Errors: `text-destructive text-sm` below field
- Loading: disabled + spinner on submit button

**Nota ANX-504:** 
- `bg-surface` → `bg-ink`
- `border-border` → `border-rule`
- `ring-ring` → `ring-copper`
- `border-accent/50` → `border-copper/50`

### Auth shell

- Split layout desktop: brand panel (gradient + logo) | form panel
- Mobile: stacked, form first, compact header
- Footer links: login ↔ register ↔ forgot-password

---

## Style Guidelines

**Style:** Institucional Dark + Signature Archify central (ANX-504 visual kit)

**Keywords:** OLED ink, copper CTA, bone text, Archify signature, Newsreader display, Public Sans body, minimal chrome (Aceternity), HonestState empty

**Landing sections:** 1. Hero + Archify signature center, 2. Feature grid (3–4), 3. Trust strip, 4. Final CTA, 5. Footer

**Auth UX:** blur validation, autocomplete attributes, MFA OTP `inputmode="numeric"`, loading on submit

**Proibições ANX-504:**
- ❌ Hero KPI / big-number-as-brand
- ❌ Copper sobre bone (contraste 2.47:1 insuficiente)
- ❌ Segundo sidebar/switcher-chrome
- ❌ Acid green/neon
- ❌ Decorative loading infinito (empty = HonestState)

---

## Anti-Patterns (Do NOT Use)

- ❌ Emojis as icons — Lucide only
- ❌ AI purple/pink gradients
- ❌ Playful / cartoon fintech
- ❌ Instant state changes
- ❌ Invisible focus states
- ❌ `autocomplete="off"` on auth fields
- ❌ Pure `#000000` backgrounds (OLED smear)
- ❌ **Hero KPI / big-number-as-brand (ANX-504 BANNED)**
- ❌ **Copper sobre bone (contraste 2.47:1 insuficiente — ANX-504)**
- ❌ **Segundo sidebar/switcher-chrome (conflito Aceternity — ANX-504)**
- ❌ **Acid green/neon + Inter (recusado — ANX-504)**
- ❌ **Decorative loading infinito (empty = HonestState — ANX-504)**

---

## Pre-Delivery Checklist

- [ ] Lucide icons only
- [ ] `cursor-pointer` on clickable elements
- [ ] 150–300ms transitions
- [ ] WCAG 2.2 AA ≥4.5:1 contrast (ledger ANX-504: copper-on-ink 7.08:1, bone-on-ink 12.62:1)
- [ ] Focus rings visible (`ring-2 ring-copper`)
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375, 768, 1024, 1440px
- [ ] Form loading states
- [ ] No horizontal scroll on mobile
- [ ] **Targets ≥44×44 CSS px (min-h-11) — ANX-504 obrigatório**
- [ ] **expectAxeClean no `#main-content` — ANX-504**
- [ ] **Chart com alt textual ou BLOCK — ANX-504**
- [ ] **Copper só sobre ink (nunca sobre bone) — ANX-504**
