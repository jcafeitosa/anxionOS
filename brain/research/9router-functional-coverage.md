---
title: 9Router — cobertura funcional e extração para Connections
description: 36 famílias, 12 gaps aprofundados e evidências de catálogo free e cooldown.
type: research-note
status: draft
cluster: anxionos
date: 2026-09-07
sources:
  - id: snapshot
    resource: ../external-sources/9router-eb712ca-source.md
  - id: free
    resource: ../external-sources/9router-free-catalog-sources.md
  - id: previous
    resource: ./9router-extracao-connections.md
---
# 9Router — cobertura funcional e extração para Connections

## Pergunta, escopo e checkpoint

Revisar todas as famílias funcionais do [inventário integral](./9router-extracao-connections.md), aprofundando catálogo free e cooldown segundo o [requisito](../notes/anxionos-brainstorm.md). HEAD eb712ca821f0ba6bc41043fbd14494c5af5daba5 novamente conferido em 2026-09-07. Fontes novas e experimentos estão na [captura verificável](../external-sources/9router-free-catalog-sources.md).

- [x] Reconciliar famílias com inventário de código já preservado.
- [x] Ler fluxos de filtros free, discovery, catálogo, disponibilidade e bloqueios.
- [x] Conferir respostas públicas OpenRouter/Kilo e documentação de limites.
- [x] Executar sete observações locais sobre funções reais do snapshot.
- [x] Definir contrato e backlog de adaptação.
- [x] Propagar e auditar documentação: 14 documentos passaram em OKF e links, sem achados.

O inventário original preserva 1.540 arquivos e 154 rotas API. Cobertura funcional não significa leitura linha a linha, compatibilidade comprovada de todos os providers ou código portado. Esta rodada não implementa o módulo. Legenda: A = análise anterior documentada; N = leitura aprofundada nesta rodada; I = inventariado por caminhos, revisão de implementação ainda necessária. Estado de todos os itens: inventariado/especificado; portabilidade, teste integrado e habilitação precisam de evidência própria.

## Matriz de extração completa por família

Caminhos relativos ao snapshot preservado; pastas identificam uma família, não alegam leitura de cada arquivo.

| ID | Família e origem | Destino / tratamento | Evidência e entrega |
| --- | --- | --- | --- |
| F01 | Registry, categorias, aliases; open-sse/providers/registry | Provider/Publisher/Operator versionados; categoria não certifica gratuidade | A+N; C1/C2 |
| F02 | Modelos estáticos/dinâmicos; API providers/[id]/models, suggested-models | Discovery por provider, acesso e modalidade; IDs completos preservados | N; C2 |
| F03 | Aliases/custom/disabled; API models/* | Alias explícito, modelo desativado separado de cooldown; diff de catálogo | A+I; C1/C4 |
| F04 | models.dev sync; src/lib/modelCatalog/sync.js | Evidências com idade/ETag/schema; não usar votação como suporte certificado | N; C2 |
| F05 | Filtros free OpenRouter/Kilo/OpenCode/Mimo; suggested-models/filters.js | PublicFreeCatalog com regras por provider, sem piso de contexto ou substring genérica | N; C1/C2 |
| F06 | Preços/capabilities; open-sse/providers e usageTracking | PriceVersion e OperationSchema; preço multidimensional e UNKNOWN | A; C1/C4 |
| F07 | API keys e endpoints compatíveis; API providers | Conta, conexão, CredentialRef e trust profile distintos | A; C2 |
| F08 | OAuth/PKCE/device code; src/lib/oauth | Sessão vinculada a titular; polling, cancelamento e expiração | A; C2 |
| F09 | Refresh antecipado/sob demanda; tokenRefresh, backgroundTokenRefresh | Locks distribuídos e compare-and-swap; recuperação de rotação incerta | A; C3 |
| F10 | Importação de tokens/sessões; API oauth | Migração explícita para cofre, não coleta automática de contas locais | I; C5 |
| F11 | Pools, prioridade/fill-first/sticky; src/sse/services/auth.js | AGENCY balanceia próprias; PLATFORM alterna contas reais por requisição | A+N; C3 |
| F12 | Locks/cooldown; accountFallback.js, auth.js | CooldownRecord tipado, escopo real, prazo e geração; inclusive no-auth | N; C1/C3 |
| F13 | API/painel de indisponibilidade; models/availability | Visões por titular; retry/probe direcionado, sem limpar todos os tenants | N; C4 |
| F14 | Quotas por provider; services/usage, antigravityQuota | QuotaWindow/QuotaGroup compartilhado, amostra válida e reservas | A; C3 |
| F15 | Auto-ping/reset; quotaAutoPing, models/test/ping | Worker com lease, jitter, orçamento e prazo; não desperdiçar franquia | I; C3/C4 |
| F16 | Account fallback; accountFallback, chat | Classificação de erro antes de retry, limite de tentativas/deadline | A+N; C3 |
| F17 | Combos/fallback entre modelos; combo.js | Extensão explícita; desabilitada para binding estrito | A; C6 |
| F18 | Auto-switch por capacidade; capacityAdapter | Preservar referência; ausência de capability não autoriza troca de modelo | A; C6 |
| F19 | Fusion/modelos+juiz; combo.js | Workflow governado em Runtime, custo de cada chamada rastreado | A; C6 |
| F20 | Tradução de requests/respostas/tools/thinking; translator | Adaptadores testados por protocolo, sem perda silenciosa de dados | A; C2/C5 |
| F21 | Executors/passthrough; open-sse/executors | Transporte desacoplado de Next/localDb; passagem direta ainda valida política | A; C2/C5 |
| F22 | JSON/SSE, abort/stall; chatCore e stream utils | Tentativa, stream parcial, cancelamento, continuidade e efeitos idempotentes | A; C3 |
| F23 | Embeddings/local; embeddingsCore, ollama-local | Espaço vetorial e limite de rede; Knowledge mantém índices | A; C1–C5 |
| F24 | Imagem/vídeo/TTS/STT; handlers/*Core | Schema por operação, VoiceProfile, ArtifactRef e Job; TTS confirmado | I + contrato NVIDIA; C1–C5 |
| F25 | Search/fetch; handlers/search e fetch | Tool Gateway autoriza ação; Connections gerencia acesso/custo upstream | I; C5/C6 |
| F26 | Usage/pricing/request details; usageTracking, usageRepo | Ledger idempotente, estimado versus reportado, preço aplicado e reconciliação | A; C4 |
| F27 | Gateway consumer keys; apiKeysRepo, API keys | WorkloadIdentity com escopo/revogação, separado da credencial upstream | A; C1/C2 |
| F28 | Proxies/pools/relay; lib/network, API proxy-pools | Egress autorizado; não multiplicar quota nem contornar bloqueios por proxy | A; C5 |
| F29 | RTK/Headroom/Pxpipe; open-sse/rtk e chatCore | Transformação opcional, versionada, compatível com tools e contexto | A+I; C6 |
| F30 | Caveman/Ponytail; rtk | Não injetar alterações de prompt automaticamente; extensão revisável | A; C6 |
| F31 | Dashboards/translator/quota/usage/combo; dashboard/* | Reimplementar UX com dados próprios/admin e motivos de elegibilidade | I; C4 |
| F32 | Login local/OIDC/SAML; lib/auth | Integrar identidade central; não duplicar autoridade do anxionOS | I; E02 |
| F33 | SQLite/backups/migrações; lib/db | Transacional central + outbox; plano de importação e rollback | A; C1/C4 |
| F34 | CLI/skills/tray/update/Docker/túneis; cli, skills, lib/tunnel | Inventário preservado, launcher/deployment separado se necessário | I; plataforma/C5 |
| F35 | MITM/client configs/MCP bridge; API cli-tools, mcp, dashboard/mitm | Integração opcional isolada; não caminho obrigatório de agentes internos | I; Tool Gateway/C6 |
| F36 | Testes unitários/golden/live; tests | Portar fixtures por contrato; acrescentar tenancy, concorrência e modalidades | A+I; cada fase |

Obrigatório extrair o conhecimento/casos úteis de todas as linhas, registrando disposition e justificativa. Não copiar SQLite, login paralelo, sticky PLATFORM, auto-switch ou interceptação de clientes como defaults do produto. Isso preserva cobertura sem herdar conflitos com requisitos confirmados.

## Gaps aprofundados e resolução

| ID | Evidência observada | Falha ou limite | Resolução no contrato |
| --- | --- | --- | --- |
| FC01 | FILTERS openrouter-free exige contexto >=200000 | Omite gratuitos de janela menor; dois casos reais OpenRouter | Sem limite mínimo no catálogo; contexto só filtra a tarefa |
| FC02 | Preço comparado estritamente com string 0 | Kilo decimal zero é omitido; número zero também em fixture | Decimal exato validado, sem Number(null)/falsy/epsilon |
| FC03 | Filtro usa só prompt/completion, map descarta evidência | Taxa adicional passa na fixture; sufixo sem preço desaparece | Declaração pública separada de verificação econômica por operação |
| FC04 | FREE_PROVIDERS/category/hasFree; OpenCode sufixo/allowlist; Mimo prefixo | Heurísticas não provam gratuidade de toda oferta ou disponibilidade | Adapters de evidência, origem/data/validade e conflito explícito |
| FC05 | suggested-models recebe URL e devolve data=[] em erro | Falha de coleta indistinguível de catálogo vazio; destino definido pelo request | SourceRegistry confiável, estado FAILED/STALE e release completo versionado |
| FC06 | Kilo free-models cache em memória, stale em falha, contexto default 0 | Sem coordenação entre réplicas; desconhecido confundido com zero | Snapshot compartilhado com freshness e contexto UNKNOWN |
| FC07 | sync.baseId remove vendor e sufixo para agregação | Correlação não pode servir como identidade de oferta gratuita/paga | Preservar upstream ID/variant; base model é relação separada |
| FC08 | getEarliestModelLockUntil examina todos os locks | Fixture mostra 30s enquanto rota alvo exige ao menos 20min | Máximo dos bloqueios aplicáveis por rota, mínimo entre rotas viáveis |
| FC09 | markAccountUnavailable ignora noauth e seleção retorna antes de locks | Este caminho não protege recurso público com cooldown persistido | capacityResourceId e limites do endpoint/grupo, sem conta inventada |
| FC10 | markAccountUnavailable limita certos resets remotos a 30min | Prazo conhecido de quota pode ser encurtado | Preservar reset autoritativo; recheckAt separado de notBefore |
| FC11 | availability POST limpa provider+modelo em todas as conexões | Inadequado à edição por titular e concorrência multiempresa | cooldownId/escopo/generation/reason; admin bulk lista alvos explicitamente |
| FC12 | Modelo/global em OR textual e limpeza em sucesso | Achados já reproduzidos na revisão anterior | OR lógico entre locks ativos; sucesso antigo não revoga bloqueio novo |

FC05 descreve o handler examinado, não prova exploração de SSRF em deployment real. FC09 não afirma inexistência de proteção em todo proxy/rede do projeto. FC07 refere-se ao sync de capacidades, não afirma que o dispatcher já remove :free. FC03 comprova apenas insuficiência do filtro, não cobrança real indevida.

## Experimentos e limites

Sete observações executadas no [harness preservado](../external-sources/9router-free-free-cooldown-probes-20260907.mjs): gratuitos de contexto curto, só tag, zero numérico e decimal são omitidos; fixture com taxa extra é aceita; controle zero textual/janela grande é aceito; helper informa prazo de lock não relacionado. Assertivas passaram confirmando esses comportamentos, não sua correção. Catálogos públicos capturados sem autenticação evidenciam FC01/FC02. Não executada suíte oficial, inferência real ou teste de carga.

## Entrega e rastreabilidade

O [contrato free/cooldown](../notes/anxionos-free-cooldown.md) define CF01–CF16 e DFree/DCool em C1–C4 de E06. TTS/embeddings e modalidades seguem [contrato multimodal](../notes/anxionos-multimodal-inference.md). Cada arquivo candidato a portabilidade deve ter sourceCommit/path/hash/license, destino, patches, fixtures, estado inventariado/portado/testado/homologado/habilitado e critérios de rollback. Atualizar essa matriz por release upstream; preservar notices aplicáveis.

Lançamento exige decisão sobre cadência/freshness, providers homologados, limites de probes e filas. Não é necessário decidir valores para congelar os contratos semânticos; parâmetros serão versionados. Pesquisa permanece draft.
