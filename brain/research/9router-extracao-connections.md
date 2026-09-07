---
title: 9Router — extração para Connections
description: Extração fixada do 9Router e plano de adaptação para agentes com modelo definido.
type: research-note
status: draft
cluster: anxionos
author: Codex
date: 2026-09-07
sources:
  - id: S01
    resource: ../external-sources/9router-eb712ca-source.md
  - id: requisito
    resource: ../notes/anxionos-brainstorm.md
---
# 9Router — extração para Connections

## Pergunta e recorte

Como reaproveitar integralmente o repertório do 9Router no gerenciamento de LLM por assinaturas e APIs, mantendo um modelo predefinido por agente? A [orientação do usuário](../notes/anxionos-brainstorm.md) é requisito de produto; o comportamento do upstream é referência técnica, não decisão automática do anxionOS.

Rubrica aplicada: autenticação; catálogo; seleção de contas; roteamento e fallback; protocolos; consumo; painel; persistência; testes; operação. A extração inicial alimentou v0.2; a revisão vigente alimenta [Connections](../notes/anxionos-connections.md) e o [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md).

## Fonte, preservação e cobertura

[S01 — Snapshot, inventário integral e trechos](../external-sources/9router-eb712ca-source.md), commit `eb712ca821f0ba6bc41043fbd14494c5af5daba5`, capturado em 2026-09-07. Todos os caminhos citados abaixo são relativos a esse snapshot. [README anterior](../external-sources/9router-readme.md) apenas complementar.

- 1.540 arquivos preservados em arquivo tar.gz; 1.921 entradas na árvore contando diretórios.
- 154 arquivos de rotas administrativas/API em `src/app/api/**/route.js`.
- 122 arquivos de registry excluindo index; index importa 119 módulos. Esses números não representam providers LLM operacionais certificados: incluem serviços de mídia e entradas não importadas.
- 236 arquivos `tests/**/*.test.js|mjs|ts` inventariados. Testes não executados.
- 39 arquivos selecionados lidos estaticamente; seleção completa listada em S01. Profundidade maior no caminho chat → modelo → credencial → executor, autenticação, persistência e consumo. Interfaces e recursos periféricos inventariados por caminhos, sem revisão integral de suas implementações.

“Extrair tudo” está atendido como preservação integral, inventário e mapeamento funcional. A análise não é certificação de todos os providers, auditoria de cada linha, nem implementação concluída.

## Constatações que mudam o desenho

| Achado observado | Evidência em S01 | Consequência proposta |
| --- | --- | --- |
| Há duas seleções diferentes: contas de um provider e modelos de um combo | `src/sse/services/auth.js`; `open-sse/services/combo.js` | Separar ConnectionPool de política de substituição de modelo |
| Modelo simples também pode receber modelos extras por capacidade | `src/sse/handlers/chat.js`; `open-sse/services/capacityAdapter.js` | Desativar essa substituição na política estrita dos agentes |
| Aliases podem inferir provider pelo prefixo e usar openai como padrão | `open-sse/services/model.js` | Identidade explícita; alias desconhecido falha antes de chamar um provider |
| Seleção usa fill-first ou round-robin com permanência por contagem; preferred connection é preferência, não garantia | `src/sse/services/auth.js:135–191` | Afinidade de sessão deve distinguir preferência de dependência obrigatória |
| Mutex de seleção e locks de refresh vivem no processo | `src/sse/services/auth.js:10`; `open-sse/services/oauthCredentialManager.js:122–157` | Reservas e refresh precisam de coordenação entre réplicas |
| Schema usa SQLite; conexões serializam tokens e campos extras em JSON | `src/lib/db/schema.js`; `src/lib/db/repos/connectionsRepo.js:5–54` | Separar segredo, metadados e escopo; não copiar persistência para o serviço multiempresa |
| Filtros da consulta de conexões são provider e isActive | `src/lib/db/repos/connectionsRepo.js:70–84` | Adicionar tenant, proprietário, grant e isolamento em todas as consultas |
| Classificador retorna fallback inclusive para erro não reconhecido | `open-sse/services/accountFallback.js:20–58` | Classificação terminal explícita para contrato/política; retries limitados |
| Tradução, passthrough, streaming e normalização têm handlers próprios | `open-sse/translator/index.js`; `open-sse/handlers/chatCore/*` | Adaptadores precisam de matriz de fidelidade, não só endpoint compatível |
| Uso é normalizado e pode ser estimado; catálogo combina regras e sincronização externa | `open-sse/utils/usageTracking.js`; `src/lib/modelCatalog/sync.js`; `open-sse/providers/capabilities.js` | Guardar proveniência, incerteza e versão; não tratar inferência por nome como capability certificada |

Os três achados de persistência/concorrência são limites dos arquivos examinados, não uma alegação de auditoria de segurança completa do projeto.

## Matriz de extração de funcionalidades

Legenda: **adaptar** = preservar conceito/código útil atrás dos contratos anxionOS; **portar** = candidato a reutilização com testes de contrato; **opcional** = preservar e planejar, habilitação independente. Nenhuma linha significa código já portado.

| Subsistema do 9Router | Origem em S01 | Destino e tratamento |
| --- | --- | --- |
| Registry e metadados de providers | `open-sse/providers/registry/*` | ProviderRegistry; adaptar cadastro e versionamento |
| Modelos, aliases e custom models | `services/model.js` em open-sse; `src/app/api/models/*` | ModelRegistry; adaptar aliases estritos e bindings |
| Capabilities, preço e catálogo sincronizado | `open-sse/providers/*`; `src/lib/modelCatalog/sync.js` | ModelOffering, CapabilityProfile, PriceVersion; adaptar evidência/validade |
| Contas por API key | `src/app/api/providers/route.js` | Connection + CredentialRef; adaptar segredo e escopo |
| OAuth authorization code + PKCE | `src/lib/oauth/providers/codex.js`, `claude.js` | SubscriptionConnection; adaptar sessão e titular |
| OAuth device code | `src/lib/oauth/providers/github.js` | DeviceAuthorizationSession; adaptar polling e expiração |
| Refresh sob demanda e antecipado | `open-sse/services/tokenRefresh*`; `src/sse/services/backgroundTokenRefresh.js` | CredentialLifecycle; portar adapters, coordenar entre réplicas |
| Importação de tokens, sessão e contas locais | `src/app/api/oauth/*` | Ferramenta de migração opcional; não ativar coleta automática no onboarding |
| Pools, prioridades e round-robin sticky | `src/sse/services/auth.js` | ConnectionPool; adaptar para modelo/perfil e grants do titular ou PLATFORM, com rotação por requisição para PLATFORM |
| Locks por modelo/conta e cooldown | `open-sse/services/accountFallback.js` | RouteHealth, QuotaWindow; adaptar reset e armazenamento |
| Quotas específicas de provider | `open-sse/services/usage/*`; `src/sse/services/antigravityQuota.js` | QuotaObserver; adaptar origem, janela, idade da amostra |
| Fallback entre modelos/combos | `open-sse/services/combo.js` | ModelFallbackPolicy opcional e explícita |
| Auto-switch por modalidade | `combo.js`, `capacityAdapter.js` | Inventariado; fora da política estrita |
| Fusion: painel de modelos + juiz | `open-sse/services/combo.js` | Workflow de avaliação opcional, separado do binding normal |
| Tradução de requests e respostas | `open-sse/translator/request/*`, `response/*` | ProtocolAdapter; portar com fixtures |
| Tools, thinking, multimodal e continuidade | `open-sse/translator/concerns/*` | Matriz por oferta e adaptador; adaptar sem perdas silenciosas |
| Execução por provider e passthrough | `open-sse/executors/*`; `handlers/chatCore.js` | ProviderAdapter; separar imports acoplados ao Next/localDb |
| SSE, JSON, interrupção e stall | `handlers/chatCore/*`; `utils/stream*` | InferenceGateway; adaptar estado parcial e cancelamento |
| Uso, preço, detalhes da requisição | `utils/usageTracking.js`; `src/lib/db/repos/usageRepo.js` | UsageLedger, Pricing, RoutingTrace; adaptar reconciliação |
| Chaves do consumidor do gateway | `src/lib/db/repos/apiKeysRepo.js`; `src/app/api/keys/*` | WorkloadIdentity/AccessToken; separar de segredo do provider |
| Proxies por conexão/pool | `src/lib/network/*`; `src/app/api/proxy-pools/*` | EgressPolicy opcional, destino autorizado por escopo |
| Compressão RTK, Headroom, Pxpipe | `open-sse/rtk/*`; imports em chatCore | ContextTransform opcional, versionada e avaliada |
| Injeções Caveman/Ponytail | `open-sse/rtk/caveman.js`, `ponytail.js` | Preservar como referência; não alterar silenciosamente prompt institucional |
| Embeddings e modelos locais | `handlers/embeddingsCore.js`; `executors/ollama-local.js` | Extensão de inferência e RAG; adaptar rede e privacidade |
| Imagem, vídeo, TTS, STT | `open-sse/handlers/*Core.js` | Backlog de modalidades com rotas próprias |
| Busca e fetch | `open-sse/handlers/search/*`, `fetch/*` | Capability/Tool Gateway com Connections para acesso externo |
| Painéis provider, quota, uso, combo e tradutor | `src/app/(dashboard)/dashboard/*` | UX de Connections reimplementada sob identidade anxionOS |
| OIDC/SAML e login local | `src/lib/auth/*`; `src/app/api/auth/*` | Usar identidade central; aproveitar casos de integração, não duplicar login |
| CLI, skills, tray, atualização, Docker e túneis | `cli/*`, `skills/*`, `src/lib/tunnel/*`, arquivos raiz | Inventário operacional; launcher separado se necessário |
| MITM e configuração de clientes externos | `src/app/api/cli-tools/*`; `src/app/(dashboard)/dashboard/mitm/*` | Opcional para ambiente controlado; não dependência dos agentes internos |
| SQLite, backup e migrações | `src/lib/db/*` | Substituir camada de dados pelo contrato transacional do anxionOS |
| Suítes unitárias, golden e reais | `tests/unit/*`, `tests/translator/*` | Preservar fixtures; adaptar runner e acrescentar testes institucionais |

## Assinaturas e APIs: o que o código demonstra

O adaptador Codex declara PKCE e captura informação de plano/conta; Claude também declara PKCE; GitHub usa device code e obtém token de Copilot após autorização. Isso comprova implementações de acesso nesse commit, não disponibilidade contratual de qualquer assinatura em qualquer produto.

Connections deve modelar o acesso como `accessKind` (SUBSCRIPTION/API/LOCAL/COMPATIBLE), separado de `authMethod` (API_KEY/OAUTH_PKCE/DEVICE_CODE/etc.). Um plano mensal não implica tokens ilimitados, gratuidade marginal conhecida ou disponibilidade de todos os modelos. A licença MIT do código não concede acesso aos serviços upstream.

Antes de habilitar cada adaptador em produção, registrar método admitido, entitlement, limites e evidência de compatibilidade daquele fornecedor. Esta extração não consultou condições comerciais atuais de cada assinatura e não promete suporte universal.

## Estratégia recomendada de reaproveitamento

Adotar núcleo modular próprio com adaptadores derivados do snapshot. Preservar attribution e uma lista de patches por arquivo. Separar autenticação, transporte, tradutor e observador de quotas do painel Next.js e de localDb. Nem `open-sse` é inteiramente desacoplado: chatCore importa módulos `@/lib/usageDb.js`.

Alternativas: executar um fork como sidecar acelera demonstração, mas exige isolamento e mantém outro control plane; copiar o aplicativo inteiro preserva UX upstream, porém duplica identidade e configuração. Recomendação é proposta de arquitetura, ainda sem decisão de implantação.

## Plano de extração e validação

| Etapa | Entrega verificável |
| --- | --- |
| X0 — concluída nesta rodada | Snapshot, hash, inventário, análise e mapeamento documental |
| X1 — contrato | Binding estrito, oferta, conexão, entitlement, erro e trace versionados |
| X2 — fatia funcional | Um acesso API e um acesso por assinatura selecionados; fakes enquanto conexão real não estiver disponível |
| X3 — confiabilidade | Pool do mesmo modelo, refresh coordenado, orçamento, cancelamento, uso e logs |
| X4 — catálogo e painel | Todos os conectores inventariados com status: inventariado/portado/testado/habilitado/depreciado |
| X5 — expansão | Protocolos, providers e modalidades em lotes com regressão e rollout |
| X6 — operação | Rotação, desativação, reconciliação, backup, rollback e atualização do upstream |

Testes upstream úteis inventariados: `combo-routing.test.js`, `combo-autoswitch.test.js`, `combo-fusion.test.js`, `background-token-refresh.test.js`, `codex-refresh-token.test.js`, `compatible-provider-connections.test.js`, `github-monthly-usage-lock.test.js`, `cached-token-usage.test.js`, além das suítes golden do tradutor. Não foram executados nem considerados suficientes para multiempresa.

Acrescentar: tenant A usa somente contas próprias, mesmo em ofertas gratuitas; PLATFORM alterna contas globais elegíveis por requisição; duas réplicas renovam sem sobrescrever token novo; quotas concorrentes não excedem reserva; fallback preserva modelo; stream parcial não reinicia ação; alias remoto mutável não finge versão fixa; consumo desconhecido permanece pendente.

## Extensão — configuração completa de inferência

Leitura adicional de quatro arquivos já preservados no snapshot: thinking.js, thinkingUnified.js, thinkingLevels.js e provider-thinking-config.test.js. Total acumulado: 43 arquivos selecionados. O upstream traduz níveis/budgets, aplica limites e opções por modelo; são mecanismos úteis, mas suas tabelas e heurísticas não certificam equivalência entre providers. O [contrato de inferência](../notes/anxionos-inference-config.md) acrescenta schemas/perfis versionados, validação estrita, adaptação explícita, preview e configuração efetiva. Nenhum teste foi executado.

## Revisão posterior — gaps e resolução

A [revisão do modelo e do 9Router](./9router-gaps-validacao.md) confirmou o mesmo HEAD/hash em 2026-09-07, executou oito reproduções locais com dependências sintéticas e preparou patch candidato de bloqueio com oito regressões passando. Não executou a suíte oficial nem providers reais. Atualiza o planejamento em [Connections v0.8](../notes/anxionos-connections.md) e no [contrato operacional v1](../notes/anxionos-connections-operational-contract.md). As declarações acima de testes não executados referem-se às suítes upstream e à extração original. AGENCY agora também tem origem SYSTEM_FREE administrada pela plataforma; contas particulares de outros usuários continuam proibidas.

## Cobertura funcional, catálogo free e cooldown — revisão vigente

A [matriz de cobertura](./9router-functional-coverage.md) reconcilia 36 famílias e aprofunda filtros/discovery/disponibilidade em HEAD eb712ca, novamente conferido. Foram capturados catálogos públicos OpenRouter/Kilo e executadas sete observações locais adicionais. O filtro de gratuitos omite janelas menores que 200k e zero decimal diferente da string 0; a previsão de cooldown pode considerar modelo não relacionado. Fonte, limites e distinção entre inventário/leitura/implementação estão na revisão.

O [contrato free/cooldown](../notes/anxionos-free-cooldown.md) define CF01–CF16 e substitui heurísticas de gratuidade por evidência por oferta, com identidade preservada e recuperação por escopo. [TTS e embeddings](../notes/anxionos-multimodal-inference.md) não são mais backlog opcional: ver contrato multimodal para C1–C5. Nenhum conector foi portado nesta rodada.

## Questões abertas

1. Fallback entre modelos: pergunta enviada ao usuário; hipótese atual é manter o modelo predefinido e tentar outras conexões elegíveis.
2. Resolvida pelo usuário: agentes próprios da plataforma podem usar ofertas pagas/gratuitas de todos os usuários, inclusive em tarefas internas; regra mais recente exige alternância balanceada por requisição para PLATFORM e contas próprias, gratuitas/pagas, para clientes. Ver [Connections](../notes/anxionos-connections.md).
3. Primeiros providers de assinatura e API a homologar.
4. Quais réplicas/runtime e secret manager serão adotados.
5. Limites de custo, retenção e metas numéricas de latência.

Pesquisa em rascunho; decisões de produto confirmadas estão no brainstorm. Checkpoint final: extração documental concluída, implementação e homologação pendentes.
