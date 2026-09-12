---
title: "ANX-505 — FE Better Auth Client (doc-only)"
status: published
type: product-decision
issue: ANX-505
publisher: Marina Okonkwo
draft_author: Renata Alves
critics:
  - Sofia Nascimento (APPROVE board b0e15729)
date: 2026-09-12
refs:
  - https://better-auth.com/docs/introduction
---

# ANX-505 — FE Better Auth Client

## Decisão

Alinhar o cliente FE ao Better Auth **documentado**: plugins **1:1** com o server; sessão via Better Auth (`useSession` / `getSession`); autorização institucional continua no **post-login-context** do domínio anxionOS.

**Escopo:** publicação documental apenas — **sem produto** neste ticket. Eng não claima enquanto Coding P0 = ANX-480.

## Critérios BA1–BA8 (fechados)

| ID | Critério | Anti-sucesso |
|----|----------|--------------|
| BA1 | Client plugins **1:1** com plugins do server Better Auth | Plugin client órfão |
| BA2 | Sessão: `useSession` / `getSession` = fonte de **session** | Session store paralelo |
| BA3 | Autorização: **só** post-login-context decide console/membership | Organization plugin no lugar do domínio |
| BA4 | Sem organization plugin BA substituindo agencies/memberships | Org plugin como SoT de tenant |
| BA5 | Sem twoFactor / passkey / SSO no FE até server montar o par | UI MFA “completa” sem plugin |
| BA6 | `basePath` `/api/auth` alinhado ao proxy Astro → API | Paths divergentes |
| BA7 | Honesty: loading/denied/stale de post-login-context = HonestState | Bounce otimista sem decision |
| BA8 | Auth pages: `expectAxeClean` + ≥44×44 / `min-h-11` | A11y frouxa em `/login` `/register` `/mfa` etc. |

## Clarificações Sofia (incorporadas)

1. **`/mfa` pending honesto ≠ twoFactor:** página MFA pendente / HonestState “MFA pendente” **não** implica plugin `twoFactor` montado — é estado de produto até o root/server montar o plugin (reforça BA5).
2. **BA8:** auth pages herdam a mesma barra a11y das superfícies auth (`expectAxeClean` + alvos ≥44×44 / `min-h-11`).
3. **ANX-499 `session.revoked` intocável:** este ticket **não** reabre realtime / `session.revoked` nem o freeze do cabo BE.

## Evidência checkout (no momento da decisão)

- `frontend/src/lib/auth.ts`: `createAuthClient` de `better-auth/react`, `basePath: "/api/auth"` — sem plugins client explícitos ainda.
- Autorização de console: `postLoginAuthContextSchema` + `canAccessConsole` / `decision.kind`.
- MFA UI: copy cita Better Auth sem plugin `twoFactor` no composition root.

## Fora de escopo

- Claim Cloud Agent / produto enquanto ANX-480 é P0
- Partner live; Strategies UI; segundo shell Aceternity
- Reabrir ANX-499 (`session.revoked` / realtime)

## Autoria

- **Draft:** Renata Alves (`brain/notes/…` local — não versionado)
- **Crítica:** Sofia Nascimento — **APPROVE** (board `b0e15729`)
- **Publicado por:** Marina Okonkwo → `docs/product/`

---

**Cross-references:** ANX-499 (realtime freeze / `session.revoked`), ANX-504 (kit visual / a11y factory), Julio 2026-09-12 (Better Auth client 1:1).
