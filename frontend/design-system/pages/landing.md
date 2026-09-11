---
type: reference
---

# Page Override: Landing (`/`)

Overrides `MASTER.md` for the public marketing landing.

## Layout

- **Nav:** sticky, `backdrop-blur`, glass border-bottom, logo left, CTAs right (`Entrar` ghost + `Começar` primary)
- **Hero:** full-width, `min-h-[85dvh]`, ambient gradient blobs (orange + blue, opacity 8–12%), centered `max-w-4xl`
- **Headline:** Calistoga, `clamp(2.5rem, 6vw, 4.5rem)`, PT-BR
- **Subtext:** Inter, `text-lg text-muted-foreground`, max 2 lines
- **CTAs:** Primary `Criar conta` → `/register`, Secondary `Entrar` → `/login`

## Sections (order)

1. **Hero** — headline, subtext, dual CTA, optional product mock card (glass)
2. **Features** — 3-column grid (`sm:grid-cols-2 lg:grid-cols-3`), Lucide icon in rounded square, title + 1-line description
3. **Institutional strip** — single row: grafo, governança, auditoria (icons + short labels)
4. **Final CTA** — bordered glass card, headline + single primary button
5. **Footer** — links: Login, Termos (placeholder `#`), © anxionOS

## Copy (PT-BR)

- Headline: *Investimentos autônomos com governança institucional*
- Subtext: *Agentes, capital e decisões conectados em um grafo auditável — para owners que exigem controle real.*
- Feature titles: Grafo institucional · Agentes governados · Connections seguras

## Motion

- Blob animation: 10s ease infinite alternate (disable with `prefers-reduced-motion`)
- Nav link hover: `text-foreground` 200ms

## Do not

- No dashboard widgets on landing
- No emoji icons
- No light-mode variant in P07
