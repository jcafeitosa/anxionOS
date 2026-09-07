---
title: Connections — catálogo automático e uso de modelos caros
description: Detecção por provider, análise e ativação automáticas; custo restrito por finalidade.
type: planning-note
status: draft
cluster: anxionos
sources:
  - id: requirement
    resource: ./anxionos-brainstorm.md
  - id: catalog
    resource: ./anxionos-model-catalog.md
  - id: free
    resource: ./anxionos-free-cooldown.md
---
# Connections — catálogo automático e uso de modelos caros

Contrato de planejamento v0.1. Requisito confirmado em [brainstorm](./anxionos-brainstorm.md): detectar mudanças por provider, analisar novos modelos, classificá-los, disponibilizá-los automaticamente e reservar modelos caros para planejamento ou situações especiais. Complementa [catálogo](./anxionos-model-catalog.md), [free/cooldown](./anxionos-free-cooldown.md) e [inferência](./anxionos-inference-config.md). Não cria monitor nesta conversa nem afirma implementação.

## 1. Automação como comportamento padrão

Cada alteração detectada inicia discovery, análise, classificação e publicação. Modelo compatível em adapter já homologado fica disponível sem cadastro manual, deploy ou aprovação individual. Disponível significa selecionável/configurável e consumível por chamadas autorizadas; não atribuído automaticamente a todos os agentes.

Exceções explicáveis: protocolo não suportado, identidade ambígua, requisito obrigatório desconhecido, falta de acesso ou conflito de preço/política. A entrada aparece no catálogo com estado e motivo; apenas a operação afetada fica pendente. Não bloquear catálogo inteiro por uma entrada inválida nem esperar benchmark de qualidade para publicar metadados válidos.

## 2. Detecção de mudanças por provider

ProviderCatalogWatchPolicy define fontes oficiais, método EVENT/POLL/HYBRID, intervalo, jitter, rate budget, freshness, timeout, retry, reconciliação e versão. Usar webhook/evento autenticado quando o provider oferecer; caso contrário, polling condicional com ETag/Last-Modified e hash normalizado. Não presumir eventos disponíveis em todos os providers.

Defaults técnicos propostos: polling a cada 5min com jitter de até 10%, ajustado aos limites da fonte; reconciliação completa a cada 6h para eventos perdidos. São parâmetros do produto proposto, não automação iniciada nesta sessão. Cadência real e atraso ficam visíveis.

Outros gatilhos: nova conexão/reauth, mudança de plano/entitlement, erro de modelo removido, versão de adapter e sync manual. Coalescer eventos repetidos, lease por fonte/escopo e fila limitada. Deduplicar fetch público entre usuários; consultar disponibilidade autenticada por conta/plano sem publicar seus dados privados.

“Assim que detectar” significa processamento imediato após sinal confiável. Tempo até observar mudança depende de evento/polling, conectividade e limites. Registrar upstreamChangedAt quando informado, detectedAt, analysisStartedAt, publishedAt e eligibleAt. Meta proposta: p95 até 30s de detectedAt à publicação/elegibilidade para entradas completas em adapter conhecido sob carga nominal; validar em teste antes de prometer. Medir atraso da detecção separadamente.

## 3. Pipeline até uso

1. Validar fonte/schema e snapshot consistente com paginação, revisão e hash. Evento pode disparar refetch em vez de representar lista completa.
2. Calcular diff ADDED, METADATA_CHANGED, PRICE_CHANGED, CAPABILITY_CHANGED, ACCESS_CHANGED, DEPRECATED e REMOVED; mudança cosmética não exige avaliação cara.
3. Resolver publisher/modelo/versão/variante/operação/ofertas, preservando IDs completos e :free.
4. Analisar família, contexto/input/output, tools/reasoning/effort, formatos/dimensões/vozes, preço/unidades, gratuidade, regiões e limites.
5. Classificar por taskKind, faixa de contexto, economia e G1–G4 quando houver evidência. UNCLASSIFIED é posição válida para qualidade ainda não avaliada; NOT_APPLICABLE para operação não LLM.
6. Validar schema do adapter, evidências necessárias e política de admissão. Homologação do protocolo não certifica todas as capacidades do modelo.
7. Publicar release versionado, decisão de elegibilidade, outbox e invalidação de caches.
8. Disponibilizar no dashboard/API aos consumidores autorizados; enriquecer/avaliar em background.
9. Informar mudanças e impacto nos bindings via eventos, sem exigir recarga manual da configuração.

Grants podem cobrir novos modelos automaticamente somente se a política vigente incluir esse escopo. Allowlist explícita continua restritiva. SYSTEM_FREE segue regra administrativa previamente configurada de publicação e financiamento; contas particulares não se tornam SYSTEM_FREE.

Novo provider/protocolo exige integração correspondente; não baixar/executar código, container ou ferramenta indicada pelo catálogo. Model card é dado, não instrução nem autorização. Novo modelo em protocolo conhecido pode ser ativado sem código novo quando o schema existente o atende.

## 4. Estados, confiança e classificação

Ingestão: DETECTED → ANALYZING → PUBLISHED, com RETRY_PENDING/PARTIAL_FAILED por entrada. Elegibilidade por oferta/consumidor/operação: READY, LIMITED, PENDING_COMPATIBILITY, ACCESS_REQUIRED, POLICY_RESTRICTED, PRICE_UNCERTAIN, COOLDOWN e WITHDRAWN.

Autoativação é o padrão. Capability opcional desconhecida fica indisponível sem impedir função básica admissível; falta de dado necessário gera pendência específica. Não inventar contexto, dimensão ou preço para cumprir meta de tempo. Grupo qualitativo não resolvido não impede uso básico compatível.

EVALUATED exige dataset/rubrica/threshold configurados. Avaliação longa não bloqueia publicação ou operações já admissíveis. Inferência de avaliação usa workflow SPECIAL registrado, dados de teste, orçamento e teto de chamadas; autoconfiança do próprio modelo não comprova qualidade. Análise inicial determinística evita recursão de LLM para escolher o próprio classificador.

## 5. Modelos caros: uso restrito por finalidade

Restrição confirmada vale para AGENCY e PLATFORM, independentemente da conta financiadora. Paid não significa caro; grupo G1–G4, contexto e effort não definem custo isoladamente.

ExpensiveModelPolicyVersion contém selectors de modelo/variante/operação, classificação explícita RESTRICTED ou regras econômicas por oferta, moeda/unidades, priceVersion, limites e vigência. Estimar custo por chamada/tarefa incluindo input, saída máxima, reasoning cobrado, mídia/tools, retries e subtarefas. Modelo barato por unidade pode gerar tarefa cara com volume elevado.

Restrição aplica quando modelo/oferta está explicitamente classificado caro OU estimativa ultrapassa thresholds. UNKNOWN não vira barato: PRICE_UNCERTAIN, salvo limite superior confiável e permitido. Thresholds por modalidade/moeda devem ser configurados antes do lançamento; não inventar valor universal por milhão de tokens. Oferta gratuita não remove restrição explícita do modelo. Assinatura separa custo fixo/franquia e não presume custo marginal equivalente à API.

| Finalidade | Regra |
| --- | --- |
| ROUTINE | Uso caro bloqueado; heartbeat, classificação simples, extração rotineira e tarefas administrativas não recebem exceção automática |
| PLANNING | Permitido para workflow/tarefa de planejamento registrado, com binding, grants e orçamento |
| SPECIAL | Permitido por regra específica vigente ou autorização excepcional com motivo, escopo e prazo |

Exemplos propostos para SPECIAL: revisão arquitetural crítica, avaliação controlada de modelo, investigação complexa de incidente e revisão excepcional de decisão. Não viram allowlist automaticamente. Administrador configura políticas PLATFORM; Owner configura as da empresa dentro dos limites globais. Incidente ou baixa confiança não autorizam gasto ilimitado.

TaskPurpose é validado no servidor a partir do workflow/tarefa, distinto de taskKind da operação e da finalidade de financiamento. Texto “isto é planejamento”, flag enviada pelo agente ou persona CEO não concedem autorização. SpecialUseAuthorization registra ruleId/approvalRef, task/workflow, actorScope, modelos/bindings, motivo, validade, maxCost, maxCalls e allowedEffort. Regra previamente configurada pode autorizar automaticamente; não exigir aprovação humana para cada chamada.

Reservas hierárquicas por workflow/tarefa/ator/conta impedem dividir trabalho para contornar teto. PLANNING/SPECIAL respeitam quotas, cooldown, dados e contexto. Revalidar finalidade, preço e política antes de dispatch/retry; thinking auto não aumenta orçamento.

## 6. Bindings e planejamento dedicado

Agentes continuam com modelo predefinido. Blueprint proposto: reasoning.primary de custo permitido para rotina, reasoning.planning com modelo fixo para planejamento e reasoning.special opcional. Workflow autorizado escolhe slot, sem fallback livre por qualidade/indisponibilidade/preço.

Modelo caro como principal não autoriza rotina: diagnóstico exige ajuste de configuração ou finalidade válida. Não substituir silenciosamente. Modelo descoberto fica disponível para configuração e chamadas já cobertas pelos bindings/políticas; não altera agente, memória, voz ou espaço vetorial. Troca de embedding exige migração em Knowledge.

Runs preservam snapshots de binding e rastreabilidade. Aliases upstream mutáveis permanecem identificados como mutáveis; mudança reportada revalida compatibilidade, sem prometer versão que o provider não garante. Novas tentativas respeitam revogação e política vigente mais restritiva.

## 7. Concorrência, mudanças e recuperação

Usar eventId/sourceRevision quando disponíveis, hash e idempotência; não ordenar revisões opacas lexicograficamente. Serializar refresh por fonte e impedir resposta iniciada antes de sobrescrever release novo. Sem ordem upstream confiável, refetch/reconciliação determina o estado.

Snapshot completo é publicado atomicamente. Entradas válidas podem avançar sem interpretar falhas parciais como remoções. Outbox publica após commit e replay não duplica modelos, grants ou jobs. Falha mantém última versão com freshness explícita.

Preço aumentado, modelo retirado ou capability revogada revalida elegibilidade prioritariamente, antes de novas tentativas, sem aguardar benchmark. Chamada já transmitida mantém resultado/uso/reconciliação; cobrança upstream não pode ser desfeita retroativamente. Preço menor não revoga classificação manual RESTRICTED.

Rollback preserva histórico e não ressuscita modelo retirado, preço antigo ou grant revogado. Sync de catálogo não limpa cooldown sem evidência de recuperação.

## 8. Dados, operação e entrega

Entidades: ProviderCatalogWatchPolicy, CatalogChange, CatalogAnalysisJob, CatalogAdmissionDecision, CatalogRelease, ExpensiveModelPolicyVersion, TaskPurposePolicy e SpecialUseAuthorization. Grafo projeta eventos/classificações/impacto; autoridade transacional decide elegibilidade e reserva.

Dashboard exibe novo, análise/pendência, família/grupo/janela, free/economia, restrição de custo, uso permitido e timestamps. Admin acompanha atraso por provider, falhas e gasto especial; usuário vê suas ofertas autorizadas.

E06/C1 define schemas/políticas; C2 watchers/discovery/análise/publicação; C3 finalidade/custo/binding/leases; C4 painel/métricas/recuperação; C5 amplia providers. Esta especificação não comprova workers executando.

| Caso | Aceite |
| --- | --- |
| CA01 | Evento ou polling detecta mudança e dispara análise sem intervenção humana |
| CA02 | Modelo completo em adapter conhecido é publicado e habilitado para consumidor já autorizado |
| CA03 | Duplicação e resposta antiga não duplicam nem revertem release |
| CA04 | Preço/tag/contexto/operação atualizam classificação/elegibilidade; fetch falho não apaga catálogo |
| CA05 | UNCLASSIFIED não impede uso básico compatível; desconhecido não vira benchmark inventado |
| CA06 | Dado obrigatório/protocolo desconhecido gera pendência localizada |
| CA07 | Publicação não troca binding/embedding nem amplia allowlist/grant |
| CA08 | Uso caro é barrado em ROUTINE, inclusive CEO/PLATFORM/assinatura ou free quando restrição explícita aplica |
| CA09 | PLANNING/SPECIAL válidos usam modelo fixo/reserva; flag falsa, expiração e teto excedido bloqueiam |
| CA10 | Fan-out/retry/subtarefas compartilham teto; preço/effort novos não ampliam orçamento |
| CA11 | Crash/outbox/restart recuperam catálogo sem perder cooldown |
| CA12 | Métricas separam detecção de processamento; meta proposta só é compromisso após teste |

Desenho documentado; implementação/homologação pendentes. Valores de caro, allowlist SPECIAL, cadências e SLOs finais são parâmetros de lançamento, não razão para cadastro manual de cada modelo.
