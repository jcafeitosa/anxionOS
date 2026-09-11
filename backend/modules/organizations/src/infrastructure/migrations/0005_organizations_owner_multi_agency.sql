-- D-ORG-035 — um Owner pode possuir N Agencies.
--
-- Fonte decisoria exata (a linha-resumo da tabela de D-ORG-035 fala so' de quota
-- `maxCompanies`, o que torna a citacao ambigua): `docs/orchestration/modules/
-- organizations/R08-decision-log.md`, secao expandida de D-ORG-035, linha
-- "Indice preventivo" — "**Nao** adicionar `(owner_principal_id)` UNIQUE em
-- agencies — Owner legitimo pode ter multiplas empresas no produto" — combinada
-- com a linha "organizations v1 | Nao implementa contagem/quota; permite N
-- Agencies por Owner tecnicamente". A cardinalidade correta e' a de D-ORG-009
-- (invariante INV-ORG-02): exatamente um Membership `role=owner` ativo por
-- **Agency**.
--
-- A migration 0000 criou `organizations_owners_principal_id_unique` como UNIQUE
-- em `organizations_owners (principal_id)`, o que tornava o principal unico na
-- plataforma inteira. Como cada Agency e' um tenant (RLS por tenant_id/agency_id
-- em `organizations_owners`), a segunda `createAgency` do mesmo Owner nao
-- enxergava a linha da primeira e tentava inserir de novo, estourando `23505`
-- cru -> 500.
--
-- A regra correta e' "1 owner ativo por AGENCY", garantida pelos membros ativos
-- (`organizations_memberships`), nao pela unicidade de owners. Esta migration e'
-- idempotente e nao-destrutiva: nenhuma linha e' removida, apenas o indice
-- UNIQUE vira um indice comum de consulta por principal.
DROP INDEX IF EXISTS organizations_owners_principal_id_unique;

CREATE INDEX IF NOT EXISTS organizations_owners_principal_id_idx
  ON organizations_owners (principal_id);
