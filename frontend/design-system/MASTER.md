---
type: reference
---

# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** anxionOS  
**Generated:** 2026-09-07 (ui-ux-pro-max + uupm.cc dark premium pattern)  
**Category:** Fintech / Institutional SaaS  
**Reference:** [UI/UX Pro Max](https://www.uupm.cc/) — dark-first premium SaaS

---

## Global Rules

### Color Palette (dark-first)

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Background | `#020617` | `--color-background` |
| Background Deep | `#020203` | `--color-background-deep` |
| Surface | `#0a0a0c` | `--color-surface` |
| Surface Elevated | `#0f172a` | `--color-surface-elevated` |
| Glass | `rgba(255,255,255,0.05)` | `--color-glass` |
| Foreground | `#f8fafc` | `--color-foreground` |
| Muted Foreground | `#94a3b8` | `--color-muted-foreground` |
| Primary | `#1e293b` | `--color-primary` |
| Secondary | `#334155` | `--color-secondary` |
| Accent / CTA | `#f97316` | `--color-accent` |
| Accent Blue | `#3b82f6` | `--color-accent-blue` |
| On Accent | `#0f172a` | `--color-on-accent` |
| Border | `rgba(255,255,255,0.08)` | `--color-border` |
| Destructive | `#ef4444` | `--color-destructive` |
| On Destructive | `#0f172a` | `--color-on-destructive` |
| Ring | `#f97316` | `--color-ring` |

**Color Notes:** OLED deep blacks, orange primary CTA, blue secondary accent. Subtle aurora gradients (blue-orange) in hero only — never purple/pink AI gradients.

### Typography

- **Heading Font:** Plus Jakarta Sans (display, modern tech)
- **Body Font:** Inter
- **Mono:** JetBrains Mono (IDs, codes)
- **Mood:** premium fintech, institutional trust, bold hero, restrained UI chrome
- **Google Fonts:** [Plus Jakarta Sans + Inter + JetBrains Mono](https://fonts.google.com/share?selection.family=Inter:wght@300;400;500;600;700|JetBrains+Mono:wght@400;500|Plus+Jakarta+Sans:wght@400;500;600;700;800)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
```

**Hero scale:** `font-size: clamp(2.5rem, 6vw, 4.5rem); letter-spacing: -0.03em;`

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
| `--shadow-glow-accent` | `0 0 40px rgba(249,115,22,0.15)` | Primary CTA |
| Glass border | `1px solid rgba(255,255,255,0.08)` | Cards, auth panels |
| Glass blur | `backdrop-filter: blur(12px)` | Nav, modals |

### Internationalization

- **Locales:** `pt-BR` (default), `en`, `es`
- **Auto-detect:** geo IP (ipapi.co) → cookie `anxion_locale` → `Accept-Language` → `pt-BR`
- **Manual override:** seletor de idioma no header (landing) e auth shell
- **Override URL:** `?locale=en` | `?locale=es` | `?locale=pt-BR`

### Motion

- Transitions: **150–300ms** `ease-out`
- Entrance: `animate-fade-in-up`, `stagger-children` (respect `prefers-reduced-motion`)
- Hover: opacity / border-color only — **no layout-shifting scale**
- `prefers-reduced-motion`: disable ambient blob animation

---

## Component Specs

### Buttons

- **Primary:** `bg-accent text-on-accent`, glow on hover, `min-h-11`, `rounded-lg`, `font-semibold`
- **Destructive filled:** `bg-destructive text-on-destructive` (≥4.5:1; do not use `text-foreground` on the fill)
- **Secondary:** `border border-border bg-transparent text-foreground`, hover `bg-glass`
- **Ghost:** text only, hover muted background
- All: `cursor-pointer`, visible `:focus-visible` ring

### Cards (OLED / glass)

```css
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  transition: border-color 200ms ease, box-shadow 200ms ease;
}
```

### Inputs

- `min-h-11`, `bg-surface`, `border-border`, `rounded-lg`
- Focus: `ring-2 ring-ring border-accent/50`
- Labels: always visible, `text-sm font-medium`
- Errors: `text-destructive text-sm` below field
- Loading: disabled + spinner on submit button

### Auth shell

- Split layout desktop: brand panel (gradient + logo) | form panel
- Mobile: stacked, form first, compact header
- Footer links: login ↔ register ↔ forgot-password

---

## Style Guidelines

**Style:** Modern Dark (Cinema) + Hero-centric landing (uupm.cc pattern)

**Keywords:** OLED, glassmorphism, deep black, orange CTA, blue accent, generous whitespace, Lucide icons

**Landing sections:** 1. Hero + dual CTA, 2. Feature grid (3–4), 3. Trust strip, 4. Final CTA, 5. Footer

**Auth UX:** blur validation, autocomplete attributes, MFA OTP `inputmode="numeric"`, loading on submit

---

## Anti-Patterns (Do NOT Use)

- ❌ Emojis as icons — Lucide only
- ❌ AI purple/pink gradients
- ❌ Playful / cartoon fintech
- ❌ Instant state changes
- ❌ Invisible focus states
- ❌ `autocomplete="off"` on auth fields
- ❌ Pure `#000000` backgrounds (OLED smear)

---

## Pre-Delivery Checklist

- [ ] Lucide icons only
- [ ] `cursor-pointer` on clickable elements
- [ ] 150–300ms transitions
- [ ] WCAG 4.5:1 contrast on dark
- [ ] Focus rings visible
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375, 768, 1024, 1440px
- [ ] Form loading states
- [ ] No horizontal scroll on mobile
