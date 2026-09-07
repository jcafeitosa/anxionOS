---
title: 9Router — fontes de catálogo free e cooldown
description: APIs públicas, evidências de gratuidade e reproduções locais em snapshot fixado.
type: external-source
status: draft
cluster: anxionos
source_url: https://github.com/decolua/9router
captured_at: 2026-09-07
---
# 9Router — fontes de catálogo free e cooldown

Captura pública de 2026-09-07. HEAD do repositório novamente conferido: eb712ca821f0ba6bc41043fbd14494c5af5daba5, igual ao [snapshot integral preservado](./9router-eb712ca-source.md). Não foram usadas credenciais nem realizadas inferências upstream.

## Fontes e preservação

| Fonte | Arquivo preservado | SHA-256 |
| --- | --- | --- |
| [OpenRouter Models API](https://openrouter.ai/api/v1/models) | [JSON](./9router-free-openrouter-models-20260907.json) | 2b7ff590419cd89018f3588faca92b50ab8ae1563bc93b8eaf111db5a00d90ce |
| [Kilo Models API](https://api.kilo.ai/api/gateway/models) | [JSON](./9router-free-kilo-models-20260907.json) | 6cb3041e7a24acac3de95749b98b4b8bf07302459afe8fc5fe95c4477dc9c4cd |
| [OpenRouter Limits](https://openrouter.ai/docs/api_reference/limits) | [HTML](./9router-free-openrouter-limits-20260907.html) | 21f27b1d00a4d0bd067bc088978c27d02f63db8c3a163df6a68a2868da02b00a |
| [OpenRouter Free Variant](https://openrouter.ai/docs/guides/routing/model-variants/free) | [HTML](./9router-free-openrouter-free-20260907.html) | b6f1136b4d4002f6a87bc7e83a3744500ed89766157c522eddfd9969b31dfc1a |

[Manifesto da captura](./9router-free-capture-20260907.json) registra URLs resolvidas, bytes, hashes e contagens. A página Free Variant retornou navegação sem conteúdo substantivo no leitor web; não foi usada como prova de regras. Evidência positiva vem dos JSONs e da página Limits. Números abaixo são fotografia dessa resposta, não promessa de catálogo permanente ou inventário de todas as modalidades.

## Observações verificáveis

OpenRouter: 428 entradas; 16 IDs terminados em :free. Duas dessas variantes são omitidas pelo filtro atual do 9Router: liquid/lfm-2.5-2.6b:free (65.536 tokens) e nvidia/nemotron-3.5-content-safety:free (128.000). Ambas declaram prompt/completion zero. O filtro retorna 17 entradas totais: contagem diferente da lista de sufixos, pois usa preço e contexto, não a tag.

Kilo: 369 entradas; 15 IDs :free e 17 entradas isFree=true. O mesmo filtro retorna 16 entradas; omite as duas acima e stepfun/step-3.7-flash:free, cujo preço zero vem serializado como 0.000000000000. Sufixo, flag e preço não são campos intercambiáveis.

Limits distingue crédito e rate limit, admite limitações para variantes gratuitas e sinais de reset em erros. Afirma que novas contas/keys não ampliam necessariamente a capacidade governada globalmente. Isso fundamenta quota groups compartilhados; não será copiada uma tabela numérica estática do registry para o produto.

## Reprodução local

[Harness](./9router-free-free-cooldown-probes-20260907.mjs) e [resultado](./9router-free-free-cooldown-probes-20260907.json): sete observações com assertivas sobre os comportamentos atuais de FILTERS e getEarliestModelLockUntil. Dados sintéticos, importação direta do filtro; helper de prazo com constantes não usadas substituídas. Não é suíte oficial nem patch: comprova exclusão por janela/formato, perda de declaração sem preço, ignorância de taxa extra no filtro, controle positivo e prazo de cooldown não específico da rota.

A [revisão funcional](../research/9router-functional-coverage.md) distingue o inventário abrangente da leitura aprofundada. O [contrato free/cooldown](../notes/anxionos-free-cooldown.md) registra correções de desenho; implementação permanece pendente.
