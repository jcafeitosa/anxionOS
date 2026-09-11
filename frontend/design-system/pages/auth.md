---
type: reference
---

# Auth Pages — Design Overrides

> Overrides for `design-system/MASTER.md` on authentication flows.

## Tokens (inherit from MASTER)

- Plus Jakarta Sans (display) + Inter (body) + JetBrains Mono (ticker)
- OLED palette, accent `--color-accent` (laranja institucional). **Sem acid-green.**
- Do **not** use gold/purple overrides or cream+serif / broadsheet defaults

## Layout

- Split desktop: brand panel (grafo + ticker) | form panel
- Mobile: form first
- Min touch target 44px on all interactive elements
- Visible labels on all form fields (no placeholder-only)
- Skip-link in `BaseLayout`

## Forms

- Inline errors below field (`role="alert"`) with causa + correção
- Disable submit + spinner during async
- Password fields: `autocomplete` attributes set
- MFA/verify-email/reset: pending honesto — sem QR/SMTP fake

## Copy

- User-facing text in PT-BR
- Code identifiers in English
