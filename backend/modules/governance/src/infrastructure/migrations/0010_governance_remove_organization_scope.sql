-- ANX-469 — remove o valor morto `organization` de `governance_scope_kind`.
--
-- Nenhum modulo possui entidade Organization, nenhum produtor emitia
-- `scopeKind: "organization"` e nenhum consumidor de autorizacao o lia
-- (`hasCapability` filtra apenas `scope_id`). O valor so' criava a expectativa
-- falsa de um escopo institucional que nao existe. Verificado no banco
-- `anxionos_g5r` antes da remocao: `SELECT count(*) ... WHERE scope_kind =
-- 'organization'` = 0.
--
-- PostgreSQL nao remove valor de enum no lugar, entao o tipo e' recriado. O
-- bloco e' idempotente (so' age se o rotulo existir) e fail-closed: se houver
-- qualquer linha com o valor, o cast falha e a migration aborta em vez de
-- apagar dado silenciosamente.
DO $$
BEGIN
 IF EXISTS (
  SELECT 1
  FROM pg_enum e
  JOIN pg_type t ON t.oid = e.enumtypid
  WHERE t.typname = 'governance_scope_kind'
    AND e.enumlabel = 'organization'
 ) THEN
  ALTER TYPE governance_scope_kind RENAME TO governance_scope_kind_legacy;
  CREATE TYPE governance_scope_kind AS ENUM ('agency', 'platform');
  ALTER TABLE governance_grants
   ALTER COLUMN scope_kind TYPE governance_scope_kind
   USING scope_kind::text::governance_scope_kind;
  DROP TYPE governance_scope_kind_legacy;
 END IF;
END $$;
