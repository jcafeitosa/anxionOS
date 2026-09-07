---
title: Connections — catálogo e classificação dos modelos
description: Quatro grupos de referência, capacidades verificadas e faixas de contexto por oferta.
type: planning-note
status: draft
cluster: anxionos
sources:
  - id: requirement
    resource: ./anxionos-brainstorm.md
  - id: connections
    resource: ./anxionos-connections.md
  - id: inference
    resource: ./anxionos-inference-config.md
---
# Connections — catálogo e classificação dos modelos

Contrato de planejamento v0.1, parte de [Connections](./anxionos-connections.md) e do [contrato operacional](./anxionos-connections-operational-contract.md). O [brainstorm](./anxionos-brainstorm.md) preserva o requisito literal. Grupos solicitados são classificação de produto; não são comprovação de equivalência entre modelos ou capacidades atuais de fornecedores.

## Resultado esperado e quatro grupos

O módulo identifica modelos/versões/ofertas, coleta características, normaliza evidências, cataloga por capacidades e janela de contexto e atribui um grupo de desempenho de forma explicável. O catálogo admite várias contas e métodos de acesso por modelo sem fundir suas capacidades.

| Grupo estável | Referências informadas pelo usuário, preservadas literalmente | Nome de apresentação proposto |
| --- | --- | --- |
| G1 | gpt-astra / fable | Raciocínio de ponta |
| G2 | opus / gpt-sol / deepseek 4 pro / lua | Avançados |
| G3 | sonnet 5 / gpt-lunna / deepseek 4 flash | Equilibrados |
| G4 | gpt-5.4-mini / haiku | Leves e rápidos |

A associação das referências aos quatro grupos foi definida pelo usuário. Os nomes de apresentação são propostas editáveis; IDs G1–G4 são estáveis. Não inferir provider, snapshot, tamanho de janela, quantidade de parâmetros ou preço dessas strings. Em especial, “lua” e “gpt-lunna” permanecem distintos até resolução explícita de identidade; não corrigir grafia nem associar automaticamente a outro modelo.

Cada referência inicia como ModelReference(label, targetGroupId, canonicalModelId opcional, resolutionStatus). Um nome não resolvido pode aparecer no planejamento, mas não cria ModelOffering executável. Resolver por ID oficial verificado e tabela de aliases versionada, com estado UNRESOLVED/RESOLVED/AMBIGUOUS. Família como “opus” pode abranger várias versões; definir associação por versão vigente e manter histórico.

## Famílias e operações antes dos grupos

O [contrato multimodal](./anxionos-multimodal-inference.md) amplia o catálogo a TTS, STT, embeddings, reranking, OCR, visão, imagem/vídeo e operações especializadas. O primeiro filtro é taskKind e schema de entrada/saída. G1–G4 classificam linguagem/raciocínio; para operações não LLM, llmGroupApplicability = NOT_APPLICABLE. UNCLASSIFIED permanece reservado a modelos de linguagem ainda sem classificação. Um modelo pode servir mais de uma operação, cada qual com limites e perfil próprios.

Campos tipados por operação: embeddings têm dimensão/espaço/normalização; TTS tem idiomas/vozes/codec/taxa de amostragem; STT tem duração/idiomas/segmentação; reranker tem pares/score; visão e mídia têm resolução/páginas/frames/bytes. Janela em tokens é registrada quando aplicável, inclusive à entrada de embeddings, sem confundir dimensão vetorial ou quantidade de parâmetros com contexto. Dashboard inicia por família e mostra métricas comparáveis dentro dela; não aplica G1–G4 a um sintetizador de voz.

## Dimensões independentes

1. **Grupo G1–G4:** classe de desempenho pretendida, com referências e critérios versionados. Não é ranking universal em toda tarefa.
2. **Janela:** capacidade de contexto/input/output, em tokens exatos e com regra de contabilização.
3. **Capacidades:** ferramentas, estrutura, reasoning, modalidades, streaming, batch, cache e continuidade.
4. **Adequação por tarefa:** evidência de qualidade para classificação, extração, código/tools, pesquisa, análise e multimodal.
5. **Oferta e operação:** assinatura/API/local/pública, acesso próprio/SYSTEM_FREE, região, preço, quota, disponibilidade e latência.

Um G4 pode ter contexto maior que um G1; uma janela maior não promove o grupo. Número de parâmetros e custo não substituem avaliação de capacidade. “Tamanho” neste requisito significa janela; contagem de parâmetros, quando pública/verificada, é metadado adicional e pode permanecer desconhecida.

O grupo pertence a uma classificação versionada do modelo/snapshot; limites e capacidades operacionais pertencem também à oferta e ao adapter. Mesmo modelo em API e assinatura pode ter restrições distintas. Não combinar o maior contexto de uma conta com tools disponíveis somente em outra.

## Lista pública de modelos free

O [contrato free/cooldown](./anxionos-free-cooldown.md) torna PublicFreeCatalog uma vista de FreeDeclaration e releases por fonte. Preservar tags oficiais, isFree, variante :free e declaração pública com URL/data/schema; categoria do provider ou nome contendo free não certifica a oferta. Não excluir modelos de janela curta ou desconhecida. Preço decimal exato e componentes aplicáveis determinam condições econômicas, separadas da declaração.

Catálogo mostra free declarado, disponível para mim e cooldown como filtros independentes. Oferta privada de outro titular não fica acessível por ser free. Sync usa fonte registrada, evidência/ETag/freshness/diff; erro não é catálogo vazio. Mesmo modelo/variante mantém histórico ao mudar preço/tag/estado. CF01–CF16 complementam MC01–MC10.

## Identificação e evidência

Fluxo: descobrir modelos acessíveis → resolver identidade → coletar evidências → normalizar por campo/oferta → verificar compatibilidade → classificar → publicar versão → reavaliar bindings afetados.

Origens: catálogo/documentação oficial preservada; discovery API quando disponível; manifesto do adapter; resposta efetiva do provider; testes de contrato com fixtures; avaliações controladas. Inferências por prefixo de nome e heurísticas importadas são sugestões de baixa confiança. Uma lista de modelos acessíveis não certifica todos os seus parâmetros.

Cada fato registra sourceRef, observedAt, validUntil/reviewAt, adapterVersion, modelVersion, account/accessKind scope, evidenceType, confidence e status. Status por capability: VERIFIED, DECLARED, INFERRED, UNKNOWN, UNSUPPORTED ou CONFLICTING. Campo desconhecido não é false nem zero.

Fonte declarada não prova comportamento; um teste de contexto que passou prova a entrada testada, não o máximo absoluto. Divergência entre documentação e acesso real reduz elegibilidade para o uso afetado, preserva ambas as evidências e abre revisão. Dados privados de uma conta não aparecem no catálogo público.

## Janela de contexto e limites efetivos

ContextProfileVersion guarda, sem conflar:

- maxContextTokens: limite total conforme o protocolo.
- maxInputTokens e maxOutputTokens: limites independentes quando conhecidos.
- reasoningAccounting: se reasoning integra saída/contexto e de que forma; desconhecido é explícito.
- contextAccountingRuleId, tokenizerId/version ou método/erro da estimativa.
- limites por modalidade: imagem, áudio, vídeo, arquivos e payload.
- declared, verifiedLowerBound e effective: valores declarados, evidência testada e limites aplicáveis à rota.
- accessKind, endpoint, plan/entitlement, região e vigência que condicionam o limite.

Buckets iniciais propostos para filtros, independentes de G1–G4:

| Faixa | maxContextTokens normalizado |
| --- | --- |
| W1 | Maior que 0 e até 32.000 |
| W2 | Maior que 32.000 e até 128.000 |
| W3 | Maior que 128.000 e até 256.000 |
| W4 | Maior que 256.000 e até 1.000.000 |
| W5 | Maior que 1.000.000 |
| UNKNOWN | Máximo não conhecido ou não confiável para classificação |

Valores de limite devem ser inteiros positivos ou null quando desconhecidos; zero, negativos, frações e valores não finitos são dados inválidos, não uma faixa válida. São limites de taxonomia configuráveis, com K=1.000 e M=1.000.000 para esses rótulos. Preservar sempre o número inteiro original; se a fonte usa outra convenção, normalizar a partir do valor documentado, sem reinterpretar abreviações por palpite. UI mostra, por exemplo, o número exato ao lado da faixa.

Há duas visões: faixa declarada do modelo e faixa efetiva da oferta. A efetiva considera o menor limite aplicável entre provider, plano, endpoint, gateway e política do binding; não afirmar equivalência de métricas quando total/input/output têm semânticas distintas.

Para contabilidade combinada, cabe na rota se:
input estimado + system/tools/histórico/arquivos contabilizados + saída máxima reservada + reasoning adicional não já incluído + margem de estimativa ≤ contexto efetivo,
e os limites independentes de input/output também passam. Evitar contar duas vezes reasoning ou overhead já incluído na tokenização. Outros protocolos usam seu contextAccountingRuleId.

Calcular novamente a cada turno: contexto cresce com ferramentas e histórico. Compressão não aumenta o contexto do modelo; é transformação autorizada e auditável. Se faltam dados para provar que cabe, declarar contexto indeterminado/incompatível conforme política, sem elevar limites ou descartar conteúdo silenciosamente.

## Classificação de grupo e adequação

ModelGroupPolicyVersion define G1–G4, referências resolvidas, regras de associação, rubricas/datasets por tarefa e requisitos de evidência. ModelGroupAssignment guarda modelo/versão, grupo, método USER_REFERENCE ou EVALUATED, policyVersion, evidenceRefs, rationale, confidence e validFrom/Until.

- Referência do usuário com identidade resolvida recebe o grupo solicitado, com método USER_REFERENCE. Isso não fabrica um benchmark.
- Modelo novo sem referência passa por critérios/eval de tarefa. Sem evidência suficiente, fica UNCLASSIFIED; não forçar um dos quatro grupos por preço, tamanho da janela, marketing ou sufixos pro/mini.
- Avaliação compara modelos com datasets/rubricas versionados e perfis declarados. Medir qualidade, aderência a schemas/tools, erro, custo e latência separadamente; incluir incerteza/amostragem e não confiar em autoconfiança declarada pelo modelo.
- Um resultado especializado pode recomendar o modelo para código e não para pesquisa. TaskSuitabilityProfileVersion preserva essa diferença.
- Mudança de modelo, adapter, contexto, perfil, entitlement ou evidência invalida somente as conclusões dependentes e gera reavaliação/diff.

Modo automático confirmado pelo requisito de atualização imediata: AUTO_VERIFIED publica enriquecimento/classificação quando identidade, evidências e regras determinísticas da política forem satisfeitas. Conflitos ou baixa confiança ficam em revisão; não exigir intervenção humana para toda descoberta. Publicação de dados não concede grant nem modifica bindings. Avaliação por inferência real requer orçamento e nunca acontece implicitamente ao abrir o dashboard.

Não há limiares numéricos de qualidade escolhidos ainda. Antes de ativar classificação EVALUATED automática, configurar dataset/rubrica e thresholds por tarefa; enquanto ausentes, preservar associações USER_REFERENCE e UNCLASSIFIED para os demais.

## Atualização e ativação automáticas — requisito vigente

O [contrato de catálogo automático](./anxionos-catalog-automation.md) torna obrigatória a reação a mudanças de cada provider: eventos quando suportados, polling condicional e reconciliação. Modelo novo é analisado, colocado em família/operação/faixa de contexto/gratuidade/grupo com evidência e publicado automaticamente. Adapter conhecido e requisitos satisfeitos tornam a oferta consumível de imediato para quem já tem acesso, sem cadastro ou aprovação individual. Falta de grupo qualitativo mantém UNCLASSIFIED sem impedir uso básico compatível; avaliação complementar ocorre em background.

Protocolo não suportado ou dado obrigatório conflitante gera pendência localizada visível, não capacidade inventada. Registro de timestamps distingue detecção de publicação; fontes sem eventos não oferecem detecção instantânea. Autoativação não altera bindings, grants ou índices. Modelos/ofertas caros recebem restrição PLANNING/SPECIAL por política econômica, independente do grupo de qualidade. CA01–CA12 complementam MC01–MC10.

## Integração com agentes e router

O catálogo permite filtrar e sugerir configuração por grupo. Cada agente continua com modelo predefinido: escolher G2 na interface filtra o catálogo; o binding salva um modelo concreto e suas versões/políticas. Pertencer ao mesmo grupo não torna modelos intercambiáveis.

Sequência por request: binding → requisitos/perfil da tarefa → ofertas do mesmo modelo → grants e origem → capacidade/contexto efetivos → quota/budget/saúde → balanceamento de conta → compilação e dispatch. O [contrato de effort/thinking](./anxionos-inference-config.md) continua obrigatório. Grupo G1 não significa effort máximo; perfil de reasoning é outra configuração.

AGENCY usa contas próprias ou SYSTEM_FREE; PLATFORM mantém seus grants/rotação. Gratuidade, grupo e janela não ampliam autoridade. Uma classificação automática pode gerar recomendação de revisão do binding; não muda o modelo durante um run nem habilita fallback entre modelos.

## Entidades, consultas e interfaces

| Entidade | Papel |
| --- | --- |
| ModelReference / ModelAliasVersion | Referência literal e resolução para identidade canônica |
| ModelGroupPolicyVersion / ModelGroupAssignment | Taxonomia, associação, método e evidência |
| ContextProfileVersion / ContextBucketPolicyVersion | Limites, contabilidade, intervalos e vigência |
| ModelCapabilityEvidence | Fato por capability/modelo/oferta e sua proveniência |
| TaskSuitabilityProfileVersion / CatalogRelease | Adequação por tarefa e publicação/diff auditável |

Grafo projeta ModelVersion CLASSIFIED_AS GroupAssignment → Group; ModelOffering HAS_CONTEXT_PROFILE ContextProfile; Assignment SUPPORTED_BY Evidence. O schema de catálogo é transacional/versionado; grafo não calcula uma capacidade nova por heurística.

Consultas/API: discoverModels, resolveModelIdentity, getModelCharacteristics, classifyModel, listModelsByGroup, listOfferingsByContext, compareModels, explainClassification, previewTaskCompatibility e publishCatalogRelease. Todos os filtros de oferta respeitam o consumidor; endpoints privados e contas alheias não são retornados por comparação global.

Dashboard de linguagem: agrupamento G1–G4 + UNCLASSIFIED, filtros de janela/capacidades/acesso, tabela comparativa e ficha por modelo. Ficha mostra nome original/canônico, versão/alias, grupo/motivo, contexto declarado/efetivo por oferta, input/output, modalidades/tools/reasoning, custo/latência observados, origem/data da informação e compatibilidade com agentes. Faixas desconhecidas e fatos conflitantes ficam visíveis. Admin gerencia políticas/referências/releases; Owner vê catálogo e ofertas autorizadas.

## Entrega e aceitação

Dentro de E06: C1 define entidades/taxonomia/contabilidade; C2 conecta discovery/entitlements; C3 consulta contexto antes do dispatch; C4 entrega catálogo/comparação/diagnóstico; C5 amplia evidências e avaliação por adapter. Não criar outro roadmap independente.

| Caso | Resultado verificável |
| --- | --- |
| MC01 Referências | As quatro listas originais são preservadas; lua e gpt-lunna não se fundem automaticamente |
| MC02 Identidade | Nome desconhecido não vira provider/modelo executável; ambiguidade tem estado |
| MC03 Limites | Testar 32.000/32.001, 128.000/128.001, 256.000/256.001 e 1.000.000/1.000.001; desconhecido tem bucket próprio |
| MC04 Dimensões | G4 com contexto maior que G1 mantém grupo; preço/param count não promove automaticamente |
| MC05 Ofertas | API/assinatura com limites diferentes permanecem distintas; não montar uma oferta imaginária com máximos de cada conta |
| MC06 Contexto real | Entrada que cabe sozinha pode falhar com histórico/tools/saída; reasoning incluído não é contado duas vezes |
| MC07 Evidência | Teste abaixo do máximo não certifica máximo; conflito remove elegibilidade afetada e registra origem |
| MC08 Automação | Política satisfeita publica classificação sem mudar binding; falta de threshold impede promoção EVALUATED, não as referências do usuário |
| MC09 Acesso | Grupo/janela não concede uso ou visibilidade de conta de outro usuário; SYSTEM_FREE mantém conta interna oculta |
| MC10 Continuidade | Atualizar grupo/contexto gera diff e revalida próximas tentativas; não troca modelo nem eleva teto durante run |

Esta rodada define o catálogo e preserva os grupos. Não afirma que os rótulos citados sejam IDs comerciais atuais, nem preenche janelas/capacidades reais sem verificação. Implementação, resolução das referências, descoberta/homologação e benchmarks permanecem etapas executáveis do plano.
