-- S2 (ANX-460) — idempotencia com intencao nos comandos de organizations.
--
-- O replay por `Idempotency-Key` so' era valido enquanto a chave fosse repetida
-- para o MESMO comando contra o MESMO recurso. Sem registrar a intencao, reusar
-- a key com outro payload devolvia 200 `idempotentReplay` sem aplicar.
--
-- `request_hash` guarda o fingerprint canonico (SHA-256 de JSON com chaves
-- ordenadas) do payload do comando, o que torna a comparacao de intencao
-- independente do estado atual do agregado (um replay legitimo apos o agregado
-- mudar de estado continua valido). Mesmo desenho validado no governance
-- (migration 0011 / `command-support.ts`).
ALTER TABLE organizations_command_journal
  ADD COLUMN IF NOT EXISTS request_hash TEXT;
