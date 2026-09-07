---
title: Connections — contrato operacional v1
description: Pools próprios e gratuitos, rotação, reservas, recuperação e critérios V01–V10.
type: planning-note
status: draft
cluster: anxionos
sources:
  - id: requirements
    resource: ./anxionos-brainstorm.md
  - id: review
    resource: ../research/9router-gaps-validacao.md
  - id: design
    resource: ./anxionos-connections.md
---
# Connections — contrato operacional v1

Complemento normativo do rascunho [Connections](./anxionos-connections.md), elaborado para resolver os gaps da [revisão do modelo e do 9Router](../research/9router-gaps-validacao.md). Regras literais do usuário estão no [brainstorm](./anxionos-brainstorm.md); defaults abaixo são escolhas técnicas desta revisão, alteráveis por políticas versionadas. Não são software implantado nem homologação de providers.

## 1. Acesso, origem e catálogo gratuito

A unidade publicável é ModelOffering. A unidade de propriedade é AIProviderAccount; segredo é CredentialRef; consumo e leitura têm permissões distintas.

| SupplyScope | Agentes AGENCY | Agentes PLATFORM | Visibilidade do usuário |
| --- | --- | --- | --- |
| OWNER_PRIVATE | Apenas Owner correspondente e seus agentes | Permitido por grant PLATFORM_INTERNAL, conforme regra confirmada | Sua própria conta e informações operacionais |
| SYSTEM_FREE | Permitido por publicação administrativa e entitlement da empresa | Permitido por grant próprio | Modelo, capacidades, disponibilidade e sua quota/uso; conta interna oculta |
| Outro Owner | Proibido como acesso de cliente, mesmo gratuito | Elegível por grant, dados e limites | Não listar, inferir identidade nem detalhar conta alheia |

**Interpretação adotada para “gratuitos do sistema”:** ofertas administradas pela plataforma, em infraestrutura própria, contas da plataforma ou endpoints públicos homologados. Não republicar contas de usuários como SYSTEM_FREE para contornar a regra “o usuário usa sempre a sua”. Outra origem requer mudança explícita dessa regra.

SYSTEM_FREE é custo de inferência zero para o usuário, separado da assinatura comercial do anxionOS. Pode ter upstream gratuito ou custo financiado pela plataforma; essa distinção aparece como upstreamCostClass e sponsorshipPolicy. Uma oferta subsidiada não se apresenta como gratuita no provider. Sem financiamento/limite explícito, não habilitar uma oferta upstream paga. Custo desconhecido nunca equivale a zero.

Publicação exige OfferingPublicationVersion: supplyScope, offeringIds, beneficiaryEligibility, entitlementVersion, consumerChargeMode, fundingSourceId, capabilityReportId, trustProfileId, quotaPolicyId, validFrom/Until, status, autor e razão. Grant SYSTEM_FREE não concede account.read_all.

Endpoints sem autenticação usam authMethod NONE, credentialRef null e capacityResourceId estável por endpoint/provider/limite compartilhado. Não criar uma conta fictícia universal “noauth”, nem simular contas distintas por key/proxy. Para ofertas sem conta, fundingAccountId pode ser nulo, mas fundingSourceId e capacityResourceId são obrigatórios. Limites por IP/egress, quando relevantes, pertencem ao UpstreamLimitGroup e não devem ser contornados por rotação de rede.

## 2. Binding, tarefa e resolução

Um binding principal de raciocínio por agente e no máximo um padrão vigente por slot/finalidade, versionados: agentId/agentScope, modelId/versionSelector, inferenceProfileVersionId, allowedSupplyScopes, supplyPreference, routingPolicyVersionId e fallbackMode SAME_MODEL_ONLY. O AgentModelBinding conecta um pool lógico de ofertas, que pode incluir pools próprios por provider e SYSTEM_FREE. Isso substitui a suposição de que um pool sempre contém apenas contas do usuário.

Default desta revisão: OWN_FIRST quando o binding permite ambas as origens. SYSTEM_FREE_ONLY e FREE_FIRST são políticas explícitas disponíveis. A opção OWN_FIRST não torna uma rota paga autorizada sem grant e orçamento. Primeiro escolher classe de origem conforme política; depois balancear contas dentro dela. Não misturar classes para cumprir uma aparência de distribuição uniforme.

TaskRequirementsSnapshot inclui tipo, complexidade, estimativa de contexto/saída, ferramentas/modalidades, deadline, prioridade autorizada, classificação mínima de dados, perfil/regra e versões. Classificação pode elevar restrição de dados, jamais diminuir a classificação das evidências. Começar com regras/metadados auditáveis; UNKNOWN usa o perfil padrão se compatível ou falha explicável. Não depende de uma chamada LLM para descobrir como realizar a primeira chamada.

A tarefa seleciona requisitos e perfil autorizado, não outro modelo. Binding e intenção de inferência ficam fixados no run; payload nativo varia somente por tradução homologada. Nova chamada de ferramenta no mesmo run preserva essas versões.

Rota elegível = identidade verificada ∩ binding ∩ grant/finalidade ∩ oferta/publicação/entitlement vigente ∩ dados/destino ∩ capacidade/perfil ∩ saúde ∩ limites. Todos os termos são necessários. Alias desconhecido retorna MODEL_NOT_REGISTERED; família/nome semelhante não prova equivalência.

O [contrato de catálogo](./anxionos-model-catalog.md) acrescenta G1–G4, faixas de janela e capacidades verificadas por oferta. Classificação enriquece o catálogo e recomenda configuração; não substitui o modelo do binding. Admissão usa ContextProfileVersion e payload completo por turno, sem misturar máximos de ofertas distintas.

O [contrato multimodal](./anxionos-multimodal-inference.md) generaliza bindings para InferenceBindingVersion, com taskKind e ModelOperationSchema. Grants, identidade, reservas e rotação são comuns às modalidades; delegar TTS ou retrieval a serviço técnico não converte consumo AGENCY em PLATFORM. Rotação ocorre por dispatch de requisição, não por chunk de áudio, progresso de job ou consulta de status. Nova tentativa segue política de retry/continuidade; não mistura espaços vetoriais, vozes ou sessões incompatíveis. G1–G4 aplicam-se somente à linguagem; limites de operação e compatibilidade substituem a suposição de payload apenas textual.

## 3. Multicontas, identidade e credenciais

Conta, grant OAuth, workspace/projeto de quota e conexão não são sinônimos. Uma conta pode ter diversas conexões, e várias contas/conexões podem compartilhar um grupo de limite. Cadastro nunca usa nome de exibição como chave de atualização.

- Criar: idempotencyKey de cadastro + owner + provider + auth session. Mesmo nome é permitido. Identidade upstream verificada gera possível vínculo; associação de credencial é explícita e não sobrescreve outra grant OAuth.
- Atualizar segredo: connectionId/credentialId explícito, controle de versão, identidade conferida; refresh preserva grant family e não altera conexão vizinha.
- Deduplicar capacidade: identidade upstream verificável de conta/projeto/grupo; duas keys não duplicam quota. Se a mesma conta aparecer em Owners distintos, preservar registros privados e vincular internamente o limite comprovado, sem revelar existência/identidade do outro Owner.
- Identidade inconclusiva: estado UNVERIFIED e limites locais conservadores; sem merge automático. Uso próprio exige envelope local explícito; não habilitar a conta no pool contribuído PLATFORM enquanto não for possível verificar identidade/distinção para rotação. Não anunciar garantia de quota remota independente.
- Lock de refresh é por credential family real, com lease/fencing e compare-and-swap entre réplicas. DB transaction que mescla JSON não evita dois refreshes remotos.
- Resposta antiga não sobrescreve token novo. Falha entre refresh remoto e persistência fica RECOVERY_REQUIRED quando não for recuperável com segurança; não repetir indefinidamente refresh token de uso único.
- Código de adaptador recebe somente os segredos necessários à tentativa e não pode editar grants, policies ou contas globais.

## 4. Seleção balanceada e concorrência

Definir DispatchAttempt como unidade de contagem: retry enviado é nova tentativa; replay idempotente não é. A identidade de rotação é upstreamAccountKey verificada, não o ID da linha privada de cadastro; duplicatas em Owners distintos não ganham turnos extras. Contas nunca usadas têm sequência inicial zero e desempate estável. Modelo, dados e orçamento prevalecem sobre rotação.

Para PLATFORM em contas contribuídas, coordenador lógico único mantém lastAccountId e dispatchSequence globais, além de lastDispatchSequence por conta. Em transação autoritativa: filtrar elegibilidade; excluir última conta; escolher a elegível menos recentemente despachada, com desempate estável por ID; reservar limites; gravar tentativa/lease e nova sequência. Não escolher provider aleatoriamente antes de filtrar o modelo e perfil. Fila acorda quando surge capacidade, política muda ou deadline vence.

Com conjunto estável de contas igualmente elegíveis e chamadas desse mesmo conjunto, produz A/B/C/A; contagens diferem no máximo uma. Com conjuntos diferentes ou quotas mudando, não prometer igualdade por modelo, conta, custo ou tokens. Registrar exclusões e distribuições global/por modelo. Esta coordenação tem custo de contenção; benchmark antes de particionar, pois dividir cursores por agente ou inventar pools muda a garantia de alternância.

Default SINGLE_ACCOUNT_WAIT: a primeira seleção de uma conta pode ocorrer; se a única elegível é a última selecionada, aguardar outra conta até deadline e retornar ROTATION_ALTERNATIVE_UNAVAILABLE. Não atribuir ao usuário aprovação de reutilização irrestrita. Se a única elegível difere da última, ela pode ser usada. Alteração futura exige política explícita.

Para AGENCY em OWNER_PRIVATE, cursor por Owner, com mesma seleção de contas elegíveis e quota compartilhada; única conta própria pode ser reutilizada. Para SYSTEM_FREE, o scheduler da oferta usa capacityResourceId e quota por empresa, sem prometer rotação entre contas que não existem. A regra PLATFORM de contas contribuídas permanece distinta dessa distribuição.

Seleção, reserva e lease são atômicas. Nenhum cursor se move em preview ou duplicata. Depois de persistido o dispatch e possível envio remoto, manter a contagem mesmo com resultado incerto. Falha comprovadamente anterior ao envio libera reserva e registra tentativa não enviada; nunca rebobinar cursor em concorrência.

Não garantir que todas as chamadas simultaneamente ativas usem contas únicas; isso depende do limite de concorrência por conta. Afinidade obrigatória não é preferência: PLATFORM rejeita rota ACCOUNT_BOUND que impede a rotação. Sessão portável exige histórico suficiente e capacidades comprovadas; IDs de conversa, arquivos e blocos opacos não são portáveis por terem strings iguais.

O [contrato free/cooldown](./anxionos-free-cooldown.md) detalha bloqueios por escopo/geração, inclusive capacityResourceId sem autenticação e quota groups compartilhados entre contas. Todos os bloqueios aplicáveis valem; prazo por rota é seu máximo e oportunidade do pool é o mínimo entre rotas viáveis. notBefore remoto não é reduzido pelo intervalo de recheck. Recuperação/probe exige lease, orçamento e configuração ainda autorizada; resposta antiga não revoga bloqueio novo. Candidatos free exigem declaração/preço vigente e regra econômica explícita; rotação não ignora limites compartilhados. CF01–CF16 complementam V01–V10.

## 5. Quotas, prioridade e orçamento

PostgreSQL é autoridade inicial para grants correntes, cursor, leases, reservas e ledger; transação + outbox publica eventos. Graph projeta relações e contexto. Redis é cache/coordenação auxiliar, não segunda fonte para saldo. NATS transporta eventos; replay não envia inferência. Stack é contrato de responsabilidade, sem promessa de latência não medida.

Toda tentativa reserva, com locks em ordem estável, o conjunto de limites aplicáveis: plataforma, empresa, agente/run, conta, projeto/provider, modelo, tokens/RPM, concorrência e orçamento. Recalcular saldo depois de obter locks. Reserva usa limite máximo permitido de saída/reasoning e preço versionado; não apenas consumo médio. Créditos/requests de assinatura são unidades próprias.

CapacityAllocationPolicy exige: limites totais, teto PLATFORM por janela/conta, reserva do titular, concorrência e deadline. São números configuráveis, não percentuais implícitos. Sem política completa, onboarding mantém consumo compartilhado CONFIGURATION_REQUIRED. Autorização geral PLATFORM permanece válida; configuração ausente não vira capacidade infinita.

Baseline de disputa: reserva do titular não é emprestada automaticamente; PLATFORM usa parcela configurada. Dentro da parcela, fila por consumidor com round-robin, prioridade limitada e aging, preservando deadline. Sem parcela reservada não prometer progresso sob saturação. Não interromper inferência já enviada para favorecer outra classe.

Observação remota: valor/unidade, janela, observedAt/resetAt, origem e confiança. Disponível é limite interno menos uso/reservas, restringido pela evidência remota conservadora; não subtrair duas vezes o mesmo uso já reconciliado. Quota desconhecida permite somente política local explícita com concorrência limitada e budget, não “ilimitado”. Uso direto fora do gateway impede garantia de saldo upstream.

Resposta 429 atualiza o grupo correto e respeita Retry-After/reset conhecido; não usar backoff curto para ignorar reset futuro. Bloqueios simultâneos se combinam por OR: qualquer bloqueio vigente impede despacho. Sucesso anterior não revoga automaticamente um bloqueio mais novo; expiração, evidência de reset ou ação autorizada versionada encerram o bloqueio.

O [contrato de catálogo automático](./anxionos-catalog-automation.md) acrescenta admissão após descoberta e ExpensiveModelPolicyVersion. Publicar modelo não altera binding/grant; novo preço/restrição é revalidado antes de dispatch. Modelos caros exigem TaskPurpose PLANNING/SPECIAL validado no servidor, regra/autorização e reserva; ROUTINE não passa. Fan-out/retries compartilham teto e não obtêm exceção apenas pelo agente marcar a tarefa como especial. CA01–CA12 complementam V01–V10.

## 6. Estados, retry, streaming e efeitos

Request: RECEIVED → VALIDATED → QUEUED (opcional) → ADMITTED → RUNNING → SUCCEEDED / FAILED / PARTIAL / CANCELLED / UNKNOWN_OUTCOME.
Attempt: PREPARED → DISPATCH_COMMITTED → STREAMING → SUCCEEDED / FAILED / PARTIAL / CANCELLED / UNKNOWN_OUTCOME; PREPARED pode terminar NOT_SENT.
Liquidação: RESERVED → PROVISIONAL / RECONCILIATION_REQUIRED → SETTLED; ajustes posteriores são novos registros.

Chave idempotente única por consumidor, operação e requestId; payloadHash inclui binding, configuração e input digest. Mesma chave/outro payload = IDEMPOTENCY_CONFLICT. Worker usa fencing token; lease expirado PREPARED pode ser recuperado. Após possível envio, só consultar/reconciliar quando adapter suporta; não reenviar automaticamente sem garantia upstream aplicável.

Erros estáveis: AUTHENTICATION_REQUIRED, AUTHORIZATION_DENIED, MODEL_NOT_REGISTERED, MODEL_UNAVAILABLE, CONFIGURATION_UNSUPPORTED, DATA_POLICY_DENIED, QUOTA_EXHAUSTED, BUDGET_EXCEEDED, ROTATION_ALTERNATIVE_UNAVAILABLE, CONTINUITY_UNSUPPORTED, QUEUE_FULL, DEADLINE_EXCEEDED, IDEMPOTENCY_CONFLICT e UNKNOWN_OUTCOME. Respostas incluem retryable/retryAt e ação sugerida, sem IDs privados de contas alheias.

| Falha | Tratamento |
| --- | --- |
| Input/schema/contexto inválido, grant/dados/conteúdo negado | Terminal ou escalonamento, sem trocar conta para contornar a restrição |
| Auth expirada | Refresh coordenado no máximo uma vez por versão; se inválido, reautorizar |
| 429 com outra conta realmente elegível | Outra conta do mesmo modelo, respeitando grupo compartilhado, deadline e teto global de tentativas |
| Conexão falhou comprovadamente antes de enviar payload | Retry limitado com jitter e reserva reavaliada |
| 5xx/timeout após possível envio | Não assumir ausência de cobrança; estado incerto quando contrato do provider não garante resultado |
| Stream já emitido | PARTIAL; não concatenar geração substituta como continuação |
| Cancelamento | Parar entrega e solicitar abort quando suportado; cobrança/remoto pode continuar |
| Tool call | Proposta normalizada com ID estável; execução e deduplicação pertencem ao Tool Gateway |

Cliente lento recebe backpressure/buffer limitado e timeout próprio. Webhook/evento duplicado não liquida duas vezes. Revogação invalida elegibilidade e é revalidada no commit de dispatch; se já enviado, cancelamento é melhor esforço. Não prometer atomicidade entre banco local e provider.

## 7. Inferência, dados e custo

Compiler valida intent → effective → native, e uma validação final confirma invariantes imediatamente antes do envio. Nunca elevar limite rígido para acomodar thinking; declarar incompatibilidade ou exigir perfil/limite explicitamente atualizado. STRICT não aceita clamping/omissão; ADAPT_EXPLICITLY registra campos/regra sem violar limites duros.

Reasoning e formato de saída têm proprietários de campo distintos. Não apagar todo output_config para remover effort; compilar campos independentes e rejeitar os que não podem ser preservados. Validação examina payload final e tool continuation, não apenas formulário.

DataTrustProfile define operador/destino/egress, classe de dados, retenção/visibilidade upstream conhecida, histórico, cache e isolamento. Endpoint customizado não recebe dados privados PLATFORM automaticamente. Homologar cada classe admitida; desconhecido não significa privado. URLs, DNS, redirects e egress passam por política de rede; arquivos/contexto não podem ampliar destinos.

Ledger: consumerScope, agent/run/request/attempt, supplyScope, grant/publication, fundingSource/account, model/profile/adapter/price versions, observações e ajustes. Uso bruto e normalizado ficam distinguíveis. Reasoning/cache podem ser subconjuntos de tokens, segundo schema; não somar indiscriminadamente.

Separar custo upstream, custo fixo de assinatura, débito ao usuário, subsídio e quota de plano. SYSTEM_FREE registra zero débito de inferência ao usuário, sem apagar custo upstream. Mudança de preço pausa publicação quando financiamento não comporta; não migra para API do Owner sem regra/grant/budget. Owners veem uso agregado PLATFORM de suas contas, sem prompts ou tarefas internas.

## 8. API, dashboard, lançamento e encerramento

API semântica autenticada: listEligibleModels, getReadiness, configureBinding/Profile, previewRoute, submitInference, getRequest, cancelInference, explainRoute e getUsage. Administração acrescenta publishSystemOffering, setCapacityPolicy, releaseAdapter e suspendSupply. Preview lê projeção autorizada e não consome tokens. Cada comando mutável é idempotente e auditado.

Onboarding pode provisionar empresa/C-levels antes de haver rota. Prontidão é por agente: READY, MODEL_UNAVAILABLE, AUTH_REQUIRED ou CONFIGURATION_REQUIRED. Catálogo SYSTEM_FREE disponível pode atender bindings compatíveis; não escolher outro modelo para concluir onboarding artificialmente. Billing comercial e ativação de inferência permanecem separados.

Dashboard do Owner mantém “Minhas contas”; “Modelos gratuitos do sistema” é catálogo de ofertas, não lista de contas da plataforma. Admin tem gestão global de contas, agentes PLATFORM e publicações. Mesmas regras em export, API, métricas, streams, caches e grafo.

Importação 9Router: staging, mapa de IDs, credenciais para cofre, nome sem deduplicação, owners explícitos, revisão de entitlements/grupos e nenhum grant ativo herdado implicitamente. Preservar licença e patches. Suporte de provider é por capability/release: INVENTORIED → PORTED → CONTRACT_TESTED → CANARY → ENABLED. Não copiar silenciosamente capacity adapters, combos, prompt injection ou transforms globais.

Desconectar/suspender remove novas admissões/grants, revalida runs, trata tentativas incertas e revogação upstream. Excluir segredo não apaga ledger necessário; retenção por classe deve estar configurada antes do lançamento. Restauro recompõe estado e invalida leases anteriores, sem novos efeitos externos.

## 9. Matriz de aceite e ordem de resolução

| Caso | Evidência exigida antes de habilitar |
| --- | --- |
| V01 Isolamento A/B/PLATFORM | A não vê/consome conta B; PLATFORM legítimo consome por grant; falsificação é negada em APIs/streams/cache/export |
| V02 SYSTEM_FREE | A usa publicação com modelo compatível sem ver conta interna; expiração/quota não debita API própria silenciosamente |
| V03 Multicontas | Mesmo nome preserva duas identidades; duas keys no mesmo limite não dobram capacidade; refresh concorrente não sobrescreve grant |
| V04 Rotação | A/B/C/A estável entre réplicas; cursor só no dispatch; conta única/afinidade/deadline geram estados definidos |
| V05 Saturação | Respeitar reserva titular, teto PLATFORM, grupos sobrepostos e aging; nenhum saldo interno negativo |
| V06 Bloqueios | Qualquer lock ativo bloqueia; sucesso antigo não limpa lock novo; reset remoto respeitado |
| V07 Modelo e parâmetros | Alias desconhecido rejeitado; limite 512 nunca sobe escondido; formato estruturado e effort preservados no payload final |
| V08 Falha e replay | Crash antes/depois de envio, duplicata, cancelamento e stream parcial não reenviam ação incerta |
| V09 Contabilidade | Uso parcial/desconhecido e ajustes não duplicam custo; zero usuário difere de upstream; reasoning não é contado duas vezes |
| V10 Ciclo operacional | Revogação, refresh perdido, preço/modelo alterado, restauração e exclusão produzem resultado diagnosticável |

Sequência: C1/D1 contratos acima → C2/D2 fatia API + assinatura + SYSTEM_FREE com fakes e acesso homologado → C3/C4/D3 concorrência/recuperação/ledger → D4 operação e release → C5/C6/D5 expansão. Um teste upstream de formato não substitui V01–V10.

**Resolvido no desenho:** fontes de acesso, modelos predefinidos, identidade de contas, semântica de rotação, comportamento com conta única, limites/estado incerto, precedência de configuração, ledger e fronteiras de confiança. **Pendente de execução:** implementação integrada, fixtures de V01–V10, carga e homologação remota. **Configuração de lançamento ainda necessária:** providers/modelos iniciais, budgets/quotas, capacidade reservada, retenção, SLO/RPO/RTO e custeio do catálogo. Ausência destes valores tem estado e comportamento definidos; não é preenchida com números inventados.
