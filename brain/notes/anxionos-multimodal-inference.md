---
title: Connections — inferência por finalidade e modalidade
description: TTS, STT, embeddings, reranking, visão e mídia com contratos próprios.
type: planning-note
status: draft
cluster: anxionos
sources:
  - id: requirements
    resource: ./anxionos-brainstorm.md
  - id: research
    resource: ../research/nvidia-model-types-connections.md
  - id: catalog
    resource: ./anxionos-model-catalog.md
---
# Connections — inferência por finalidade e modalidade

Contrato de planejamento v0.1. O usuário confirmou gestão de TTS, embeddings e outros tipos de modelo e pediu a análise de [NVIDIA Build](../external-sources/nvidia-build-models.md). A [pesquisa aplicada](../research/nvidia-model-types-connections.md) fundamenta a ampliação; regras operacionais continuam em [Connections](./anxionos-connections.md) e no [contrato operacional](./anxionos-connections-operational-contract.md). Nenhuma integração está implementada nesta rodada.

## 1. Uma plataforma de inferência, múltiplas operações

Model não é sinônimo de LLM de chat. ModelVersion declara taskKinds, inputModalities, outputModalities e schemas; uma mesma versão pode suportar vários taskKinds. ModelOffering acrescenta limites de acesso/protocolo/deployment por operação, sem presumir que todas as capacidades do modelo estejam expostas.

| Família | taskKinds exemplificativos | Entrada → saída | Características próprias |
| --- | --- | --- | --- |
| Linguagem/raciocínio | text.generate, text.translate, text.classify | Texto/contexto multimodal → texto/estrutura/tools | Contexto, output tokens, reasoning, schemas e ferramentas |
| Embeddings | embedding.encode | Texto/código/imagem conforme oferta → vetores densos/esparsos/múltiplos | Espaço vetorial, dimensão, normalização, papel query/document, lote e sequência |
| Reranking | retrieval.rerank | Consulta + candidatos → IDs/ordem/scores | Max candidatos, tokens por par, topK, scoreType e direção da ordenação |
| Voz sintetizada | audio.synthesize | Texto → áudio | Idioma/variante, voz/versão, encoding, sample rate, canais, texto/duração máxima |
| Transcrição | audio.transcribe | Áudio → texto/segmentos | Idiomas, diarização quando suportada, timestamps, duração/canais/formatos |
| Tradução de fala | audio.translate | Áudio → texto ou áudio conforme schema | Idiomas de origem/destino e preservação de tempos |
| Percepção visual/documental | vision.describe, document.ocr, document.extract, vision.detect, vision.segment | Imagens/páginas/vídeo → texto, estrutura, regiões ou máscaras | Resolução, páginas/frames, coordenadas, layout, idioma e schema |
| Geração/edição de mídia | image.generate, image.edit, video.generate | Prompt/imagens/áudio → artefatos de mídia | Dimensões, duração, frames, steps, seed, edição/máscara e job |
| Moderação | content.moderate | Conteúdo → labels/scores | Taxonomia/threshold/policy version, modalidade e calibração |
| Especializados | Namespace registrado, ex.: timeseries.forecast | Séries/tensores estruturados → previsão/estrutura | Unidade, horizonte, frequência, covariáveis e evidência por domínio |

A tabela define extensibilidade do produto; não afirma que todos os taskKinds estejam presentes em todo provider ou tenham sido verificados na NVIDIA. TTS/embeddings estão confirmados; demais famílias são repertório a habilitar por evidência e necessidade. Modelos especializados não autorizam operar capital.

Os grupos G1–G4 do [catálogo](./anxionos-model-catalog.md) permanecem na família de linguagem/raciocínio. Outros tipos usam rubricas próprias e llmGroupApplicability NOT_APPLICABLE. UNCLASSIFIED continua reservado a modelo de linguagem ainda sem grupo. TTS não vira G4 por ter poucos parâmetros; embedding não vira G1 por ter sequência longa.

## 2. Binding por finalidade, preservando modelo predefinido

Evolução do contrato: **um binding primário de raciocínio por agente; no máximo um binding padrão vigente por finalidade/slot adicional**. Exemplos de slots: reasoning.primary, speech.synthesis, speech.transcription, vision.understanding. Cada binding fixa modelo/versão, taskKind, perfil e política de supply/pool. Adicionar modalidade não troca o modelo principal.

Bindings de recuperação podem pertencer ao serviço/coleção: retrieval.document_embedding, retrieval.query_embedding, retrieval.reranking. Agentes referenciam a política de Knowledge correspondente, em vez de cada agente escolher livremente um embedding incompatível para a mesma coleção.

InferenceBindingVersion registra:
ownerKind AGENT/AGENCY_SERVICE/PLATFORM_SERVICE, ownerId/consumerScope, purpose/slot, taskKind, modelId/versionSelector, profileVersion, operationSchemaVersion, supply/pool policy e referências de compatibilidade (embeddingSpaceId, voiceProfileId ou sessionContractId quando aplicável).

Defaults da plataforma podem fornecer templates. Herdar template/usar serviço técnico não converte consumidor AGENCY em PLATFORM e não concede uso das contas de outros Owners. Em tarefas de cliente, manter consumerScope/beneficiary/funding e grants originais em cada etapa.

Modelo fixo significa por finalidade: chamar TTS predefinido para sintetizar o texto do CEO não é fallback do LLM. Dentro de cada finalidade, SAME_MODEL_ONLY e o perfil continuam preservados. Slots opcionais ausentes ficam NOT_CONFIGURED; o router não inventa modelos para completá-los.

Migração de bindings existentes: purpose=reasoning.primary e taskKind=text.generate, preservando ID/histórico; ajustar unicidade para owner+slot+vigência. Runs iniciados retêm suas versões. Novos slots exigem configuração e readiness, sem ativação automática.

## 3. Schema de operações e resultados

O envelope comum tem requestId/idempotencyKey, consumer/workload identity, bindingRef, run/task/parentRequestId, taskKind, inputRefs/payload, profileVersion, deadline e classificação de dados. O servidor verifica identidade; a união discriminada por taskKind valida payload e resultado.

- TextResult: mensagens/estrutura/tool proposals, usage e finishReason.
- EmbeddingResult: vetores ou artifactRef, dimensão, representação, inputItemIds, embeddingSpaceId e normalização.
- RerankResult: candidateIds, índices, scores, scoreType, ordenação e truncamento declarado.
- AudioResult: artifactRef ou stream, codec/container, sampleRateHz, channels, duration quando conhecida e voice version.
- TranscriptResult: texto, idioma observado, segmentos/tempos, speakerIds quando suportados e parciais/finais.
- DocumentResult/VisionResult: estrutura, texto, página/frame, caixas/máscaras, coordinateSystem, readingOrder e confiança tipada.
- MediaJobResult: jobId, estado/progresso quando observável e manifest de artefatos.
- ClassificationResult: labels/taxonomia/policy, scores e calibração conhecida/desconhecida.

Não envelopar qualquer binário como mensagem de chat nem confundir empty array válido com falha. Preservar ordem e IDs dos itens de lote; partial failures têm resultado por item.

ArtifactRef contém ownership/scope, storageId, MIME, bytes, checksum, provenance, expiry/retention e policy. Entrada é autorizada antes do download; saída só é lida pelo consumidor permitido. URLs temporárias não viram links públicos permanentes. Não colocar base64 de áudio/vídeo, arquivos ou segredos no grafo/event log.

## 4. Embeddings e reranking

EmbeddingSpaceContract: modelo/snapshot, revisão do tokenizer/preprocessamento, dimensão, dense/sparse/multi-vector, pooling, normalização, métrica de similaridade, inputRole/prefixos e opções de quantização. Igualdade de dimensão é necessária em certos índices, mas não prova equivalência semântica.

Failover usa oferta compatível com o mesmo contrato de espaço. Aliases mutáveis sem fingerprint/evidência de compatibilidade não podem alterar vetores de coleção silenciosamente. Uma variante compatível pode ser admitida com avaliação e versão de contrato; não presumir que toda quantização preserva espaço.

Troca incompatível dispara fluxo de Knowledge: novo índice/space version → re-embedding controlado → avaliar retrieval → alternar referência → manter rollback conforme retenção. Connections executa requests e registra uso; Knowledge é proprietário da indexação, chunking, corpus e migração. Não misturar vetores de espaços distintos no mesmo índice como se fossem equivalentes.

Reranker recebe conjunto de candidatos já recuperados. Scores podem ser logits ou outros valores; não converter para “probabilidade” ou comparar escalas de modelos diferentes sem calibração. Validar IDs, topK, ordem estável e relação output/input; reranking não concede acesso a documento que a busca não autorizou.

## 5. TTS, STT e áudio

VoiceProfileVersion: voz resolvida no provider/oferta, idioma e variante (pt-BR e pt-PT distintos), estilo/speed/pitch quando suportados, SSML quando suportado, encoding/container/sampleRate/channels e versão. VoiceId não é portátil entre providers. Fallback preserva voz/configuração ou retorna incompatibilidade; não troca voz implicitamente para concluir.

STT registra languageHint versus idioma observado, timestamps com unidade/origem, speaker labels e revisão de parciais. Retorno parcial pode ser corrigido por resultado final. Segmentação de áudio em requests é decisão explícita do runtime, com alinhamento de tempos e política de junção; o router não corta fala silenciosamente.

Adaptadores podem usar HTTP, gRPC ou protocolos de sessão homologados. SSE é apenas um transporte possível para certas respostas. Codecs, amostragens e canais são validados de ponta a ponta; conversão autorizada registra origem, destino e custo. Sample rate nativo do modelo e solicitado à API não são o mesmo fato.

Voz clonada é capability distinta de TTS padrão; só disponível com referência e política de uso autorizadas para o material. Configurar voz padrão não habilita clonagem automaticamente.

Streaming de áudio tem sequência, buffer limitado, backpressure, tempo para primeiro áudio e duração. Um stream corresponde a uma tentativa: cada chunk não dispara rotação de conta. Reconexão é nova tentativa e respeita continuidade; sessão presa a uma conta continua incompatível com alternância PLATFORM quando ela impedir trocar conta entre requests.

## 6. OCR, visão, mídia e moderação

Limites próprios por operação: pixels/resolução, tamanho de arquivo, páginas, frames/duração, documentos por lote e payload. Contexto em tokens só se aplica quando o schema do modelo/operação o usa. Não chamar número interno de posições do reconhecedor OCR de “janela de chat”.

OCR preserva referências de página/imagem e coordenadas; “extrair só texto” é uma projeção pedida pelo consumidor, não descarte irreversível da resposta. Modelos de detecção/segmentação têm saída diferente de VLM de descrição.

Imagem/vídeo têm perfis de geração/edição e job; seed não promete determinismo entre versões. Preview do catálogo não executa geração. Conteúdo que o provider modera pode ter estado próprio de recusa; não usar outro provider para contornar essa política.

Moderação de conteúdo é etapa de inferência com policy/taxonomia própria. Não substitui autorização de grafo, validação de ferramenta ou verificação de risco financeiro.

## 7. Oferta hospedada, NIM e operação

Distinguir publisher do modelo, inferenceProvider/operator, deploymentKind HOSTED/PARTNER/SELF_HOSTED/LOCAL, protocolo, região e credencial. Uma conta NVIDIA pode acessar modelos de vários publishers; um modelo pode ser servido pela NVIDIA ou por um deployment próprio. Model ID, container e runtime profile são entidades/versões distintas.

DeploymentProfile registra imagem com digest/revisão, modelo/precision/profile selecionados, hardware/VRAM/runtime, endpoints, readiness, capacidade, cold start e custo operacional quando conhecido. Download disponível não é estado READY. Não puxar container nem iniciar GPU automaticamente pelo cadastro.

Documentação/publicação fornece CapabilityEvidence DECLARED; conector só passa a VERIFIED/ENABLED com teste daquela oferta. Detectar drift, campos desaparecidos, endpoint removido, mudanças de idiomas/vozes/dimensões e depreciação. HTTP 200 com página vazia não mantém uma capability como verificada.

Free/trial/downloadable/commercially-usable são dimensões distintas. Preservar terms/license refs por serviço/modelo/container sem deduzir autorização de produção ou redistribuição do selo “free”. SYSTEM_FREE exige publicação administrativa, entitlement, orçamento e confiança. As regras OWNER_PRIVATE/PLATFORM continuam para chaves particulares.

## 8. Orçamento, filas e consistência

Uso tem medidas tipadas: tokens, caracteres segundo contagem do provider, segundos de áudio/vídeo, páginas/imagens, vetores/itens/pares, requests, bytes e computação própria. Cada PriceVersion define unidade, arredondamento, mínimo, entrada/saída e vigência. Não somar unidades heterogêneas nem converter todas em tokens estimados.

Reserva inclui limites de tarefa e custo máximo conhecido; quando geração/duração não pode ser limitada ou estimada com garantia suficiente, usar política de admissão explícita ou rejeitar, conforme contrato operacional. Custo upstream, subsídio SYSTEM_FREE e cobrança ao consumidor continuam separados.

Core de identidade, quota, idempotência, lease/fencing, ledger e UNKNOWN_OUTCOME é compartilhado. Extensões de protocolo não criam outra fonte de saldo. Jobs duráveis têm submit/status/result/cancel, upstreamJobId, deadline e reconciliação. Upload, inferência e coleta são etapas rastreáveis; falha após submit não repete job sem suporte de idempotência.

Batches preservam identidade por item e reserva agregada/item conforme API. Itens já concluídos não são enviados novamente ao retomar um lote parcial. Cancelamento local não prova parada remota nem custo zero.

Pipeline pertence a Agent Runtime/Knowledge. Cada etapa tem binding/request/artefatos, parentRequestId e budget; o budget total inclui todas as chamadas. Erro de etapa não autoriza substituir tipos incompatíveis.

## 9. Fluxos de referência e UI

Fluxo de voz: áudio autorizado → STT configurado → modelo primário de linguagem → TTS configurado → áudio autorizado ao usuário.

Fluxo de conhecimento: documento autorizado → OCR/extraction quando necessário → chunking de Knowledge → embedding da coleção → índice; consulta → embedding compatível → recuperação autorizada → reranking → modelo de linguagem.

A interface de Connections organiza por finalidade, com filtros de modalidade, origem, capacidade, implantação e estado. Modelos de linguagem mantêm G1–G4; outras categorias mostram métricas específicas. Ficha de agente distingue modelo primário e serviços/slots habilitados. Ficha de coleção mostra o espaço vetorial, sem permitir alteração casual que invalide o índice.

Métricas: texto TTFT/tokens; TTS primeiro áudio/tempo total; STT atraso/finalização e WER/CER em avaliação; embeddings retrieval/throughput e compatibilidade; rerank qualidade/latência; OCR CER/layout; imagem/vídeo qualidade rubricada e duração/custo. Não criar ranking universal que compare uma voz com um embedding.

## 10. Entrega e aceitação

TTS e embeddings passam a ser requisitos do módulo. Contratos de múltiplas operações entram em C1, discovery em C2, dispatch em C3 e ledger/UI em C4. C5 homologa por operação/provider; C6 amplia modalidades especializadas. A ordem proposta de primeiras fatias é embeddings/rerank e TTS/STT, depois documentos/visão e geração especializada conforme demanda. Não adiar o schema multimodal inteiro como P2.

| Caso | Aceite |
| --- | --- |
| MM01 Tipagem | TTS/embedding não aceitam payload de chat; schema/operação incompatível falha antes do envio |
| MM02 Binding | Modelo principal preservado; cada slot tem versão; serviço compartilhado não amplia consumerScope |
| MM03 Catálogo | G1–G4 só para linguagem; duração/dimensão/pixels não classificados como janela de chat |
| MM04 Vetores | Mesma dimensão com espaço diferente rejeitada; troca incompatível exige migração de Knowledge |
| MM05 Rerank | IDs/ordem/scores preservados; logits não apresentados como probabilidade sem calibração |
| MM06 Áudio | Voz, idioma, codec e sample rate corretos; conversão explícita; conta não alterna por chunk |
| MM07 Transcrição | Parciais/finais, timestamps, idioma e segmentação mantêm alinhamento e identidade |
| MM08 Documentos | Layout/página/caixas preservados; acesso a todos os artefatos é validado |
| MM09 Custo | Caracteres/segundos/itens/tokens reconciliados sem somar unidades ou duplicar cobrança |
| MM10 Jobs | Crash, cancelamento e lote parcial não duplicam trabalho concluído nem presumem custo zero |
| MM11 Oferta | HOSTED e SELF_HOSTED são ofertas distintas; trial/download não ativam produção automaticamente |
| MM12 Drift | Mudança de dimensão/voz/profile/modelo gera revalidação e diagnóstico; não altera binding silenciosamente |

Planejamento concluído nesta rodada; código, benchmarks, ofertas autenticadas e homologação ainda pendentes. Nenhum custo/licença/capability real foi presumido a partir da simples presença no catálogo.
