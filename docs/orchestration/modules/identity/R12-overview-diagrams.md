# R12 — Overview e diagramas do módulo `identity`

Documento derivado do **código verificado** (não de sketch). Cada diagrama tem a fonte
(`arquivo:linha`) ao lado, e os números citados foram medidos no digest `cf9ea2ec`:
`tsc --build --force` 0 · `lint` 0 · `boundaries` 0 · suíte completa com PostgreSQL real
**1611 pass / 0 fail / 0 skip** · oráculo de banco virgem **PASS**.

> Correção de registro: a ficha e vários comentários meus citavam "7 eventos". São **12**
> (`packages/contracts/src/identity/events.ts:15-28`). Este documento é a referência.

---

## 1. Visão em uma linha

`identity` é o dono do **Principal institucional** (global, sem FK de agência), das
**sessões humanas** via Better Auth (só referências lógicas), dos **service principals**
com credenciais rotacionáveis, e do **contrato de projeção `:User`** consumido pelo `graph`.
Não é dono de grants (`governance`), nem de memberships/agências (`organizations`), nem do
projector de grafo (`graph`).

## 2. Arquitetura em camadas (ADR0002)

```mermaid
graph TD
    subgraph API["apps/api — composition root"]
        PL["identity/plugin.ts<br/>7 rotas /v1/identity"]
        H["handlers.ts<br/>validação Zod + autorização"]
        AUTHZ["authorization.ts<br/>requireSelfOrGrant / requireIdentityGrant"]
        EH["error-handler.ts<br/>IDN_* → status HTTP"]
        BSR["bootstrap-session-revocation.ts<br/>consumer NATS"]
    end

    subgraph DOM["modules/identity/src/domain — sem framework"]
        E1["entities: principal, service-identity,<br/>service-credential, session-ref"]
        P1["ports: principal-repository, session-ref-repository,<br/>service-credential-repository, command-journal,<br/>agency-scope, identity-unit-of-work"]
    end

    subgraph APP["modules/identity/src/application"]
        C["7 comandos + 5 queries"]
        IDEM["idempotency.ts<br/>CommandIntent"]
        PR["presenters.ts<br/>DTO sem segredo"]
    end

    subgraph INFRA["modules/identity/src/infrastructure"]
        DB["create-db.ts<br/>Drizzle + migrator (schema identity)"]
        MIG["migrations/0000, 0001<br/>+ meta/_journal.json"]
        CRY["adapters/credential-crypto.ts<br/>scrypt assíncrono"]
    end

    subgraph GRA["modules/identity/src/graph"]
        PROJ["projection-contract.ts<br/>nó :User (.strict)"]
    end

    PL --> H --> AUTHZ
    H --> C
    C --> P1
    E1 --- P1
    C --> IDEM
    C --> PR
    DB -.implementa.-> P1
    DB --> MIG
    C --> CRY
    C --> PROJ
    BSR --> C
    H --> EH
```

## 3. Mapa de ownership e integração

```mermaid
graph LR
    subgraph ID["identity (este módulo)"]
        PRIN["Principal global<br/>D-IDN-023"]
        SESS["SessionRef<br/>referência lógica"]
        SVC["ServiceIdentity +<br/>ServiceCredential"]
        CONTR["Contrato de projeção :User"]
    end

    ORG["organizations<br/>dono de Membership/Agência"]
    GOV["governance<br/>dono de Grant/Mandato"]
    GRAPH["graph<br/>dono do projector"]
    APIAUTH["apps/api<br/>Better Auth (sessão real)"]

    ORG -- "PrincipalLookup.getPrincipalById" --> ID
    ORG -- "AgencyScopePort.listAgencyIdsForPrincipal" --> ID
    GOV -- "hasCapability(grant)" --> ID
    ID -- "12 eventos versionados" --> GRAPH
    ID -- "eventos identity.session.revoked.v1" --> GOV
    APIAUTH -- "authUserId → Principal" --> ID
    ID -. "NUNCA escreve estado alheio" .-> ORG
    ID -. "NUNCA lê tabela de grant" .-> GOV
```

**Regra de fronteira:** o módulo **não** guarda FK de agência e **não** lê a tabela de
grants — a autorização chega por `hasCapability` (governance) e a tenancy por
`AgencyScopePort` (organizations).

## 4. Ciclo de vida do Principal

```mermaid
stateDiagram-v2
    [*] --> active: RegisterPrincipal
    active --> suspended: SuspendPrincipal
    suspended --> active: ReactivatePrincipal
    active --> revoked: RevokePrincipal
    suspended --> revoked: RevokePrincipal
    revoked --> [*]: terminal (nunca reativa)

    note right of suspended
        Reversível (D-IDN-025)
        Cascata: revoga CREDENCIAIS
        Mantém ServiceIdentity
        Revoga sessões Better Auth
    end note

    note right of revoked
        Terminal
        Cascata: ServiceIdentity +
        credenciais + sessões
    end note
```

Leituras **fail-closed**: `getPrincipalById` devolve `null`/404 para qualquer estado
≠ `active` (INV-IDN-01, D-IDN-008) — não há caminho que devolva o DTO de um principal
suspenso ou revogado.

## 5. Ciclo de vida da credencial de serviço

```mermaid
stateDiagram-v2
    [*] --> active: IssueServiceCredential
    active --> rotated: RotateServiceCredential
    active --> revoked: RevokeServiceCredential
    active --> expired: expiresAt < now
    active --> revoked: suspend/revoke do Principal
    rotated --> [*]
    revoked --> [*]
    expired --> [*]

    note right of active
        prefix (público) + secret
        secret NUNCA persistido:
        só scrypt(secret)
    end note
```

`verifyServiceCredential` devolve `{ valid, reason }` discriminado:
`malformed | not_found | revoked | rotated | expired | mismatch | identity_inactive |
principal_inactive`. **Sem rota HTTP** (D-IDN-032) — expor `verify` criaria oráculo de
adivinhação de chave.

## 6. Fluxo de uma requisição HTTP (com autorização)

```mermaid
sequenceDiagram
    autonumber
    participant C as Cliente
    participant E as Elysia (plugin)
    participant R as resolveSessionContext
    participant AZ as authorization.ts
    participant G as governance (hasCapability)
    participant O as organizations (AgencyScopePort)
    participant H as handler/command
    participant U as UnitOfWork

    C->>E: POST /v1/identity/principals/:id/suspend
    E->>R: sessão Better Auth + headers
    R->>R: x-agency-id → UUID (vazio/inválido = 400)
    R-->>E: { actorPrincipalId, agencyId? }
    E->>AZ: requireIdentityGrant(capability, agencyId, target)
    AZ->>O: isMember(agencyId, ator) — se agência declarada
    AZ->>O: listAgencyIdsForPrincipal(alvo)
    Note over AZ: alvo precisa ser membro ATIVO da agência<br/>E não ter vínculo ativo em OUTRA agência
    AZ->>G: hasCapability(scopeId = agência ?? PLATFORM)
    G-->>AZ: true/false
    AZ-->>E: ok ou IDN_FORBIDDEN / IDN_CROSS_TENANT
    E->>H: handler (Zod) → comando
    H->>U: runInTransaction
    U->>U: estado + journal + outbox (MESMA TX)
    U-->>C: 200 DTO (sem authUserId, sem segredo)
```

## 7. Decisão de autorização (as 3 regras)

```mermaid
flowchart TD
    A["Requisição /v1/identity/*"] --> B{"É self-access?<br/>(ator == alvo)"}
    B -- sim --> C["Permitido SEM grant<br/>(D-IDN-030)"]
    B -- não --> D{"Rota tem alvo?"}
    D -- sim --> E["Alvo precisa ter membership ATIVA<br/>na agência declarada"]
    E --> F{"Alvo tem vínculo ativo<br/>em OUTRA agência?"}
    F -- sim --> G["403 IDN_CROSS_TENANT<br/>só plataforma opera (ANX-465)"]
    F -- não --> H
    D -- não --> H{"Rota é de efeito GLOBAL?<br/>register / sessions-revoked"}
    H -- sim --> I["Exige escopo PLATAFORMA<br/>(PLATFORM_SCOPE_ID)"]
    H -- não --> J["Exige grant no escopo declarado<br/>(agência) ou plataforma"]
    I --> K{"Grant confere?"}
    J --> K
    K -- não --> L["403 IDN_FORBIDDEN"]
    K -- sim --> M["Executa comando"]

    C --> M
```

**`identity.admin` NÃO implica `identity.read`** (D-IDN-034): as duas capabilities são
verificadas separadamente, e o catálogo as declara distintas.

## 8. Registro de Principal — idempotência e corrida

```mermaid
sequenceDiagram
    autonumber
    participant A as Cliente A
    participant B as Cliente B
    participant CMD as registerPrincipal
    participant U as UnitOfWork
    participant DB as PostgreSQL

    par concorrentes com a MESMA Idempotency-Key
        A->>CMD: POST {authUserId, email} + key K
        B->>CMD: POST {authUserId, email} + key K
    end

    A->>U: runInTransaction
    B->>U: runInTransaction
    A->>DB: findByAuthUserId → nada
    B->>DB: findByAuthUserId → nada
    A->>DB: createIfAbsent (INSERT ... ON CONFLICT DO NOTHING)
    Note over A,DB: vencedor insere e segura o lock da linha
    B->>DB: createIfAbsent → aguarda o desfecho
    A->>DB: journal + outbox (mesma TX) → COMMIT
    B->>DB: 0 linhas (conflito) → re-leitura por authUserId
    DB-->>B: principal do vencedor
    B-->>B: replay do MESMO principal (sem 2º evento)
    Note over B: e-mail ocupado por OUTRO authUserId<br/>→ IDN_PRINCIPAL_EMAIL_TAKEN<br/>nada encontrado → IDN_DUPLICATE_IDEMPOTENCY
```

Prova real (5 execuções × 10 chamadas simultâneas em PostgreSQL): **todas 200, 1
principal, 1 linha de journal, 1 evento, zero 500** (D-IDN-036).

## 9. Revogação de sessão — posse como invariante

```mermaid
flowchart TD
    A["POST /v1/identity/sessions/revoke<br/>{principalId, sessionRefId, externalRefHash?}"] --> B["authorization: self OU identity.admin<br/>+ alvo na agência declarada"]
    B --> C{"Já existe journal para a key?"}
    C -- "sim, mesma intenção" --> D["Replay do resultado"]
    C -- "sim, intenção divergente" --> E["409 IDN_DUPLICATE_IDEMPOTENCY"]
    C -- não --> F["Resolver a referência por ID"]
    F --> G{"Encontrada?"}
    G -- não --> H{"Tem externalRefHash?"}
    H -- não --> I["404 IDN_SESSION_NOT_FOUND"]
    H -- sim --> J["Resolver por HASH"]
    J --> K{"principal da linha == declarado?"}
    K -- não --> I
    K -- sim --> L
    G -- sim --> K
    K -- sim --> L{"status já revoked?"}
    L -- sim --> M["Grava journal (no-op) + 200 transitioned=false"]
    L -- não --> N["revoke + evento session.revoked.v1 + journal"]
```

Os **três caminhos** (id, hash, journal) validam posse — o IDOR e o bypass por
`externalRefHash` foram fechados (D-IDN-043, D-IDN-047), com **404 opaco** para não
confirmar a existência de referência de terceiro.

## 10. Idempotência — modelo geral

```mermaid
flowchart LR
    A["Idempotency-Key"] --> B["commandId (UUID)"]
    B --> C["journal do módulo<br/>(PK = command_id)"]
    C --> D{"existe?"}
    D -- não --> E["executa + grava estado,<br/>journal e outbox na MESMA TX"]
    D -- sim --> F{"intenção confere?<br/>(commandName + agregado)"}
    F -- sim --> G["replay do resultado"]
    F -- não --> H["409 IDN_DUPLICATE_IDEMPOTENCY"]
    E --> I{"23505 no insert do journal?"}
    I -- sim --> H
```

O guard `isUniqueViolation` **percorre a cadeia `cause`** — o drizzle embrulha o erro do
pg em `DrizzleQueryError` com o `code` em `cause`; sem isso o mapeamento ficava morto.

## 11. Modelo de dados (ER)

```mermaid
erDiagram
    identity_principals {
        uuid id PK
        text auth_user_id UK "null para service principal"
        text email UK
        enum kind "human|service"
        enum status "active|suspended|revoked"
        int revision
        timestamptz suspended_at
        text suspension_reason
        timestamptz revoked_at
        text revocation_reason
    }
    identity_service_identities {
        uuid id PK
        uuid principal_id FK
        text label
        enum status "active|revoked"
        int revision
    }
    identity_sessions {
        uuid id PK
        uuid principal_id FK
        text external_ref_hash UK "sha256 — nunca o token"
        enum status "active|revoked"
        timestamptz revoked_at
        text revocation_reason
    }
    identity_service_credentials {
        uuid id PK
        uuid service_identity_id FK
        text prefix UK
        text secret_hash "scrypt — nunca o plaintext"
        enum status "active|rotated|revoked|expired"
        timestamptz issued_at
        timestamptz expires_at
        timestamptz rotated_at
        uuid rotated_to_id
        timestamptz revoked_at
    }
    identity_command_journal {
        uuid command_id PK
        text command_name
        uuid aggregate_id
        text aggregate_type
        int revision
        jsonb response_snapshot
        timestamptz created_at
    }

    identity_principals ||--o{ identity_service_identities : "possui"
    identity_principals ||--o{ identity_sessions : "possui"
    identity_service_identities ||--o{ identity_service_credentials : "possui"
```

Migrator Drizzle com **journal no schema `identity`** (`migrationsSchema`), o que evita o
defeito de journal compartilhado entre módulos (ANX-463).

## 12. Projeção de grafo — nó `:User`

```mermaid
graph LR
    subgraph EVENTOS["12 eventos de identity"]
        E1["principal.registered.v1"]
        E2["principal.suspended.v1"]
        E3["principal.reactivated.v1"]
        E4["principal.revoked.v1"]
        E5["session.revoked.v1"]
        E6["service_credential.*.v1"]
    end

    subgraph PROJECTOR["graph — projector (D-IDN-020)"]
        P["toIdentityUserProjectionNode<br/>(contrato publicado por identity)"]
    end

    NODE[":User<br/>nodeKey = user:&lt;principalId&gt;<br/>status, revision, email?, kind?<br/>ownerDomain=identity, eventId, checkpoint"]

    E1 --> P
    E2 --> P
    E3 --> P
    E4 --> P
    E5 -. "não projeta (null)" .-> P
    E6 -. "não projeta (null)" .-> P
    P --> NODE

    style NODE fill:#e8f5e9
```

O schema é **`.strict()`**: atributo extra (token, `secretHash`, `externalRefHash`,
cookie) **falha** em vez de passar. Cada atributo opcional é validado isoladamente — um
campo corrompido no envelope é **omitido**, não derruba o nó (D-IDN-038).

## 13. Eventos, outbox e consumidores

```mermaid
graph LR
    CMD["Comando"] --> TX["Transação única"]
    TX --> ST["Estado<br/>(tabelas identity_*)"]
    TX --> DJ["domain_journal"]
    TX --> OB["outbox"]
    OB -->|"relay"| NATS["NATS"]
    NATS --> CONS1["graph<br/>projeção :User"]
    NATS --> CONS2["governance<br/>invalidar derivados"]
    NATS --> CONS3["apps/api<br/>consumer de revogação de sessão"]
    DJ --> AUD["audit"]
```

Se a outbox falhar, **nada** é gravado (rollback atômico) — provado em teste de
integração com PostgreSQL real.

## 14. Superfície pública

```mermaid
graph TB
    subgraph ROTAS["7 rotas /v1/identity"]
        R1["GET /principals/:id"]
        R2["GET /principals/:id/sessions"]
        R3["POST /principals"]
        R4["POST /principals/:id/suspend"]
        R5["POST /principals/:id/revoke"]
        R6["POST /sessions/revoke"]
        R7["GET /sessions/revoked"]
    end

    subgraph INTERNO["API de módulo (sem HTTP, D-IDN-032)"]
        I1["issueServiceCredential"]
        I2["rotateServiceCredential"]
        I3["revokeServiceCredential"]
        I4["verifyServiceCredential"]
        I5["reconcileSuspendedPrincipalSessions"]
    end

    R3 -.->|"exige PLATAFORMA"| P["PLATFORM_SCOPE_ID"]
    R7 -.->|"exige PLATAFORMA"| P
    R1 -.->|"self OU identity.read"| G1["grant"]
    R4 -.->|"identity.admin"| G1
    R5 -.->|"identity.admin"| G1
    R6 -.->|"self OU identity.admin"| G1
```

## 15. Gaps e fronteiras (com dono)

| Item | Dono | Estado |
| --- | --- | --- |
| Projector Neo4j real (`:User`) | `graph` | contrato pronto; projector não implementado (P03) |
| RLS PostgreSQL | P09 | fora do slice |
| Rota HTTP para credenciais | — | **deliberadamente ausente** (D-IDN-032) |
| Autoridade de plataforma | `governance` | implementada (ANX-462); exige grant no escopo `PLATFORM_SCOPE_ID` |
| 5 módulos sem migrations | `audit`, `billing`, `connections`, `knowledge`, `orchestration` | **ANX-470** — `apps/workers` não sobe em banco novo |

## 16. Decisões que explicam o desenho

`D-IDN-001`..`D-IDN-048` (R08 + R11). As que mais explicam o código:

- `D-IDN-023` Principal é **global**, sem FK de agência — tenancy só na autorização.
- `D-IDN-034` `identity.admin` **não** implica `identity.read`.
- `D-IDN-035/042` operação global exige **escopo de plataforma**, não "escopo nulo".
- `D-IDN-039/043` o escopo declarado limita o **alvo**, e posse de sessionRef é
  invariante nos três caminhos de resolução.
- `D-IDN-044` registro e ledger são operações de plataforma.
- `D-IDN-036` corrida de registro resolvida por `ON CONFLICT DO NOTHING` + releitura.
- `D-IDN-038` atributo opcional inválido é omitido, não derruba o nó.
