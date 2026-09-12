---
title: "ANX-496 — Owner Catalog Honesty UX (Renata)"
status: published
type: product-decision
issue: ANX-496
publisher: Marina Okonkwo
draft_author: Renata (orchestrator)
date: 2026-09-12
---

# ANX-496 — Owner Catalog Honesty UX

## Decisão Renata

**Aprovado**: `OwnerAgentsCatalog` apenas.  
**Bloqueado**: Operator Takeover fora do escopo P07.

### Escopo

- **Owner**: `OwnerAgentsCatalog` (catálogo de agentes).
- **Operator Takeover**: engenharia estacionada; retomar somente após reabertura CPO.

### Critérios de Honestidade UX

- **H1–H4** + **HX1–HX6** aplicam-se.
- **Matriz de evidência**: obrigatória quando engenharia retomar.

## Evidência

- **FE**: `agency-agents-catalog.ts` e `OwnerAgentsCatalog.tsx` existem.
- **e2e**: vazio (ainda não escrito).
- **API**: `origin/main` **não** tem `GET` de collection; WIP local não conta.

## Autoria

- **Draft**: Renata (orquestrador)
- **Publicado por**: Marina Okonkwo

---

**Cross-references**: ANX-498 (backend-only), ANX-499 (realtime), ANX-500 (diagnosis), ANX-500-ux-criteria-supersede.
