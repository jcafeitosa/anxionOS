-- ANX-469 — emissor do grant.
--
-- O catalogo declara `governance.grant.revoke` como "Owner ou issuer", mas o
-- grant nao registrava quem o emitiu: sem essa coluna a metade "ou issuer" da
-- regra e' inimplementavel, e a rota `DELETE /v1/agencies/:agencyId/grants/:grantId`
-- ficava apenas com a guarda de papel (um `operator` revogava grants do owner).
--
-- `NULL` e' semanticamente correto para grants derivados pelo sistema, que nao
-- tem principal emissor: baseline CAP-B01 emitida no `membership.activated`,
-- break-glass e grants filhos de delegation. Esses so' sao revogaveis pela
-- autoridade de `owner`/`admin` da agencia. Aditivo e idempotente: nenhuma
-- linha existente muda de valor (todas ficam com emissor desconhecido).
ALTER TABLE governance_grants
 ADD COLUMN IF NOT EXISTS issued_by_principal_id UUID;
