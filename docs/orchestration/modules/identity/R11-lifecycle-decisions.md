---
type: guide
status: draft
---

# R11 — Decisões de ciclo de vida: `modules/identity`

**Data:** 2026-09-11 · **Issue:** ANX-457 · **Candidato:** `c1aa9515` + `f2755939` + correções G1
**Fontes:** [R03](./R03-domain-sketch.md) · [R04](./R04-contracts.md) · [R08](./R08-decision-log.md) · [R07](./R07-risks.md)

Registro das decisões tomadas durante a implementação do slice R03/R04 que **não** estavam especificadas nos artefatos de debate. Onde há conflito, ele está declarado.

## D-IDN-025 — Suspend é reversível; revoke é terminal (cascata assimétrica)

**Decisão.** `suspendPrincipal` revoga **todas as credenciais de serviço ativas** do principal, mas **mantém a service identity ativa**. `revokePrincipal` revoga a service identity **e** suas credenciais.

**Motivo.** R03 define SUSPENDED como estado reversível e não prevê cascata em suspend. Revogar a service identity em suspend tornava a reativação assimétrica: o principal voltava a ACTIVE mas não conseguia mais operar, sem caminho de recuperação. Ao mesmo tempo, um segredo de serviço não pode sobreviver à suspensão — então a credencial morre, e o principal reemite após reativar (comando de emissão em ANX-457/S5).

| Transição | Service identity | Credenciais ativas | Sessões |
| --- | --- | --- | --- |
| ACTIVE → SUSPENDED | permanece ativa | revogadas | revogadas |
| SUSPENDED → ACTIVE | permanece ativa | (reemitir) | — |
| ACTIVE/SUSPENDED → REVOKED | revogada | revogadas | revogadas |
| REVOKED → qualquer | — | — | — (terminal) |

**Conflito registrado.** A implementação anterior (commit `c1aa9515`) revogava a service identity em suspend, e `tests/identity/recovery-revocation-lifecycle.test.ts` codificava isso. O gate G1 (`b8614ca5`) apontou a assimetria; a decisão acima resolve. Testes atualizados para a nova semântica.

## D-IDN-026 — Efeito externo dentro da transação (ANX-235): fail-closed com lacuna de rastro documentada

**Decisão.** A revogação de sessões do Better Auth continua sendo chamada **dentro** da transação, e falha nela aborta a transação (fail-closed, ANX-235).

**Consequência conhecida e aceita.** O `DELETE` acontece em outra conexão (pool), fora do escopo transacional. Se a transação der rollback depois, as sessões **já foram apagadas** e não há `SessionRef` nem evento registrando isso — divergência entre o estado (principal ainda ativo) e a realidade das sessões.

**Mitigação e rastreio.** A dívida está rastreada em **ANX-459** (`todo`): gravar `SessionRef` em estado `pending_revocation` na mesma transação, confirmar/expirar depois e incluir a causa na resposta ao operador. Enquanto não for implementada, a lacuna é **documentada no código** (`principal-transition.ts`, bloco do revoker) e nos riscos residuais do handoff.

**Limitação conhecida (G4 / A5).** `reconcileSuspendedPrincipalSessions` filtra `status !== "active"`, então a reconciliação de bootstrap **não repara** esta divergência: no cenário de rollback o principal continua ACTIVE e o que sumiu foram as sessões. O reconciliador por estado `pending_revocation` é parte do escopo de ANX-459.

**Resposta ao cliente.** A falha do revoker é mapeada para **503 `IDN_IDENTITY_UNAVAILABLE`** (contrato de R04/OpenAPI), com mensagem que declara o rollback da transição — antes disso o boundary devolvia 500 genérico.

**Por que não inverter agora.** Registrar depois do efeito não elimina a janela (crash entre efeito e commit), e mudar a ordem sem um estado intermediário apenas desloca o problema — exigiria uma coluna nova e um reconciliador.

## D-IDN-027 — Códigos `IDN_*` substituem `PRINCIPAL_*`

**Decisão.** O conjunto canônico de códigos passa a ser o de R04 (`IDN_PRINCIPAL_NOT_FOUND`, `IDN_REVISION_CONFLICT`, `IDN_DUPLICATE_IDEMPOTENCY`, `IDN_IDEMPOTENT_REPLAY`, `IDN_CROSS_TENANT`, `IDN_SESSION_REVOKED`, …). Os códigos anteriores não têm consumidor fora do pacote (verificado por grep em `backend/`).

**`IDN_IDEMPOTENT_REPLAY` não é erro.** É o resultado de um replay bem-sucedido: a aplicação devolve o estado aplicado e **nunca** lança esse código. Ele existe no enum para o snapshot/contrato; `ThrowableIdentityErrorCode` o exclui.

**`IDN_DUPLICATE_IDEMPOTENCY` é alcançável.** Colisão de chave primária em `identity_command_journal` (dois `commandId` iguais concorrentes) é capturada por `isUniqueViolation` e mapeada para esse código (409); o perdedor repete e recebe o replay.

## D-IDN-028 — Fail-closed cobre SUSPENDED **e** REVOKED

**Decisão.** `getPrincipalById` / `getPrincipalByAuthUserId` retornam `null` para qualquer status que não seja ACTIVE.

**Motivo.** O código anterior filtrava apenas `suspended`; com REVOKED introduzido, um principal revogado era devolvido como válido e passava por `assertPrincipalExists` (organizations `createAgency`) e pela resolução de sessão. Invariante: **INV-IDN-01 / D-IDN-008**.

**Verificação.** `tests/identity/recovery-revocation-lifecycle.test.ts` ("revoked principal fails closed for consumers").

## D-IDN-029 — A lookup pública de Principal fica em `organizations`

**Decisão.** O identity **não** publica porta+adapter próprios de leitura de Principal. O contrato público (`PrincipalLookup`) é servido pelo adapter de `organizations` (D-IDN-009), que já existe e é consumido pelo boundary. A porta `PrincipalLookup` e o `createPgPrincipalLookup` criados no S2 foram **removidos** por serem superfície morta duplicada (achado do G1, MEDIUM #4).

**Motivo.** Duas implementações do mesmo contrato divergem: uma passa a filtrar status de um jeito, a outra de outro. Como a decisão aceita já atribui o adapter a `organizations`, manter a cópia no identity era risco sem função.

## D-IDN-030 — Rotas implementadas além da tabela de R04

R04 (`R04-contracts.md:61-66`) descreve quatro rotas. A implementação expõe sete, e as três extras ficam registradas aqui em vez de reescrever o artefato de debate:

| Rota | Capacidade no catálogo | Grant |
| --- | --- | --- |
| `GET /v1/identity/principals/:principalId/sessions` | `identity.session.list` | `identity.read` ou self |
| `POST /v1/identity/sessions/revoke` | `identity.session.revoke` | `identity.admin` ou self |
| `GET /v1/identity/sessions/revoked` | `identity.session.list-revoked` | `identity.admin` |

As capacidades foram adicionadas ao catálogo (`capability-manifest/catalog-v1.ts`), com `identity.principal.register` corrigido para `requiredGrants: ["identity.admin"]` e `idempotencyPolicy.key: "commandId"` — antes divergia do handler e do OpenAPI.

**Nota sobre ids de capacidade:** o schema exige `^[a-z][a-z0-9-]*(\.[a-z][a-zA-Z0-9-]*){1,2}$`, que **não** aceita underscore. Por isso `identity.session.list-revoked` usa hífen; o nome com underscore citado na ficha do módulo não é implementável como `capabilityId`.

## D-IDN-034 — `identity.admin` não implica `identity.read`

R04 lista grants distintos por rota: `identity.read` na leitura, `identity.admin` nos comandos. A implementação respeita isso literalmente, então um operador com **apenas** `identity.admin` recebe `IDN_FORBIDDEN` (403) ao consultar um principal — comportamento descoberto ao escrever os testes HTTP de boundary (`tests/api/identity-http.test.ts`).

**Decisão:** manter como R04 define e exigir os dois grants de quem precisa ler e agir. Não hierarquizar capabilities por conta própria evita uma escalada implícita não declarada no catálogo; se a operação real pedir hierarquia, ela entra como decisão explícita (e como entrada no catálogo), não como conveniência de código.

## D-IDN-031 — Autorização por grant, sem avaliação T01 (divergência consciente de R04)

R04:64-66 pede `identity.admin + T01` para as rotas de comando. A implementação executa **apenas** a checagem de grant (`hasCapability`, dono: `governance`) e, quando o chamador declara `x-agency-id`, exige membership **e** grant com `scopeId` igual à agência.

**Motivo.** Principal é global (D-IDN-023); a autoridade agency-scoped de identity se resolve por membership + grant com escopo, não por traversal do grafo. T01 permanece o gate das operações agency-scoped dos módulos financeiros. Manter as duas checagens aqui duplicaria autoridade sem ganho.

**Consequência aceita:** um grant de plataforma (sem `scopeId`) **não** autoriza um chamador que declara agência — ele precisa de grant emitido para aquela agência. Chamadores de plataforma simplesmente não enviam o header.

## D-IDN-032 — Comandos de credencial são API de módulo, sem rota HTTP

`issueServiceCredential`, `rotateServiceCredential`, `revokeServiceCredential` e `verifyServiceCredential` são consumidos pela **camada de autenticação** (fluxo de service principal, P02+), não por rota administrativa. Expor `verify` na borda criaria um oráculo de adivinhação de chave; expor `issue` sem um consumidor de autenticação seria superfície sem uso.

`rotate` passou a honrar `commandId` (antes ignorava, e um retry rotacionava de novo). Os quatro reutilizam o guard unificado de idempotência (`application/idempotency.ts`), que rejeita reuso da chave por outro comando ou outro agregado com `IDN_DUPLICATE_IDEMPOTENCY` — antes um reuso divergente devolvia 200 sem aplicar a operação (achado A1/A2 do G2).

## D-IDN-033 — `.strict()` na projeção é defesa para chamadores futuros

`identityUserProjectionNodeSchema` é `.strict()`: atributo proibido (token, `secretHash`, `externalRefHash`, cookie) **falha**. A factory `toIdentityUserProjectionNode` monta o nó por whitelist, então não consegue emitir atributo proibido — a proteção vale para um projector que construa o nó à mão. O teste de vazamento exercita a factory; o de rejeição exercita o schema direto. A projeção só terá consumidor de produção no P03 (`graph`).

## D-IDN-035 — `scopeId: null` significa "só autoridade de plataforma" (corrige o bypass de escopo)

`hasCapability` (governance) tinha três estados implícitos em dois: `scopeId` ausente valia como "qualquer escopo" e o boundary de identity passava `input.agencyId` — **`undefined` quando o header `x-agency-id` era omitido**. Resultado: um grant emitido para a agência A autorizava as rotas globais (`GET /v1/identity/sessions/revoked`, registro, suspend, revoke) bastando **não** enviar o header. Achado HIGH da revalidação G2.

**Decisão.** `scopeId` passa a ter três significados explícitos: `string` = exatamente aquele escopo; `null` = **apenas** grant sem escopo (autoridade de plataforma); `undefined` = sem filtro de escopo, reservado a capabilities scope-agnósticas por contrato (`console.platform`). O boundary de identity passa `scopeId: input.agencyId ?? null`.

**Consequência aceita e lacuna registrada.** `governance_grants.scope_id` é `NOT NULL` e `scope_kind` só admite `agency|organization` — **não existe escopo de plataforma modelado**. Hoje nenhum seed concede `identity.read`/`identity.admin`, então nenhum fluxo real depende de operação global; quando existir operador de plataforma com identity admin, o grant dele precisa de um escopo de plataforma de primeira classe no `governance` (não de um UUID sentinela como o `console.platform` do dev seed). Lacuna rastreada em **ANX-462**.

## D-IDN-036 — Registro concorrente resolve por `ON CONFLICT DO NOTHING` + releitura

`registerPrincipal` usava `INSERT` puro: 10 chamadas concorrentes com a **mesma** `Idempotency-Key` devolviam `[200,500,500,...]` (23505 cru abortando a transação). Achado HIGH da revalidação G2.

**Decisão.** A porta `PrincipalRepository` ganhou `createIfAbsent` (`INSERT ... ON CONFLICT DO NOTHING RETURNING`), que espera o desfecho do concorrente em vez de abortar. Sem linha devolvida, o comando resolve por releitura: mesmo `authUserId` → replay idempotente do mesmo principal; `authUserId` diferente ocupando o e-mail → `IDN_PRINCIPAL_EMAIL_TAKEN`; nada encontrado → `IDN_DUPLICATE_IDEMPOTENCY`.

**Corrida de ordenação coberta.** Entre `findByAuthUserId` e `findByEmail` o vencedor pode commitar; se a linha que ocupa o e-mail tem o **mesmo** `authUserId`, ela é o nosso próprio registro (replay), não e-mail de terceiro. Sem essa checagem o perdedor recebia `IDN_PRINCIPAL_EMAIL_TAKEN` falso — a corrida foi reproduzida 5× contra PostgreSQL real antes e depois da correção (teste de integração com 10 chamadas).

## D-IDN-037 — O atalho "já revogada" não precede a checagem de intenção da key

`recordSessionRevoked` lia a `SessionRef` **fora** da transação e retornava `transitioned: false` antes de consultar o journal: reusar a `Idempotency-Key` em **outro** sessionRef já revogado devolvia 200 (replay do agregado errado) em vez de `IDN_DUPLICATE_IDEMPOTENCY`. Achado MEDIUM da revalidação G2.

**Decisão.** As duas saídas de sucesso (replay do journal e "já revogada") vivem dentro da transação, **depois** da validação de intenção. A leitura de estado passou a acontecer dentro da TX — também elimina a leitura obsoleta.

## D-IDN-038 — Atributo opcional inválido é omitido, não derruba o nó de projeção

Na projeção `:User`, um `kind`/`email`/`revision` opcional corrompido no envelope reprovava o candidato no `.strict()` e o projector recebia `null` — perda silenciosa do nó inteiro. Achado LOW da revalidação G2.

**Decisão.** Cada atributo opcional é validado isoladamente (`safeParse`): o que valida é projetado, o que não valida é omitido. O `.strict()` continua rejeitando atributo **proibido** (segredo) para quem constrói o nó à mão (D-IDN-033) — esse caso segue falhando, e é o que o teste de rejeição exercita. A factory monta o nó por whitelist, então `secretHash` nunca chega a ser candidato.

## Conflito aberto — R04 vs D-IDN-023 (`organizationId` em Principal)

R04 descreve o payload de `identity.principal.registered.v1` com `organizationId` e uma idempotência `(organizationId, subjectKey)`. D-IDN-023 (aceito) define Principal **global**, com tenancy via Membership em `organizations`, e D-IDN-006 fixa idempotência por `authUserId`.

**Resolução aplicada:** a decisão aceita prevalece — Principal global, sem `organizationId` em evento de identidade; escopo de agência é aplicado na **autorização HTTP**, não na identidade. Registrado também no pacote de contexto do S5 (ANX-457). Este conflito não reabre D-IDN-006/023.

## Fora de escopo (com dono)

RLS PostgreSQL (`D-IDN-018` → P09) · projeção Neo4j `:User` (`D-IDN-020` → `graph`) · `/v1/auth/*` (Better Auth em `apps/api`) · capital real e autonomia L3/L4 (ANX-172/173, `backlog`).
