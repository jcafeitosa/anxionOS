-- ANX-476/A — fingerprint do payload no journal de idempotencia.
--
-- O journal guardava so' `command_name` + `aggregate_id` + `response_snapshot`.
-- Para a transicao de autonomia isso nao identifica a intencao: o agregado
-- (`governance_autonomy_assignments`) persiste nivel/alvo/evidenceHash/approvalId,
-- mas `transitionKind`, `actorPrincipalId` e `reason` so' existem no evento.
-- Consequencia: reusar a `Idempotency-Key` com esses campos divergentes
-- devolvia 200 `idempotentReplay` e ignorava o payload novo.
--
-- `request_hash` guarda o fingerprint canonico (SHA-256 de JSON com chaves
-- ordenadas) calculado pelo comando. Comandos cujo agregado reconstroi o payload
-- inteiro nao o preenchem (ficam `NULL`), entao a coluna e' anulavel. Aditiva e
-- idempotente: nenhuma linha existente muda de valor.
ALTER TABLE governance_command_journal
 ADD COLUMN IF NOT EXISTS request_hash TEXT;
