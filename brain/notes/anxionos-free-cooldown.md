---
title: Connections — catálogo free e gestão de cooldown
description: Declaração pública free, catálogo atualizado, bloqueios por escopo e recuperação.
type: planning-note
status: draft
cluster: anxionos
sources:
  - id: requirement
    resource: ./anxionos-brainstorm.md
  - id: review
    resource: ../research/9router-functional-coverage.md
---
# Connections — catálogo free e gestão de cooldown

Contrato de planejamento v0.1, escopo confirmado em [brainstorm](./anxionos-brainstorm.md). Parte de [Connections](./anxionos-connections.md), do [catálogo](./anxionos-model-catalog.md) e do [contrato operacional](./anxionos-connections-operational-contract.md). Fundamentado na [revisão de 36 famílias do 9Router](../research/9router-functional-coverage.md). Não representa implementação concluída.

## 1. Resultado esperado

Usuário encontra todos os modelos publicamente declarados gratuitos das fontes suportadas, principalmente variantes/tags free, mesmo quando não estão disponíveis para executar agora. Pode separar os disponíveis nas próprias contas e no SYSTEM_FREE, ver limites, motivos de bloqueio e previsão de retorno. Administrador acompanha a mesma informação por titular e globalmente.

Gratuidade, direito de consumo e disponibilidade são três dimensões independentes. Cooldown não remove o modelo do catálogo. Tag free não concede acesso à conta de outro usuário, não certifica disponibilidade e não garante custo zero de toda operação composta.

## 2. Catálogo público e evidência de gratuidade

FreeDeclaration registra provider/sourceId, upstreamModelId completo, offering/operation quando resolvidos, declaração original, tipo de sinal, URL/sourceRef, observedAt, validFrom/Until quando publicados, fetchedAt, lastVerifiedAt, parserVersion, snapshotHash e status. Não contém dados privados de contas.

Sinais aceitos por regras específicas do provider:

1. Tag estruturada free em catálogo oficial.
2. Campo oficial isFree=true.
3. Variante/sufixo oficial, como :free, preservado no ID; não remover para despachar.
4. Declaração explícita em página oficial, com extração e escopo identificados.
5. Preço zero declarado para unidades relevantes: evidência econômica complementar, sem inventar tag ausente.

Texto de marketing de terceiros, nome contendo free, prefixo de família ou categoria freeTier do provider são sugestões de descoberta, não prova. Sufixo -free de um provider não vira regra universal de todos os providers. Informação pública pode entrar automaticamente como DECLARED_FREE segundo parser confiável; não exigir inferência paga para catalogar cada entrada. Omissão de preços mantém PRICE_UNKNOWN, sem apagar a declaração.

PriceVersion preserva decimal exato, moeda, unidade, componentes e condições; aceitar zero nas representações válidas do schema (0, 0.0, 0.000...), sem tratar null, vazio, ausente, NaN, negativo ou número minúsculo positivo como zero. Não arredondar preço positivo para classificar como gratuito.

A validação econômica considera apenas os componentes aplicáveis, mas todos eles: input/output, reasoning, cache, request, imagem/áudio, busca, ferramentas, hospedagem/egress e taxas adicionais quando cobradas pela rota. Componente desconhecido gera custo desconhecido. Declaração free com componente aplicável positivo gera conflito ou gratuidade parcial documentada; não habilita FREE_ONLY irrestrito.

## 3. Classificações independentes

| Dimensão | Exemplos e semântica |
| --- | --- |
| Declaração pública | DECLARED_FREE, NOT_DECLARED, CONFLICTING, WITHDRAWN |
| Condição econômica | ZERO_USAGE_PRICE, FREE_QUOTA, TRIAL_CREDIT, INCLUDED_IN_PAID_PLAN, PAID, UNKNOWN; condições podem coexistir |
| Disponibilidade temporal da evidência | FRESH, STALE, SOURCE_FAILED; retirada confirmada não é falha de fetch |
| Origem autorizada | OWNER_PRIVATE, SYSTEM_FREE ou conta contribuída para PLATFORM |
| Financiamento | upstreamCostClass separado de consumerChargeMode; SYSTEM_FREE pode ter custo upstream financiado pela plataforma |
| Estado de execução | READY, COOLDOWN, QUOTA_EXHAUSTED, AUTH_REQUIRED, DISABLED, UNAVAILABLE, UNKNOWN; derivado para consumidor/operação |

Modelos locais/downloads gratuitos não implicam GPU/energia/armazenamento gratuitos. Franquia de assinatura paga não é modelo público free. Free tier limitado continua no catálogo, com condições e reset; créditos de teste são TRIAL_CREDIT. Não fundir variantes gratuitas/pagas do mesmo modelo. G1–G4 e janela permanecem independentes; não existe piso de 200 mil tokens para entrar na lista.

## 4. Discovery, sincronização e publicação

SourceRegistry permite apenas fontes/adapters administrativamente registrados. Cliente solicita sourceId, não URL arbitrária. Fetcher aplica destino permitido, redirects controlados, timeout, limite de bytes, schema e paginação. Catálogo incompleto não é publicado como snapshot completo.

Pipeline: fetch → preservar versão/ETag/hash → validar schema → identificar modelo/variante/operação → extrair declaração/preço/limites → comparar release → publicar entradas com evidência → reavaliar ofertas/grants/bindings impactados. Cadência por fonte, retry com backoff/jitter, lease distribuído e sync manual deduplicado; números ficam em política de lançamento, não hardcoded no schema.

Eventos de adição, alteração de preço/tag/limite e retirada mantêm histórico. HTTP 304 renova confirmação da mesma versão; erro de rede/schema mantém último catálogo como STALE/SOURCE_FAILED e não transforma a lista em vazia nem renova verificação econômica. Ausência em uma resposta paginada ou parcial não prova remoção. Ausência em snapshot completo validado abre reconciliação conforme política; retirada explícita ou preço pago confirmado bloqueia novas rotas FREE_ONLY afetadas.

Freshness máxima de evidência para consumo é política versionada. Entrada stale continua visível, mas não prova gratuidade vigente. Revalidação pode usar metadados sem inferência; probes com custo exigem budget e autorização normais.

PublicFreeCatalog é a vista derivada das declarações; não manter cópia manual desconectada. Lista por consumidor combina catálogo público + ofertas próprias + publicações SYSTEM_FREE autorizadas. Nunca revela segredos, quotas particulares ou contas de outro titular.

O [contrato de automação](./anxionos-catalog-automation.md) exige watchers por provider e análise/classificação/publicação assim que a mudança for detectada. Ofertas compatíveis passam automaticamente à elegibilidade sem aprovação por modelo; grants, operação, evidência de preço e cooldown continuam valendo. Fim de gratuidade/preço novo revalida antes de novas tentativas. Sync não limpa bloqueios. Métodos de detecção e metas são por fonte, sem prometer eventos de providers que só permitem polling.

## 5. Política de custo e bindings

Manter supplyPreference (OWN_FIRST/FREE_FIRST/SYSTEM_FREE_ONLY) separado de regra econômica (ALLOW_PAID_WITH_BUDGET, REQUIRE_NO_CONSUMER_CHARGE, REQUIRE_ZERO_UPSTREAM_USAGE). “Free” no filtro de catálogo significa declaração; na execução, o trace informa qual regra econômica foi aplicada.

Usuário/AGENCY usa suas contas ou SYSTEM_FREE. PLATFORM usa contas contribuídas sob grants e rotação já definidos. Modelo free particular não vira SYSTEM_FREE automaticamente. Administrador pode publicar oferta apropriada da plataforma com financiamento explícito.

Nenhum cooldown ou fim de gratuidade autoriza trocar o modelo do binding. Para mesmo modelo, outras ofertas exigem identidade/versão/operação compatíveis e regra de custo válida. Nunca retirar :free automaticamente para tentar variante paga. Um router remoto que escolhe qualquer modelo, ainda que gratuito, não satisfaz binding de modelo fixo; precisa ser classificado como serviço de roteamento e explicitamente autorizado em extensão futura.

Modelos caros são limitados a tarefas PLANNING ou SPECIAL conforme ExpensiveModelPolicyVersion e finalidade validada no servidor. A regra vale para AGENCY e PLATFORM; supplyPreference ou oferta free não revoga restrição explícita do modelo. Preço unitário, volume e orçamento são avaliados por operação. Detalhes e CA01–CA12 no [contrato de automação e custo](./anxionos-catalog-automation.md).

## 6. Cooldown tipado por escopo real

CooldownRecord possui id, tenant/ownership visibility, targetKind/targetId, providerId, accountId opcional, capacityResourceId, offeringId/modelVariantId/taskKind quando aplicável, quotaGroupId, causeCode, triggerAttemptId, source/evidence, generation, observedAt, notBefore, recheckAt, expiresAt quando aplicável, state, retryCount, policyVersion e resolutionReason.

Escopos possíveis: ACCOUNT_MODEL_OPERATION, ACCOUNT, CREDENTIAL, ENDPOINT, CAPACITY_RESOURCE, QUOTA_GROUP, PROVIDER_MODEL e PROVIDER. Usar escopo amplo somente com evidência de falha/limite amplo; falha de uma conta não torna todo modelo globalmente indisponível. Várias credenciais da mesma conta compartilham limites reais; várias contas também podem compartilhar quota upstream. Endpoint sem autenticação recebe capacityResourceId e cooldown próprios; noauth nunca é exceção à gestão de capacidade.

| Causa | Tratamento |
| --- | --- |
| Rate limit temporário | Honrar Retry-After/reset confirmado no escopo indicado; backoff com jitter se prazo desconhecido |
| Quota esgotada | Bloqueio até reset comprovado ou nova evidência; não reduzir prazo remoto conhecido |
| Credencial inválida/expirada | Renovação coordenada ou AUTH_REQUIRED; timer sozinho não corrige autenticação |
| Modelo removido/acesso negado | Revalidar offering/entitlement; não insistir por rotação cega |
| Erro de payload/contexto/parâmetro | Terminal para esse request até corrigir; não colocar todas as contas em cooldown |
| Falha transitória de endpoint/provider | Circuit breaker no escopo comprovado e probe coordenado |
| Desativação manual/revogação | Bloqueio de política separado; expiração de cooldown não o remove |
| Erro durante stream/job | Preservar estado parcial/efeitos e reconciliação antes de retry |

HTTP status isolado não basta: por exemplo, 402/403 podem representar crédito, permissão ou condição específica. Adapter produz erro estruturado; texto livre é fallback de classificação com incerteza explícita. Não rotacionar proxies/contas para ignorar quota compartilhada.

## 7. Prazo correto e recuperação

Todos os bloqueios ativos aplicáveis são combinados por OR lógico. Para uma rota com diversos bloqueios temporais, seu prazo mínimo conhecido é o máximo de notBefore desses bloqueios. Entre rotas compatíveis/autorizadas, a primeira oportunidade temporal é o mínimo desses máximos. Ignorar locks de modelos não relacionados, mas incluir escopos de conta/quota/provider que realmente se apliquem.

Exemplo: conta A/modelo M bloqueado por 10min e conta A global por 20min → A/M somente após ao menos 20min. Lock de outro modelo por 30s não altera isso. Conta B/M elegível após 5min → primeira oportunidade do pool é 5min. AUTH_REQUIRED ou revogação não têm prazo previsível; não exibir retorno garantido. Regras de alternância PLATFORM, capacidade e budgets ainda podem impedir dispatch nesse horário.

notBefore é proibição de tentar antes; recheckAt é momento de atualizar evidência. Um reset remoto em 6h pode ter metadados reconsultados antes, mas não ser reduzido para 30min. Headers com segundos/data/unidades específicas são normalizados por adapter, com relógio UTC autoritativo e tolerância de skew. Datas inválidas ou absurdas geram revisão, não liberação imediata.

Circuit breaker: CLOSED → OPEN → HALF_OPEN → CLOSED em sucesso autorizado, ou OPEN com novo prazo em falha. HALF_OPEN reserva lease de probe entre réplicas para evitar avalanche. Quota conhecida exige reset/revalidação antes de probe; cooldown soft pode admitir a próxima requisição normal como teste controlado. Reinício de serviço preserva estado.

Expiração torna a rota candidata à reavaliação, não READY automaticamente. Sucesso antigo só resolve o bloqueio correspondente à geração/causa que efetivamente validou; não limpa quota global ativa ou erro criado por outra tentativa mais recente. Timestamps e geração impedem sobrescrita por respostas fora de ordem.

## 8. Fila, API e dashboards

Sem rota elegível: tentar outra conta/oferta do mesmo modelo sob regras existentes; se nenhuma, retornar ou enfileirar como WAITING_FOR_CAPACITY conforme contrato/deadline. Resposta inclui motivos tipados, earliestRetryAt quando calculável e retryAfterSeconds, sem prometer execução. Retry do cliente usa idempotency key; cancelar/deadline remove fila e libera reservas não consumidas. Não manter loops de ping sem teto.

Contratos semânticos propostos:

- listFreeModels(filters): declaredFree, operation, group quando aplicável, contextRange, source, freshness, availableToMe.
- getModelAvailability(model, operation, consumer): rotas autorizadas, contagens, bloqueios, estimativa temporal.
- listCooldowns(scope): cooldownId, alvo, geração, causa, notBefore, recheckAt e ação possível.
- syncFreeCatalog(sourceId): job auditável, deduplicado.
- requestRecovery(cooldownId, expectedGeneration, reason): revalidar ou agendar probe, sem apagar quota upstream.
- releaseSoftCooldown(cooldownId, expectedGeneration, reason): capacidade administrativa restrita; não concede grant nem limpa desativação/quota remota. Operação bulk enumera alvos/escopo/versionamento.

Dashboard do usuário: abas “Declarados gratuitos”, “Disponíveis para mim” e “Em cooldown”; badge e origem da declaração, operação, versão, condições de cobrança, contexto/limites relevantes, status, quota/reset, última verificação e motivo. Conta mascarada somente se própria; SYSTEM_FREE não expõe conta interna. “0 disponíveis de 5 declarados” é informação válida.

Dashboard administrativo: todas as contas por titular, grupos reais de quota, incidentes por provider/modelo, contagem de requests desviados, tempo bloqueado, recuperação, evidência stale, fim de promoção e impacto em bindings. Gratuidade no catálogo não altera a separação entre agentes PLATFORM e AGENCY.

## 9. Persistência, eventos e grafo

PostgreSQL mantém autoridade de cooldown/leases/quota/gerações, catálogo publicado e políticas; outbox alimenta grafo/telemetria. Graph projeta ModelOffering DECLARED_FREE_BY FreeDeclaration, SUPPORTED_BY SourceSnapshot, BLOCKED_BY CooldownRecord e SHARES_QUOTA QuotaGroup. Resolver rota consulta estado autoritativo antes de reservar/dispatch; cache atrasado não reativa rota.

Eventos versionados e idempotentes: free.declaration.observed, free.classification.changed, catalog.sync.failed, catalog.release.published, offering.withdrawn, cooldown.started, cooldown.extended, cooldown.recheck.scheduled, cooldown.resolved, recovery.failed. Logs guardam metadados sanitizados, não tokens ou payloads sensíveis completos. Publicação e retirada não apagam histórico/ledger.

## 10. Entrega e aceitação

DFree: C1 schemas/identidade/custo → C2 discovery OpenRouter/Kilo e adapters por fonte com fixtures → C3 elegibilidade/gratuidade → C4 painel/diff/stale. DCool: C1 escopos/estados → C3 leases, reserva, fila e recuperação → C4 operação/admin. Cobertura de outros providers em C5; contratos comuns também se aplicam a TTS/embedding/STT/OCR/mídia. Não criar automação nesta sessão: workers são requisitos do produto.

| Caso | Resultado exigido |
| --- | --- |
| CF01 | :free, isFree e tag oficial catalogados com evidência; nome “free” sem fonte fica candidato |
| CF02 | Modelo gratuito de 32k e contexto desconhecido aparecem; filtro de tarefa decide compatibilidade |
| CF03 | 0, 0.0 e zero decimal válidos normalizam; vazio/null/positivo mínimo não vira zero |
| CF04 | Custo adicional ou preço conflitante impede gratuidade irrestrita; declaração permanece explicável |
| CF05 | Erro/timeout/página incompleta não apaga catálogo nem renova verificação de custo |
| CF06 | Retirada/preço pago confirmado desabilita FREE_ONLY sem mudar :free para pago |
| CF07 | Usuário A não vê nem consome conta free de B; SYSTEM_FREE conserva escopo |
| CF08 | Mesmo modelo em A cooldown e B saudável usa B elegível; variante/binding preservados |
| CF09 | Modelo expirado + lock global ativo continua bloqueado; prazo usa max por rota/min entre rotas |
| CF10 | Nova key/noauth/reinício não ignora quota compartilhada ou cooldown persistido |
| CF11 | Duas réplicas criam apenas probe permitido; resposta antiga não limpa nova geração |
| CF12 | Reset remoto longo permanece; recheck antecipado não autoriza dispatch |
| CF13 | AUTH_REQUIRED/revogação/payload inválido não resolve por timer nem rotação cega |
| CF14 | Comando de recuperação exige alvo/escopo/geração; não limpa todos os titulares implicitamente |
| CF15 | Fila respeita deadline/cancelamento/idempotência e não repete efeitos de stream/job |
| CF16 | Dashboard distingue declarado/acessível/disponível, oculta contas externas e mostra freshness |

Contratos e critérios definidos; implementação, testes integrados, probes reais e valores de lançamento pendentes. As sete reproduções upstream demonstram gaps, não que CF01–CF16 já passaram.
