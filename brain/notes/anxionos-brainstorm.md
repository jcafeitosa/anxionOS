---
title: anxionOS — brainstorm do projeto completo
description: Visão integral, escolhas de produto e roteiro de decisões do Graph-Native Investment OS.
type: planning-note
status: draft
cluster: anxionos
---
# anxionOS — brainstorm do projeto completo

## Orientação do usuário nesta sessão

> voce deve analisar toda a conversa e vamos iniciar brainstorm, prd e planejamento do projeto completo end to end;

Registro direto de 7 de setembro de 2026. O usuário reapresentou o grafo como modelo operacional principal, o ciclo institucional completo e o módulo Connections. Este trabalho cobre o produto completo; o primeiro incremento de entrega será uma parte do roadmap.

## Enquadramento já fornecido

**Beneficiários:** administradores das agências, operadores humanos, administradores da plataforma e parceiros, além dos agentes como consumidores das APIs.

**Mudança observável pretendida:** criar uma agência, organizar agentes, conectar inteligência e capital, estabelecer mandato, operar sob políticas e reconstruir decisões e resultados pelo grafo institucional.

**Decisão orientadora:** organizar o produto e seus módulos sobre um grafo institucional comum, com autoridade, contexto e rastreabilidade compartilhados. A orientação do usuário já confirma essa direção; as escolhas de lançamento permanecem abertas.

## Definição de produto confirmada — assinatura, Owner e capital próprio

Registro direto da resposta do usuário em 7 de setembro de 2026:

> a ideia e que o usuario assine a plataforma e no onboarding ele da um nome para sua empresa, cada empresa ja deve vim com os principais agentes Level C, como o CEO e o usuario sera sempre o Owner. cada usuario deve operar seu proprio capital

Definido pelo usuário:

- O cliente assina a plataforma.
- No onboarding, dá um nome à sua empresa.
- A empresa já nasce com os principais agentes C-level; CEO é explicitamente obrigatório.
- O usuário humano permanece sempre como Owner.
- Cada usuário opera seu próprio capital.

Nomenclatura de trabalho: **Empresa** na experiência do usuário corresponde à **Agency** do modelo institucional. A criação dessa unidade no produto não depende de o usuário montar manualmente o organograma. O número de empresas por assinatura ainda será definido.

Consequências para os contratos: propriedade da empresa e do capital permanece com o usuário; agentes recebem autoridade delegada, nunca o papel de Owner. O produto não oferece gestão de capital de outros usuários como parte desse modelo. Convites para colaboração, se oferecidos, não mudam esses princípios.

A assinatura foi escolhida como base comercial. Preço, franquias, consumo adicional, teste gratuito e empresas por plano permanecem abertos. Titularidade e identidade técnica de contas serão detalhadas sem reabrir a decisão de capital próprio.

### Equipe C-level proposta para a próxima rodada

| Agente | Responsabilidade proposta | Limite |
| --- | --- | --- |
| CEO | Coordenar missão, objetivos, equipe e trabalho | Responde ao Owner; não altera sua propriedade nem expande a própria autoridade |
| CIO | Coordenar pesquisa, estratégias e alocação proposta | Opera dentro do mandato |
| CRO | Avaliar risco, limites e exceções | Autoridade de risco independente das metas de investimento |
| COO | Coordenar execução e operação | Efeitos passam pelos contratos de risco e execução |
| CFO | Acompanhar capital, custos, contabilidade e reconciliação | Não confundir billing/IA com capital para investimento |
| CCO | Acompanhar políticas, aprovações e evidências | Não substitui validações determinísticas ou obrigações externas |

A presença de C-levels é confirmada; a lista completa e a divisão acima são uma proposta baseada no organograma da [conversa original](../external-sources/plataforma-investimentos-autonoma-chatgpt.md). CEO não implica que os demais agentes recebam permissões financeiras irrestritas.

## Mercados da empresa — definição confirmada

Registro direto da orientação do usuário em 7 de setembro de 2026:

> todas as empresas criadas sao empresas que podem operar no mercado de stocks ( bolsas de valores ), no mercado cripto ou os dois juntos, isso deve ser configurado no onboarding do usuario, mais pode ser alterado nas configuracoes do sistema posteriormente

Definido: toda empresa pode escolher **Stocks**, **Cripto** ou **Stocks + Cripto** no onboarding, e alterar essa seleção posteriormente nas configurações da própria empresa.

Interpretação de produto: são mercados habilitados da mesma empresa, não tipos imutáveis de empresa. Trocar a seleção preserva Owner, identidade da empresa, equipe C-level e histórico. Stocks e cripto podem coexistir sob a mesma empresa e governança; contas, instrumentos e conectores de execução continuam identificados por mercado.

Proposta de comportamento: habilitar um mercado torna sua configuração disponível; operar depende também de conta/conector, mandato, risco e autoridade. Retirar um mercado requer um tratamento explícito de estratégias, ordens e posições existentes, sem apagar histórico. A política exata dessa transição permanece em Q13.

## Connections — orientação de extração e modelo predefinido

Registro direto do pedido do usuário:

> vamos trabalhar no modulo de gerenciamento  e roteamento de llm ( assinaturas e apis ) vamos extrair tudo do https://github.com/decolua/9router para este modulo, todos os nossos agentes usaram um modelo pre-definido e o modulo fara os roteamentos

Definições: Connections gerencia acessos a LLM por assinaturas e APIs; cada agente recebe um modelo predefinido; o módulo executa o roteamento. A [extração técnica](../research/9router-extracao-connections.md) amplia o README já preservado para inventário de código e contratos. Assinatura de acesso ao provider de IA é distinta da assinatura do usuário no anxionOS. Regra de troca de modelo por fallback permanece em discussão; na ausência de definição, manter o modelo configurado ao selecionar conexões.

## Connections — onboarding e compartilhamento por modalidade de acesso

Registro direto do usuário:

> cada usuario no onboarding deve configurar seus providers e assinaturas e eles devem ser configurados no modulo para ser usado por todos os agentes quando tiverem modelos free e exclusivamente para o usuario e para a propria plataforma quando for uma api e ou assinatura paga

Registro histórico, posteriormente atualizado: o onboarding de providers permanece confirmado, mas a publicação gratuita entre usuários foi substituída pela regra vigente abaixo — usuário/AGENCY usa somente contas próprias; PLATFORM faz rotação balanceada entre contas de todos os titulares.

Contrato proposto: propriedade da conta e da credencial permanece com o titular; compartilhamento ocorre por oferta e grant de consumo. Gratuidade é verificada na oferta e no entitlement, não deduzida do nome do modelo. Franquia de assinatura paga, créditos pré-pagos e cobrança automática após quota não são tratados como acesso gratuito global. A seleção continua limitada ao modelo predefinido do agente.

Q05 foi posteriormente resolvida: agentes próprios da plataforma podem usar modelos pagos e gratuitos de todos os usuários, inclusive em tarefas internas da plataforma. Essa definição substitui a hipótese anterior de restringir o consumo pago a tarefas para o titular. Limites quantitativos e prioridades de alocação permanecem a especificar.

## Connections — visibilidade dos dashboards

Registro direto do usuário:

> no seu dashboard os usuarios so devem ser e ter acesso a suas contas configuradas e todas as informacoes disponibilizadas delas, porem no dashboard do administrador vamos fazer todas as contas de todos usuarios

Confirmado: o dashboard do usuário lista apenas contas configuradas por ele e apresenta suas informações disponíveis. O dashboard do administrador da plataforma lista todas as contas de todos os usuários, identificadas por titular e empresa, com visão consolidada e detalhada.

Permissão de consumir uma oferta gratuita compartilhada não concede permissão de visualizar ou administrar a conta contribuinte. Na regra vigente, usuário/AGENCY consome inferência gratuita ou paga apenas em suas próprias contas; o acesso global é exclusivo dos agentes PLATFORM. A leitura administrativa global permanece separada do consumo de inferência. Q05 foi resolvida na definição seguinte, autorizando os agentes próprios da plataforma a consumir ofertas pagas e gratuitas de todos os usuários.

## Connections — agentes da plataforma e configuração de inferência

Registro direto do usuário:

> a plataforma pode usar os modelos pagos e gratuitos de todos os usuarios para seus agentes da plataforma, o modulo deve ter um gerenciamento completo de effort, thinking e outros

Confirmado: agentes próprios da plataforma podem consumir ofertas pagas e gratuitas de todos os usuários. Isso inclui atividades internas da plataforma e resolve Q05. Agentes das empresas continuam com modelos predefinidos e, pela definição mais recente, acessos gratuitos/pagos exclusivamente do próprio titular. Agentes da plataforma também possuem modelo predefinido; o router escolhe uma oferta elegível desse modelo entre as contas disponíveis.

Connections gerencia effort, thinking e os demais parâmetros de inferência. O [contrato de configuração](./anxionos-inference-config.md) detalha perfis, capacidades, precedência, tradução, limites, interfaces e testes. Não há mudança na visibilidade dos dashboards: usuário vê suas contas; administrador vê todas.

## Definição confirmada — agente da plataforma

Registro direto do usuário:

> lembrando que quando falo agentes da plataforma, estou falando dos agentes configurados pelos administradores e que nao sao agentes de usuarios

Agentes da plataforma são configurados e gerenciados pelos administradores da plataforma, pertencem ao escopo PLATFORM e não são agentes de usuários. Os agentes das empresas, incluindo CEO e demais C-levels provisionados no onboarding, pertencem ao escopo AGENCY do respectivo usuário. Um administrador editar ou prestar suporte a um agente de usuário não altera essa classificação.

Essa distinção determina quais agentes podem usar ofertas pagas de todos os titulares. Configurar modelo, effort ou thinking de um agente de usuário pelo painel administrativo não o torna agente da plataforma.

## Regra vigente — plataforma balanceada, usuário nas próprias contas

Registro direto do usuário:

> os agentes da plataforma devem usar as contas dos usuarios de forma balanceada, cada agente/requisicao deve usar uma conta diferente e o usuario usa sempre a sua

Esta definição prevalece sobre o compartilhamento gratuito entre usuários descrito nas etapas anteriores: usuário e agentes AGENCY usam exclusivamente contas do próprio titular, gratuitas ou pagas. Somente agentes próprios PLATFORM, configurados pelos administradores, participam do roteamento global pelas contas dos usuários.

A plataforma alterna contas por requisição, sem vínculo permanente de um agente a uma conta. Contrato proposto: round-robin coordenado entre agentes e workers, agrupado por elegibilidade do modelo/perfil, sem repetir a última conta enquanto houver alternativa elegível. Após uma rodada, as contas podem ser usadas novamente. Balancear requisições não promete igualdade de tokens/custo.

Pendente apenas a exceção quando existe uma única conta elegível: pergunta enviada ao usuário. Até definição, não pressupor permissão de repetir a única conta; aguardar alternativa dentro do deadline. Percentuais de capacidade titular/plataforma e limites numéricos continuam abertos.

## Múltiplas contas por provider e distribuição por tarefa

Registro direto do usuário:

> o usuario pode adicionar varias contas ( assinatura e api ) para o mesmo provider o modelo deve gerenciar de uma forma sem conflito, usando um balanceamento entre suas proprias contas, gerenciando as tarefas para cada provider conforme sua complexcidade ou tipo de tarefa

Confirmado: cada titular pode cadastrar múltiplas contas de assinatura e API no mesmo provider. O roteamento do usuário balanceia entre suas contas elegíveis; contas, credenciais, configurações e limites permanecem separados. Tipo e complexidade da tarefa participam da seleção de provider/oferta, perfil e capacidade.

Regra já confirmada permanece: usuário/AGENCY não usa contas de terceiros; agentes próprios PLATFORM mantêm rotação global balanceada. Duas keys da mesma conta upstream não representam duas capacidades independentes.

Foi solicitado esclarecer se tipo/complexidade também pode selecionar modelos previamente autorizados por tarefa. Até resposta, manter o modelo predefinido do agente e selecionar somente providers/ofertas compatíveis, com perfis autorizados. Classificação não concede autoridade nem permite trocar modelo silenciosamente.

## Catálogo gratuito do sistema e revisão dos gaps

Fonte direta do usuário:

> como cada agente do usuarios conseguem usar os modelos das suas contas ( assinatura e api ) cadastradas e os modelos gratuitos do sistema

> vamos analisar o modelo e o 9router e vamos identificar os gaps, erros e melhorias e resolver tudo

A revisão incorpora duas origens para AGENCY: contas próprias e SYSTEM_FREE. Interpretação de trabalho: gratuitos do sistema são ofertas administradas/publicadas pela plataforma, não contas particulares de outros usuários. Os registros anteriores de “somente contas próprias” continuam válidos para contas de usuários e são ampliados por esta origem separada. PLATFORM mantém o direito confirmado de consumo das contas dos usuários e sua rotação.

O [contrato operacional v1](./anxionos-connections-operational-contract.md) define defaults técnicos: OWN_FIRST quando ambas as origens estão permitidas; SAME_MODEL_ONLY; STRICT; SINGLE_ACCOUNT_WAIT; limites explícitos para consumo compartilhado. Valores comerciais e providers iniciais não foram inventados. A [revisão com evidências](../research/9router-gaps-validacao.md) registra 12 achados, oito reproduções e patch candidato local para bloqueio de conta. Implementação integrada e homologação continuam pendentes.

## Classificação e catálogo de modelos — quatro grupos

Requisito literal do usuário:

> o modulo precisa analisar as caracteristicas e capacidades, identificar, classificar, catalogar os modelos por tamanho de janela, precisamos agrupar modelos padrao gpt-astra/fable, padrao opus/gpt-sol/deepseek 4 pro e lua, padrao sonnet 5/gpt-lunna/deepseek 4 flash, padrao gpt-5.4-mini/haiku

Confirmados quatro grupos de referência: G1 gpt-astra/fable; G2 opus/gpt-sol/deepseek 4 pro/lua; G3 sonnet 5/gpt-lunna/deepseek 4 flash; G4 gpt-5.4-mini/haiku. Grafia preservada; identidade canônica e capacidades reais serão verificadas. “Lua” não foi normalizado para “lunna”.

O [contrato de catálogo](./anxionos-model-catalog.md) separa grupos, faixas de janela, capacidades por oferta e adequação por tarefa. Propõe classificação automática com evidências/políticas versionadas, estado desconhecido e comparação no dashboard. Grupo não altera modelo predefinido nem autoriza fallback. Valores reais de janela, thresholds de avaliação e equivalências não foram inventados.

## Connections — modelos além de LLM

Requisito confirmado pelo usuário em 2026-09-07:

> o modulo deve gerenciar outros tipos de modelos como TTS, embedding e outros analise o https://build.nvidia.com/

Connections passa a gerir inferência por finalidade: linguagem, embeddings, reranking, voz, transcrição, visão/documentos, mídia e extensões especializadas. TTS e embeddings são escopo confirmado. A [pesquisa NVIDIA](../research/nvidia-model-types-connections.md), apoiada em [dez páginas preservadas](../external-sources/nvidia-build-models.md), fundamenta o [contrato multimodal](./anxionos-multimodal-inference.md). Proposta técnica: um modelo principal de raciocínio por agente e bindings fixos por finalidade; embeddings vinculados à coleção de conhecimento. G1–G4 aplicam-se à linguagem/raciocínio; outras famílias têm classificações próprias. Mantêm-se isolamento, grants, contas próprias/SYSTEM_FREE e rotação PLATFORM.

## Connections — extração funcional, cooldown e modelos free

Requisito confirmado em 2026-09-07:

> analise todas as funcionalidades e capacidades do 9router que o modulo precisa extrair, o modulo deve gerenciar os modelo em cooldown, deve gerenciar a lista de modelos free, principalmente modelos publicamente declarados com a tag free

A [matriz de 36 famílias](../research/9router-functional-coverage.md) reconcilia a extração integral, distingue revisão de código de inventário e registra 12 gaps aprofundados. O [contrato de free e cooldown](./anxionos-free-cooldown.md) exige catálogo de declarações públicas com origem/validade, sem piso de janela; disponibilidade por modelo/oferta/conta/grupo de quota; prazos corretos e recuperação coordenada. Modelo em cooldown permanece visível como free quando a declaração continua válida. Tag free não compartilha conta de outro usuário nem autoriza trocar o modelo configurado.

## Connections — catálogo automático e uso restrito de modelos caros

Requisito confirmado em 2026-09-07:

> o modulo deve checar e atualizar a lista de modelos de cada providers assim que detectar uma mudanca na lista e ja analisar o novo modelo e adicionar no local correto e disponibilizar para uso de imediato, modelos caros so devem ser usados em situacoes de planejamento ou especiais

O [contrato de automação do catálogo](./anxionos-catalog-automation.md) define detecção por evento/polling, análise determinística, classificação e publicação/ativação automáticas em adapters compatíveis, sem aprovação manual por modelo. Entrada com dado obrigatório ausente aparece com pendência específica. Modelo novo não substitui binding existente. Uso caro fica limitado a PLANNING ou SPECIAL autorizados no servidor; ROUTINE é bloqueado. Thresholds de custo e situações especiais são políticas configuráveis, distintas de G1–G4 e de gratuidade.

## Base de trabalho

A [conversa preservada](../external-sources/plataforma-investimentos-autonoma-chatgpt.md) contém as mensagens substantivas sobre plataforma, grafo e Connections. A [revisão anterior](../research/analise-planejamento-anxionos.md) fornece questões de consistência, autorização, fallback e rastreabilidade a resolver.

## Mapa dos documentos

| Documento | Pergunta que resolve |
| --- | --- |
| [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | Para quem existe o produto, o que precisa fazer e como reconhecer sucesso? |
| [Modelo do grafo institucional](./anxionos-graph-domain-model.md) | Quais entidades, relações, regras temporais e consultas sustentam o produto? |
| [Connections](./anxionos-connections.md) | Como agentes, serviços e humanos consomem modelos sob políticas? |
| [Planejamento de ponta a ponta](./anxionos-planejamento-end-to-end.md) | Quais frentes, dependências e evidências levam da descoberta à operação? |
| [Revisão inicial](../research/analise-planejamento-anxionos.md) | Quais tensões do desenho anterior precisam ser resolvidas? |

## Leitura da conversa inteira

A conversa evolui em quatro blocos. O trecho novamente enviado pelo usuário reforça os três últimos; o escopo inicial também continua incluído.

| Bloco da fonte | Conteúdo recuperado | Consequência para o planejamento |
| --- | --- | --- |
| Mensagens 3 e 29 | Agências, humanos e agentes, mandatos, estratégias, risco, execução, motores externos, quatro dashboards, parceiros, custos e custódia | O PRD cobre o ciclo comercial e operacional inteiro |
| Mensagens 30 e 33 | Grafo como modelo principal, agência como subgrafo, autoridade, capital, decisão, contexto, temporalidade e eventos | Nenhum módulo institucional será concebido como recurso isolado do grafo |
| Mensagens 34, 39 e 41 | Graph Kernel, três velocidades, Neo4j como candidato, modelos versionados, impacto, digital twin e regras institucionais | Contratos de domínio precedem detalhes de armazenamento; recursos avançados entram no roadmap |
| Mensagens 42 e 53 | Connections, catálogo, providers, contas, endpoints, modelos, roteamento, quotas, custos, segredo e avaliação | Connections é uma frente própria e atende toda a plataforma |

Fonte: [conversa preservada](../external-sources/plataforma-investimentos-autonoma-chatgpt.md). Mensagens sem conteúdo substantivo e ferramentas ocultas não estão disponíveis como evidência.

## Tese de produto para explorar

O anxionOS permitirá que o usuário assine a plataforma, nomeie sua empresa e receba uma equipe inicial de agentes C-level. Como Owner permanente, ele define missão, mandato e limites para operar seu próprio capital; os agentes coordenam pesquisa, decisão, risco, execução, resultado e aprendizado com autoridade delegada.

Proposta de valor: reduzir o trabalho de coordenar ferramentas, decisões e responsabilidades separadas, reunindo a operação numa instituição navegável e governada. A existência e a intensidade dessa dor ainda precisam de entrevistas; a conversa fornece a intenção do fundador, não validação de mercado.

A comparação com uma gestora serve como referência de organização. Marca, promessa comercial e modelo de prestação de serviço serão definidos com o público e a operação pretendida.

## Três abordagens de construção

Todas preservam o grafo como modelo operacional. O que muda é a distribuição da implementação.

| Abordagem | Benefício | Custo | Avaliação inicial |
| --- | --- | --- | --- |
| Núcleo modular próprio e integrações por adaptadores | Contratos comuns de identidade, autorização e eventos desde o início; liberdade para trocar runtimes | Exige construir os contratos e manter adaptadores | Recomendada para a primeira arquitetura do produto completo |
| Federação de plataformas existentes | Pode reutilizar rapidamente experiências e runtimes já disponíveis | Reconciliação de identidades, permissões, custos, estados e versões entre plataformas | Boa opção para provas de integração; comparar custo real de adaptação |
| Serviços independentes por domínio desde o início | Isolamento de implantação e escala por equipe/domínio | Maior operação distribuída, diagnóstico e evolução de contratos | Alternativa se equipe, volume ou isolamento exigirem |

O usuário aceitou a [estrutura modular do backend](./anxionos-backend-structure.md), registrada no [ADR0002](../project-docs/decisions/0002-adopt-modular-backend-layout.md):23 módulos, composition roots e runtimes especializados. Isso não exige um processo por módulo. O grafo institucional permanece o contrato compartilhado; demais escolhas técnicas têm estado de aceite próprio.

## O que aproveitar das referências

| Referência preservada | O que o README descreve | Investigação proposta para o anxionOS |
| --- | --- | --- |
| [OpenBot](../external-sources/openbot-readme.md) | Template de coworkers com ambiente próprio e gateway de ações governadas | Política antes da ação, isolamento do runtime e registro de ferramentas |
| [GoClaw](../external-sources/goclaw-readme.md) | Gateway de agentes em Go, pipeline, memória em camadas e isolamento multi-tenant | Ciclo do agente, sessões, contexto e interfaces de runtime |
| [Paperclip](../external-sources/paperclip-readme.md) | Coordenação de trabalho com organograma, objetivos, budgets e heartbeats | Modelo organizacional e relação entre tarefas, autoridade e custos |
| [9Router](../external-sources/9router-readme.md) | Roteamento de modelos, tradução de formatos, quotas, fallback e múltiplas contas | Adaptadores, registro de capabilities e políticas de fallback |

As descrições acima se originam dos READMEs. Historicamente, a [extração inicial](../research/9router-extracao-connections.md) registrou leitura estática de 39 arquivos. Depois, a [revisão de gaps](../research/9router-gaps-validacao.md) e a [matriz funcional de 36 famílias](../research/9router-functional-coverage.md) acrescentaram reproduções locais e evidências de catálogo/cooldown. Testes isolados upstream não equivalem à suíte do anxionOS; portabilidade e homologação seguem pendentes. A grafia acessível de GoClaw é goclaw; o primeiro pedido continha goclawe. Antes de incorporar código: fixar revisão, verificar licença/dependências e testar o contrato escolhido. Promessas de custo, disponibilidade ou quantidade de modelos não serão metas assumidas do anxionOS.

## Tensões a resolver no brainstorm

1. **Grafo operacional e consistência:** estabelecer proprietário por fato, sem quatro fontes concorrentes para o mesmo estado.
2. **Autonomia e responsabilidade:** distinguir agente que recomenda, autoridade que concede e componente que efetua o efeito.
3. **Organograma e capacidade:** um cargo executivo não concede automaticamente todas as permissões dos subordinados.
4. **Aprendizado e controle:** reputação informa propostas de mudança; não aumenta sozinha autoridade ou limites financeiros.
5. **Grafo visual e trabalho humano:** navegação por relações convive com filas, formulários e tabelas para ações frequentes.
6. **Modularidade e coerência:** instalar um módulo exige declarar capabilities, eventos, dados, dependências e migração; uma pasta não basta.
7. **Metas e desempenho real:** números ilustrativos da conversa não são promessas de retorno, latência ou capacidade.

Esses pontos desenvolvem as diretrizes da [fonte](../external-sources/plataforma-investimentos-autonoma-chatgpt.md) e os achados da [revisão](../research/analise-planejamento-anxionos.md).

## Backlog vivo de decisões

Responsáveis abaixo são papéis propostos, ainda sem pessoas designadas.

| ID | Questão | Quem decide | Evidência para resolver | Momento |
| --- | --- | --- | --- | --- |
| Q01 — resolvida | Usuário assinante, Owner da própria empresa e operador de capital próprio | Usuário/fundador | Resposta literal preservada nesta nota | Diretriz confirmada do produto |
| Q02 — parcialmente resolvida | Stocks, cripto ou ambos configuráveis no onboarding e depois; quais bolsas, países, brokers e exchanges serão integrados primeiro? | Produto/operações | Seleção de integrações concretas e cobertura pretendida | Seleção de parceiros |
| Q03 — parcialmente resolvida | Owner humano único confirmado; quantas empresas por usuário e que colaboração será permitida? | Produto/domínio | Regras de plano e exemplos de convites sem transferir propriedade | Modelo de tenancy |
| Q04 | Quais serviços são oferecidos e quais limites operacionais se aplicam? | Fundador e responsável especializado | Modelo de negócio e análise da operação pretendida | Antes de operação real |
| Q05 — resolvida e atualizada | AGENCY usa contas próprias e ofertas SYSTEM_FREE; PLATFORM alterna de forma balanceada entre contas gratuitas/pagas dos titulares | Usuário/fundador | Regra literal preservada; SINGLE_ACCOUNT_WAIT definido como default técnico, limites quantitativos requerem configuração | Regra vigente de elegibilidade e distribuição |
| Q06 — contrato definido; aceite técnico pendente | Baseline PostgreSQL por agregado/journal/outbox + Neo4j projetado + NATS transporte | Arquitetura | SDD001 e ADR0001; GK01–GK09/P01 comprovam concorrência, revogação e restore | Homologação/implantação |
| Q07 | Neo4j, edição e topologia atendem às consultas e ao orçamento? | Arquitetura/operações | Benchmark com carga declarada e custo/licença verificados | Escolha técnica |
| Q08 — parcialmente resolvida | Extrair todo o 9Router para Connections confirmado; quais adapters serão homologados primeiro? Demais referências continuam abertas | Engenharia | Snapshot eb712ca e matriz preservados; portabilidade e testes por contrato pendentes | Incrementos C1–C6 de Connections |
| Q09 — contrato definido; políticas de ativação pendentes | Autonomia por capability, baseline L1, paper L2 e live mediante grants; promoção/auto-organização por proposta | Produto/risco | Specs003/004, FI03–FI05 e EV01–EV08; configurar limites e blueprint | Habilitação operacional |
| Q10 | Qual equipe, orçamento, capacidade e prazo orientam as entregas? | Fundador/engenharia | Capacidade disponível e estimativas por frente | Cronograma comprometido |
| Q11 — parcialmente resolvida | Assinatura confirmada; quais preços, franquias, empresas por plano e cobranças adicionais? | Produto/comercial | Custos e desenho dos planos | Lançamento comercial |
| Q12 — contrato definido; valores pendentes | DataRetentionPolicy por classe, hold, expurgo de derivados, export e restore com tombstones | Segurança/dados/operações | SDD001/Specs002–004; preencher prazos/regiões e ensaiar recuperação | Antes de dados reais |
| Q13 — contrato proposto definido | ENABLED → DRAINING → DISABLED; bloqueia nova exposição, preserva gestão/reconciliação e não liquida automaticamente | Produto/risco/operações | Spec003/FI10, policy de encerramento e homologação | Configurações de mercados |

Q01/Q05 são regras confirmadas. Q03 tem baseline de titular único/Organization do mesmo Owner e maxCompanies por plano no SDD; configuração comercial permanece aberta. Q06/Q09/Q12/Q13 agora possuem contratos propostos verificáveis. Não confundir documentação concluída com homologação/aceite dos valores de lançamento.

## Análise de expansão de Connections

Pedido do usuário: “analise como podemos expandir este modulo para que ele seja completo”. A [proposta consultiva](../project-docs/proposals/0002-connections-expansao-operacional.md) reúne lacunas, alternativas, 16 frentes e critérios de conclusão. EQ1–EQ8 detalham capacidade, confiança no destino, providers iniciais, fila, consumo comercial, retenção, SLOs e fallback. As recomendações ainda não são decisões confirmadas; Q05 e a distinção AGENCY/PLATFORM permanecem preservadas.

## Contratos concluídos nesta continuação

A instrução “continue ate cobrir 100%” originou o [SDD v1](../project-docs/specs/001-institutional-contract/spec.md), cinco specs, schema/traversals, registro de autoridade e [estrutura de backend aceita](./anxionos-backend-structure.md). A [auditoria atualizada](../research/auditoria-cobertura-conversa.md) mantém a avaliação inicial e a resolução rastreada. Brainstorm/PRD continuam drafts onde há escolhas pendentes; a árvore do backend foi explicitamente aprovada. Próximos gates são configuração comercial/operacional, priorização e execução dos testes especificados, não repetir o levantamento dos mesmos domínios.
