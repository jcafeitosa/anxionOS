---
title: NVIDIA Build — fontes para catálogo multimodal
description: Dez páginas oficiais preservadas sobre catálogo, áudio, vetores, OCR e imagem.
type: external-source
status: draft
cluster: anxionos
source_url: https://build.nvidia.com/
captured_at: 2026-09-07
---
# NVIDIA Build — fontes para catálogo multimodal

Captura pública em 2026-09-07, sem login, credencial ou chamada de inferência. Ponto de partida solicitado: [NVIDIA Build](https://build.nvidia.com/). [Análise](../research/nvidia-model-types-connections.md) e [contrato de modalidades](../notes/anxionos-multimodal-inference.md).

## Preservação e escopo

Os arquivos abaixo preservam bytes HTML recebidos por HTTP, incluindo conteúdo e scripts públicos da página, sem executá-los. Não representam crawl integral do catálogo nem snapshot das APIs autenticadas. Respostas HTTP 200 não provam que uma página ainda contenha model card utilizável. Dados dinâmicos podem mudar após a captura.

| Fonte | Origem | Arquivo bruto | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| catalog | [Página oficial](https://build.nvidia.com/models) | [HTML capturado](./nvidia-catalog-20260907.html) | 468139 | f73b75b5a6cd062ad6c849356728a7f08f3622c2d9354e0ba1d5e4768f022809 |
| tts-api | [Página oficial](https://build.nvidia.com/nvidia/magpie-tts-multilingual/api) | [HTML capturado](./nvidia-tts-api-20260907.html) | 166442 | 69eed7679f9e32c2c43b25ed650b17f02ac4d4f711b990b02b7dc1cdf049f516 |
| tts-modelcard | [Página oficial](https://build.nvidia.com/nvidia/magpie-tts-multilingual/modelcard) | [HTML capturado](./nvidia-tts-modelcard-20260907.html) | 187310 | 11f53665cadcb002b03908f424c3544688f93b89572de2a205e42231dbe36d9a |
| tts-deploy | [Página oficial](https://build.nvidia.com/nvidia/magpie-tts-multilingual/deploy) | [HTML capturado](./nvidia-tts-deploy-20260907.html) | 176459 | 605b611ba866e9746b0fdde2ece68ce6ce19bc71e0e3cd6604654c5230308d23 |
| embedding | [Página oficial](https://build.nvidia.com/nvidia/nemotron-3-embed-1b/modelcard) | [HTML capturado](./nvidia-embedding-20260907.html) | 190340 | fb2f97cb9bbe0001c691eedd55a90014b48f73e556c618bb1bd43d08b8a4237d |
| reranking | [Página oficial](https://build.nvidia.com/nvidia/llama-nemotron-rerank-1b-v2/modelcard) | [HTML capturado](./nvidia-reranking-20260907.html) | 73831 | 846688c615dc706b1f9e1064e0353b74284b8970b9ef137f047711ebb06bf167 |
| asr | [Página oficial](https://build.nvidia.com/nvidia/parakeet-tdt-0_6b-v2/modelcard) | [HTML capturado](./nvidia-asr-20260907.html) | 204657 | c5259a6f860dff46c8fd7a130adafa39525e2a8f5836557ff2c20c9384165454 |
| ocr | [Página oficial](https://build.nvidia.com/nvidia/nemotron-ocr-v2/modelcard) | [HTML capturado](./nvidia-ocr-20260907.html) | 1326385 | c3fa32080c0158e9845b9858532dd80abfea86d940579540d3735c1201fcc5de |
| image | [Página oficial](https://build.nvidia.com/black-forest-labs/flux_2-klein-4b) | [HTML capturado](./nvidia-image-20260907.html) | 164273 | 81d708d66c49953cb73baa158a091c60ba1cdeffc5adf73738f5b2d1fef05b18 |
| reranking-vl | [Página oficial](https://build.nvidia.com/nvidia/llama-nemotron-rerank-vl-1b-v2) | [HTML capturado](./nvidia-reranking-vl-20260907.html) | 3181413 | a940314a406cc0d4c5e423fc6a50a2e3673e25075fc4531e0045e6d618afba2d |

## Notas de integridade

A página antiga de reranking textual retornou estrutura sem model card legível na abertura direta, embora resultados indexados ainda trouxessem texto. Essa fonte está preservada como observação de indisponibilidade; não fundamenta uma oferta habilitada. A página reranking-vl foi verificada separadamente e serve como evidência positiva da categoria.

A API de Magpie e seu model card têm escopos diferentes: transporte/parâmetros de serviço versus arquitetura/formatos do modelo. Não fundir amostragens, vozes ou limites dessas páginas sem verificar a oferta concreta. No ASR, uma página apresenta perfis distintos v2/v3: o título da página não basta para identificar os idiomas do deployment.

Texto e exemplos permanecem propriedade dos respectivos autores. Preservação é referência de pesquisa; não transfere licença de modelo, container ou acesso ao serviço. Nenhum comando publicado nas páginas foi executado.
