---
title: NVIDIA Build — expansão multimodal de Connections
description: Pesquisa aplicada sobre áudio, embeddings, reranking, OCR e contratos por modalidade.
type: research-note
status: draft
date: 2026-09-07
cluster: anxionos
sources:
  - id: nvidia
    resource: ../external-sources/nvidia-build-models.md
  - id: upstream
    resource: ./9router-extracao-connections.md
  - id: requirements
    resource: ../notes/anxionos-brainstorm.md
---
# NVIDIA Build — expansão multimodal de Connections

Pesquisa em rascunho, com escopo autorizado pelo pedido de gerenciar TTS, embeddings e outros modelos. [Fontes primárias preservadas](../external-sources/nvidia-build-models.md), consultadas em 2026-09-07. Nenhuma conta foi conectada, NIM instalado ou inferência executada.

## Pergunta e checkpoint

Como ampliar [Connections](../notes/anxionos-connections.md) para modelos de diferentes modalidades sem forçar todos ao contrato de chat, ao ranking G1–G4 ou à cobrança por tokens?

- [x] Cobertura anterior: [9Router](./9router-extracao-connections.md) já inventariava handlers de embeddings, imagem, vídeo, TTS/STT; a [proposta operacional](../project-docs/proposals/0002-connections-expansao-operacional.md) ainda os tratava como extensão P2.
- [x] Rubrica: tipos/entradas/saídas, protocolos e implantação, capacidades, limites, custos, catálogo e acesso.
- [x] Captura: dez páginas oficiais em HTML com hash, incluindo uma página antiga sem model card utilizável.
- [x] Síntese abaixo e contrato de ampliação separados de fatos externos.
- [x] Propagação e auditoria documental: 14 documentos verificados por OKF e links, sem achados. Implementação e homologação continuam pendentes.

## Evidências do catálogo

| Área | Observação verificada | Consequência para o desenho |
| --- | --- | --- |
| Acesso e implantação | O [catálogo](https://build.nvidia.com/models) distingue endpoints gratuitos, endpoints de parceiros e downloads | Publisher, operador da oferta e deployment são identidades diferentes; discovery não habilita execução |
| TTS | [Magpie API](https://build.nvidia.com/nvidia/magpie-tts-multilingual/api) documenta HTTP e gRPC, enumeração de vozes e parâmetros de idioma, voz, encoding e sample rate | VoiceProfile/AudioProfile por oferta; resultado é áudio, não mensagem de chat |
| TTS local | [Magpie Deploy](https://build.nvidia.com/nvidia/magpie-tts-multilingual/deploy) descreve NIM em infraestrutura própria, portas HTTP/gRPC e readiness | DeploymentProfile com requisitos e saúde; disponibilidade de download não equivale a endpoint operacional |
| Embeddings | [Nemotron-3-Embed-1B](https://build.nvidia.com/nvidia/nemotron-3-embed-1b/modelcard) declara dimensão 2.048 e sequência máxima 32.768; descreve dimensões reduzidas e variantes de precisão | Guardar dimensão efetiva, normalização e identidade do espaço vetorial; mudanças exigem validação, não apenas igualdade de dimensão |
| Reranking | A [página VL](https://build.nvidia.com/nvidia/llama-nemotron-rerank-vl-1b-v2) recebe consulta/passagens e apresenta oferta de desenvolvimento sujeita a limitação | Operação própria para ranking; não equiparar score a texto gerado ou a probabilidade calibrada sem contrato |
| ASR/STT | O [model card Parakeet](https://build.nvidia.com/nvidia/parakeet-tdt-0_6b-v2/modelcard) distingue perfis v2/v3, idiomas e modos de processamento | Capacidade depende do perfil carregado; duração, canais e timestamps precisam de schema |
| OCR | [Nemotron OCR v2](https://build.nvidia.com/nvidia/nemotron-ocr-v2/modelcard) descreve variantes e saída com texto, caixas e confiança | Preservar geometria, página/imagem e ordem de leitura; texto simples não é resposta equivalente |
| Imagem | [FLUX.2 Klein](https://build.nvidia.com/black-forest-labs/flux_2-klein-4b) expõe geração/edição, imagem de entrada para edição, proporção, steps e seed | ImageProfile e artefatos de saída; não aplicar effort de LLM por analogia |

Os números de embedding são declarações do model card e não resultado de teste na nossa conta. Dimensões reduzidas e variantes só entram como ofertas após verificação específica. Nomes de modelos são exemplos observados, não uma seleção de providers já contratados.

## Gaps revelados no contrato atual

1. Um único binding por agente não descreve um agente que usa linguagem, TTS e serviços de recuperação. Solução: modelo primário mantido e bindings por finalidade; embeddings de uma coleção ficam num contrato de índice/serviço.
2. Janela de tokens e G1–G4 não classificam adequadamente áudio, vetores ou OCR. Solução: taskKinds e limites tipados; grupos existentes permanecem para linguagem/raciocínio.
3. Payload/resultado de chat não representa áudio binário, vetores, documentos ou jobs. Solução: operações discriminadas, ArtifactRef e envelopes próprios de resultado.
4. Custo por token não cobre caracteres, segundos, páginas, imagens, itens de lote ou computação própria. Solução: unidades versionadas e medidores independentes.
5. Fallback entre contas do mesmo modelo pode quebrar espaço vetorial, voz, timestamps ou estado de sessão. Solução: contrato de continuidade e compatibilidade por finalidade.
6. Imports/labels não comprovam prontidão. A página antiga de rerank sem conteúdo útil é evidência concreta de drift: catálogo precisa detectar remoção, versão e campos desconhecidos.

Esses itens são inferências de arquitetura aplicadas ao anxionOS, não defeitos atribuídos à NVIDIA. Estão tratados no [contrato de inferência multimodal](../notes/anxionos-multimodal-inference.md).

## Reaproveitamento do 9Router

A [extração](./9router-extracao-connections.md) já localiza embeddingsCore e handlers de imagem/vídeo/TTS/STT. Usar esses caminhos como candidatos de adapter/fixture. A existência de handlers não comprova suporte a gRPC NVIDIA, dimensões/prefixos de embedding, interoperabilidade de áudio ou estados assíncronos; esses contratos precisam ser portados e testados.

Preservar identity/grants/pools/ledger do Connections e criar extensões por operação. Evitar criar outro login, outro cofre ou outro sistema de quota para cada modalidade. Também evitar chamar todo modelo por chat/completions e perder semântica.

## Prioridade e fronteiras

Schema, catálogo e API tipada entram desde C1. TTS e embeddings são escopo confirmado do módulo, não apenas possibilidade distante. Proposta de entrega: embeddings + reranking para Knowledge; TTS + STT para interação; OCR/VLM para documentos; geração de mídia, tradução, moderação e modelos especializados por demanda. Cada oferta exige homologação; essa ordem não declara todos os modelos do catálogo implementados.

Knowledge mantém indexação, chunking e reindexação; Agent Runtime compõe etapas e sessões; Connections fornece inferência, acesso, perfil, uso e artefatos. Moderação classifica conteúdo sob sua policy, sem substituir Graph Authorization ou Risk/Execution.

## Limites e questões de integração

O selo de endpoint gratuito não foi interpretado como capacidade ilimitada ou garantia de produção: a página de [reranking](https://build.nvidia.com/nvidia/llama-nemotron-rerank-vl-1b-v2) informa uso de desenvolvimento e throttling. Grants SYSTEM_FREE dependem da publicação administrativa e entitlement; uma chave NVIDIA de usuário continua seguindo OWNER_PRIVATE/PLATFORM.

Não foram auditados todos os modelos, licenças ou APIs do catálogo. Protocolos e capacidades citados são documentados, não homologados. Escolher versões/deployments/vozes/idiomas e custos reais antes de ativar; não garantir português apenas pelo rótulo “multilingual”. Contratos explicitam UNKNOWN quando a informação falta.

## Resultado

O [contrato multimodal](../notes/anxionos-multimodal-inference.md) e o [catálogo](../notes/anxionos-model-catalog.md) passam a organizar operações por finalidade, entrada/saída, limites e protocolo, preservando acesso e modelo predefinido por finalidade. Aceites MM01–MM12 tornam verificáveis as principais falhas de integração.
