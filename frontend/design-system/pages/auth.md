# Auth Pages — Design Overrides

> Overrides for `design-system/MASTER.md` on authentication flows.

## Tokens (inherit from MASTER)

- Keep IBM Plex Sans, dark OLED palette (`#020617` background, `#22C55E` accent)
- Do **not** use gold/purple overrides from generic fintech search

## Layout

- Centered card (`max-w-md`), `AuthShell` with subtle radial accent glow
- Min touch target 44px on all interactive elements
- Visible labels on all form fields (no placeholder-only)

## Forms

- Inline errors below field (`role="alert"`)
- Disable submit + spinner during async
- Password fields: `autocomplete` attributes set
- MFA: `inputmode="numeric"`, `autocomplete="one-time-code"`

## Accessibility

- Focus rings via `--color-ring` (accent green)
- `prefers-reduced-motion` respected (global.css)
- Alert regions use `aria-live="polite"` or `role="alert"`

## Copy

- User-facing text in PT-BR
- Code identifiers in English
