---
type: proposal
title: anxionOS — PRD mestre
description: Definir o produto completo sobre um grafo institucional governado.
status: draft
authors:
  - Codex
created: 2026-09-07
tags:
  - proposal
  - prd
  - anxionos
cluster: anxionos
version: "0.1"
sources:
  - id: conversa
    resource: ../../external-sources/plataforma-investimentos-autonoma-chatgpt.md
  - id: sessao
    resource: ../../notes/anxionos-brainstorm.md
---
# anxionOS — PRD mestre

Versão 0.1 · Rascunho de produto completo · Horizonte: concepção, construção, lançamento, operação e evolução.

## Motivation

### Problema e beneficiários

Administradores de agências precisam coordenar pessoas, agentes, modelos, estratégias, contas e decisões com responsabilidades e limites explícitos. Operadores precisam identificar intervenções e investigar resultados. A plataforma precisa administrar tenants e infraestrutura, enquanto parceiros precisam acompanhar sua relação comercial com acesso delimitado.

Essa é a necessidade expressa pelo usuário na [conversa original](../../external-sources/plataforma-investimentos-autonoma-chatgpt.md), reforçada no [enquadramento desta sessão](../../notes/anxionos-brainstorm.md). Ainda não há evidência de entrevistas, volume de usuários, disposição a pagar ou economia de trabalho medida.

**Mudança observável pretendida:** o usuário assina a plataforma, nomeia sua empresa no onboarding e a recebe com os principais agentes C-level, incluindo CEO. Ele permanece como Owner, define mandato e limites, conecta seu próprio capital e acompanha decisões e resultados no grafo institucional. Diretriz confirmada na [resposta do usuário](../../notes/anxionos-brainstorm.md).

**Decisão de produto:** organizar esses fluxos sobre um grafo institucional comum, com módulos especializados e interfaces para os quatro públicos. Essa direção já foi pedida; este PRD propõe os limites, comportamentos e critérios ainda discutíveis.

Sem um contrato comum, o desenho permanece uma coleção de ideias sem forma de testar a jornada inteira. Isso é uma avaliação de planejamento baseada na [revisão anterior](../../research/analise-planejamento-anxionos.md), não uma medição do produto atual.

### Objetivos propostos

| ID | Objetivo | Resultado verificável |
| --- | --- | --- |
| O1 | Entregar uma empresa ao usuário assinante | Empresa nomeada, Owner humano vinculado e equipe C-level provisionada, incluindo CEO |
| O2 | Delegar trabalho com autoridade explícita | Toda ação sensível tem escopo, política e responsável identificáveis |
| O3 | Centralizar acesso à inteligência | Cada agente possui modelo predefinido; Connections troca conexões elegíveis preservando binding, identidade e rastreabilidade |
| O4 | Conduzir o ciclo de investimento | Pesquisa, estratégia, validação, decisão, risco, execução e reconciliação conectados |
| O5 | Operar e investigar | Operador resolve aprovações e incidentes e navega da consequência à evidência |
| O6 | Administrar um produto multi-tenant | Acesso, custos, integrações, suporte e ciclo de vida separados por escopo |
| O7 | Evoluir com controle | Mudanças de estratégia, modelo, skill e autoridade são versionadas e avaliadas |

### Limites deste PRD

O escopo é o produto completo. As etapas do roadmap não removem os recursos posteriores. Não se promete retorno financeiro, autonomia irrestrita ou latência de microssegundos. O PRD não define uma licença regulatória, não presume custódia pela plataforma e não aprova implantação com capital real. Escolhas de implementação serão registradas separadamente; os itens em aberto têm responsáveis e evidências no brainstorm.

## Design

### 1. Princípios de produto

1. O grafo é o modelo operacional institucional e possui identidades estáveis, relações explícitas, escopos e histórico.
2. Humanos e agentes consomem os mesmos contratos de domínio; a apresentação e os controles variam por papel.
3. Agências são escopos isolados dentro de uma instituição conectada. Recursos compartilhados são explicitamente publicados.
4. Agente, versão do agente, modelo e execução de inferência são entidades distintas.
5. Decisões executáveis dependem de mandato, autoridade e risco; a inferência não concede autorização.
6. O histórico permite reconstruir o registro e suas versões. Inferência de causalidade é identificada como tal.
7. Dados de mercado de alta frequência permanecem em armazenamento e processamento especializados, conectados ao grafo por identidade, evidência e eventos relevantes.
8. Interfaces exibem estado confirmado, atraso e falhas quando esses elementos mudam a decisão do usuário.
9. Autonomia é concedida por ação e recurso; reconfiguração e aprendizado obedecem à governança.

Derivação: [mensagens 29, 33, 41 e 53](../../external-sources/plataforma-investimentos-autonoma-chatgpt.md), com os ajustes propostos na [análise](../../research/analise-planejamento-anxionos.md).

### 2. Públicos e direitos

| Público | Trabalho principal | Experiência | Limite proposto |
| --- | --- | --- | --- |
| Administrador da plataforma | Operar o serviço, tenants, providers e todas as contas de todos os usuários | Platform Dashboard com inventário global e detalhe por conta | Acesso operacional global não implica ler segredos ou operar capital dos clientes |
| Owner da empresa | Mandato, equipe, capital próprio, orçamento e autonomia | Company Dashboard e Graph Explorer; Connections mostra apenas suas contas e informações disponíveis | Usuário humano proprietário; não vê nem consome contas de outros usuários; SYSTEM_FREE expõe somente ofertas autorizadas |
| Operador humano | Aprovar, investigar, reconciliar e intervir | Operator Console com filas | Permissões por ação; histórico registra quem aprovou e quem executou |
| Influencer/parceiro | Indicação, campanhas, comissões e pagamentos | Partner Dashboard | Acesso a atribuição comercial e agregados autorizados, sem dados privados de trading |
| Agente/serviço | Executar tarefas por capabilities | API semântica, eventos e contexto | Sem acesso direto ao banco ou expansão autônoma de autoridade |

Q01 está resolvida: o cliente assina a plataforma, é o Owner da empresa e opera seu próprio capital. Empresa é o nome da unidade Agency na experiência do produto. Colaboração e quantidade de empresas por usuário seguem em Q03; não implicam copropriedade, transferência do papel Owner ou operação de capital de outros usuários. Fonte: [definição do usuário](../../notes/anxionos-brainstorm.md).

**Definição de agente da plataforma:** Agentes da plataforma são configurados e gerenciados pelos administradores da plataforma, pertencem ao escopo PLATFORM e não são agentes de usuários. Os agentes das empresas, incluindo CEO e demais C-levels provisionados no onboarding, pertencem ao escopo AGENCY do respectivo usuário. Um administrador editar ou prestar suporte a um agente de usuário não altera essa classificação. O acesso a modelos pagos/gratuitos de todos os titulares aplica-se aos agentes próprios PLATFORM, conforme R08.

### 2.1. Onboarding e empresa pré-configurada

Diretrizes confirmadas nas [respostas do usuário](../../notes/anxionos-brainstorm.md): assinatura → nome da empresa → escolha Stocks, Cripto ou ambos → Owner humano → equipe C-level inicial → operação com capital próprio. A escolha de mercados pode ser alterada posteriormente nas configurações da empresa.

Comportamento proposto para materializar essa experiência:

1. Criar a conta e associar a assinatura/entitlement ao usuário. Preço, checkout, teste gratuito e momento de cobrança serão definidos em Q11.
2. Pedir o nome da empresa e os mercados de atuação: Stocks, Cripto ou Stocks + Cripto. Iniciar o provisionamento da Agency com essa seleção, mantendo detalhes técnicos fora do fluxo humano.
3. Vincular o usuário como Owner permanente e criar os agentes C-level a partir de um blueprint versionado. CEO é obrigatório; a composição proposta está no brainstorm.
4. Apresentar a empresa e sua equipe; exigir a etapa de configuração dos providers, APIs e assinaturas do usuário em Connections. Disponibilizar ofertas gratuitas/pagas ao titular e ao pool de agentes próprios PLATFORM; estes alternam contas elegíveis por requisição. Usuários e seus agentes usam contas próprias ou ofertas SYSTEM_FREE publicadas pela plataforma, sem acesso às contas particulares de outros usuários. Validar modelos dos agentes e orientar missão, mandato, risco, autonomia e capital próprio.
5. Mostrar prontidão de forma específica: empresa criada, agentes provisionados, inferência configurada e operação habilitada são estados diferentes. Agente provisionado não significa gasto de IA ou ordem já autorizados.
6. Permitir retomar falhas de provisionamento sem recriar empresa, assinatura ou agentes. Repetição de evento de cobrança não duplica o organograma.

Invariantes propostas: exatamente um Owner humano por empresa; nenhum agente pode removê-lo, substituí-lo ou tornar-se proprietário; cada agente provisionado tem identidade e estado privados da empresa; atualização do blueprint não sobrescreve configurações de empresas existentes. Suspensão da assinatura altera disponibilidade conforme contrato comercial, preservando propriedade e histórico.

Proposta de equipe: CEO (coordenação), CIO (investimentos), CRO (risco), COO (operações), CFO (finanças/reconciliação) e CCO (governança). A lista além de CEO ainda será confirmada. Autonomia inicial e contratação de novos agentes permanecem em Q09.

O onboarding mostra o alcance do compartilhamento antes de ativar conexões. Gratuidade é propriedade verificada da oferta/entitlement; franquia paga não é pool gratuito. Credenciais e dados da empresa permanecem privados. Q05 está resolvida: agentes próprios da plataforma podem usar ofertas pagas e gratuitas de todos os usuários, inclusive para tarefas internas. Agentes PLATFORM distribuem requisições por alternância balanceada entre contas elegíveis. Usuário e agentes de clientes não usam contas de outros titulares, inclusive gratuitas. Contrato detalhado em [Connections v0.12](../../notes/anxionos-connections.md).

### 2.2. Mercados configuráveis

**Confirmado pelo usuário:** cada empresa escolhe Stocks, Cripto ou ambos no onboarding e pode mudar essa escolha depois. Fonte: [registro da definição](../../notes/anxionos-brainstorm.md).

Contrato de produto proposto:

- A configuração pertence à empresa e é alterada pelo Owner nas suas configurações; eventual delegação segue as regras de autoridade.
- Stocks + Cripto habilita os dois domínios na mesma empresa, mantendo o mesmo Owner, equipe C-level e histórico.
- A escolha define o universo de atuação, não uma autorização automática para qualquer instrumento ou ordem.
- Habilitar um mercado apresenta suas necessidades de conta, conector de execução, dados e mandato. O sistema distingue mercado selecionado de mercado pronto para operar.
- Novas estratégias e intenções devem respeitar os mercados habilitados e os demais limites. A exposição pode ser apresentada por mercado e consolidada na empresa, preservando as contas e a proveniência dos valores.
- Alterações são versionadas e auditáveis. Remover um mercado não apaga decisões, ordens ou posições históricas. O tratamento de operações em curso é uma questão de transição em Q13; não se presume liquidação automática pelo simples ajuste da seleção.
- A seleção não recria a empresa nem duplica os agentes C-level. Especializações de agentes por mercado serão configuráveis conforme o desenho de equipes.

Bolsas, países, brokers, exchanges e instrumentos disponíveis dentro de cada domínio serão definidos em Q02. A capacidade de escolher ambos faz parte do produto; a lista de integrações pode evoluir por entrega.

### 3. Módulos e fronteiras do produto

As responsabilidades abaixo são propostas para debate, com base no escopo da [conversa](../../external-sources/plataforma-investimentos-autonoma-chatgpt.md).

| Domínio | Responsabilidade | Principais conexões |
| --- | --- | --- |
| Identity & Tenancy | Usuários, memberships, organizações, agências, convites e escopos | Todos os recursos institucionais |
| Graph Kernel | Identidade de nós, relações, consultas governadas, temporalidade e projeções | Todos os módulos |
| Agency OS | Empresa nomeada, Owner, blueprint C-level, missão, mandato, equipes, objetivos e budgets | Billing, Agents, Investment, Governance |
| Agents | Identidade/versionamento, runtimes, skills, sessões, tarefas, heartbeats e delegação | Graph, Connections, Tool Gateway |
| Connections | Assinaturas upstream/APIs, registry, bindings de modelos por agente, pools, roteamento, quotas, custos e saúde; extração do 9Router | Agents, serviços e humanos |
| Capability & Tool Gateway | Descoberta e execução governada de ferramentas e plugins | Autorização, Agents, Execution |
| Knowledge & Memory | Documentos, evidências, memórias, recuperação por grafo e semântica | Research, Agents, Audit |
| Market Data | Instrumentos, fontes, normalização, qualidade e séries históricas | Strategy, Risk, Execution |
| Research & Strategy | Hipóteses, versões, datasets, backtests, avaliação e implantação | Knowledge, Models, Portfolio |
| Capital & Portfolio | Contas, propriedade, alocações, carteiras, posições e exposição | Mandates, Risk, Accounting |
| Risk & Governance | Políticas, limites, pré-trade, aprovações, autonomia e interrupção | Todas as ações sensíveis |
| Execution | OMS/EMS, roteamento, adaptadores, ordens, fills e recuperação | Motores externos, contas, risco |
| Accounting & Reconciliation | Movimentos, saldos, taxas e diferenças entre registros internos e externos | Execution, Portfolio, Analytics |
| Analytics & Reporting | Performance, custos, atribuição, relatórios e exportações | Evidências, contabilidade e decisões |
| Evaluation & Learning | Avaliações, reputação por tarefa e propostas de evolução | Agents, Models, Strategy, Governance |
| Partners | Indicações, campanhas, atribuição, comissões e pagamentos | Comercial, tenancy e billing |
| Billing & Entitlements | Planos, consumo, limites comerciais, cobranças e créditos | Usage, Connections, Agencies |
| Operations & Audit | Telemetria, suporte, incidentes, trilhas, backup e recuperação | Todos os módulos e integrações |

Dashboard é uma experiência sobre esses domínios. Nenhuma regra crítica deve existir apenas numa tela.

### 4. Jornadas de ponta a ponta

| ID | Gatilho e fluxo principal | Resultado | Exceções que precisam de tratamento |
| --- | --- | --- | --- |
| J1 | Usuário assina → nomeia empresa → escolhe Stocks, Cripto ou ambos → sistema vincula Owner e provisiona C-levels | Empresa criada com mercados escolhidos, CEO e equipe inicial | Seleção ausente, evento de cobrança repetido, criação parcial e retomada sem duplicação |
| J2 | Owner conhece os C-levels → define mandato, autonomia e budgets → configura modelos → autoriza início de trabalho | Equipe inicial pronta para coordenar a empresa com escopo e histórico | Sem modelo elegível, budget insuficiente, runtime indisponível |
| J3 | Admin registra conexão → valida endpoint e segredo → define políticas → habilita modelo | Inferência rastreável para consumidores autorizados | Falha de autenticação, incompatibilidade, quota, timeout e bloqueio de política |
| J4 | Pesquisa → hipótese → estratégia versionada → backtest → validação → paper/shadow → promoção | Estratégia habilitada para o ambiente autorizado | Dados inválidos, resultado não reproduzível, avaliação insuficiente |
| J5 | Conta conectada → reconciliação inicial → mandato e limites → alocação → intenção → risco → aprovação → ordem → fill → posição | Operação reconciliada e rastreável | Fill parcial, rejeição, aceitação incerta, cancelamento concorrente |
| J6 | Alerta → operador inspeciona decisão e autoridade → intervém → resolve → registra aprendizado | Incidente encerrado com evidência e ações | Grafo desatualizado, provedor indisponível, divergência contábil |
| J7 | Parceiro cria campanha → usuário indicado → atribuição → comissão → conciliação → pagamento | Relação comercial auditável | Duplicidade, estorno, contestação e atribuição expirada |
| J8 | Uso → apuração de custos → limites comerciais → cobrança → suporte → encerramento/exportação | Ciclo de cliente completo | Contestação, falha de cobrança, suspensão com operações em curso |

As jornadas incluem os quatro públicos solicitados e estendem o fluxo institucional da [fonte](../../external-sources/plataforma-investimentos-autonoma-chatgpt.md). Tratamentos de exceção são requisitos propostos desta versão.

### 5. Requisitos funcionais e aceitação

| ID | Requisito | Critério observável proposto |
| --- | --- | --- |
| R01 | Tenancy e memberships | Usuário removido perde acesso; recursos privados de outra agência não aparecem em respostas, busca ou contexto |
| R02 | Empresa, Owner, mercados e mandato | Nome e Stocks/Cripto/ambos no onboarding; seleção alterável nas configurações, versionada e preservando histórico; Owner permanente e limites versionados |
| R03 | Grafo governado | Criar identidade e relações por comandos de domínio; explicar consultas por tipo e escopo |
| R04 | Autoridade temporal | Consultar poder atual e histórico; revogação concorrente tem efeito definido e testável |
| R05 | C-levels e ciclo de agentes | Provisionar equipe inicial por blueprint, incluindo CEO; retomar sem duplicatas; cada agente possui identidade, versões e histórico próprios |
| R06 | Trabalho e delegação | Tarefas têm objetivo, proprietário, estado e correlação; delegação não amplia permissões |
| R07 | Connections, assinaturas e APIs | Usuário cadastra várias assinaturas/APIs do mesmo provider sem conflitos de identidade, segredo, configuração ou quota. Usuário/AGENCY balanceia contas próprias e pode usar catálogo SYSTEM_FREE; PLATFORM usa pool global autorizado. Modelo predefinido versionado por agente |
| R08 | Roteamento e configuração de inferência | Preservar modelo predefinido e perfil versionado de effort/thinking e demais parâmetros. Agentes PLATFORM alternam contas pagas/gratuitas globais por requisição; AGENCY balanceia contas próprias ou recursos SYSTEM_FREE segundo política de origem. Tipo/complexidade da tarefa determina requisitos e perfil autorizados, filtrando providers compatíveis com o modelo predefinido. Concorrência coordena a seleção por conta, não por key. Registrar grant, beneficiário, conta financiadora e configuração efetiva; sem adaptação silenciosa |
| R09 | Quotas e orçamento | Reservar gasto antes da execução; reconciliar consumo e registrar custo desconhecido |
| R10 | Ferramentas e plugins | Instalação declara capabilities, dependências e eventos; efeito repetido é deduplicado |
| R11 | Knowledge e memória | Contexto informa fontes e validade; conteúdo sem permissão não é entregue ao modelo |
| R12 | Market Data | Instrumentos identificados de forma inequívoca; idade, origem e falhas dos dados disponíveis |
| R13 | Strategy Factory | Hipótese, dataset, código/parâmetros, versão, resultados e critérios de promoção vinculados |
| R14 | Capital próprio | Vincular capital do respectivo Owner; separar propriedade e autoridade delegada; impedir associação ou uso de capital de outro usuário |
| R15 | Risco e aprovação | Retornar permitir, negar ou exigir aprovação com regra e evidência; modificar intenção exige nova validação |
| R16 | Ordens e motores | Novas intenções respeitam os mercados habilitados; cada comando tem chave idempotente; estados incertos disparam investigação antes de reenvio |
| R17 | Reconciliação | Fills, taxas, saldos e posições conferidos; diferenças geram caso operacional |
| R18 | Resultado e auditoria | Navegar da posição/resultado à decisão, versões, evidências, políticas e tentativas |
| R19 | Experiências humanas | Usuário vê somente suas contas configuradas e informações disponíveis; administrador da plataforma vê todas as contas de todos os usuários. Regra vale para tabelas, detalhes, métricas, busca e exportação; quatro públicos mantêm jornadas autorizadas |
| R20 | Avaliação e aprendizado | Comparações usam avaliação versionada; promoção requer autoridade e registro |
| R21 | Partners | Atribuição e comissão versionadas, com estorno e visibilidade restrita |
| R22 | Assinatura e billing | Assinatura identificada e provisionamento idempotente; consumo rastreável; orçamento de IA e capital de investimento separados |
| R23 | Operação e recuperação | Restaurar dados, reconstruir projeções e reconciliar operações em voo em exercício documentado |
| R24 | Ciclo de cliente e dados | Exportar, suspender e encerrar com tratamento explícito de acessos, segredos, ordens e retenção |

R01–R24 são critérios propostos para materializar a [visão original](../../external-sources/plataforma-investimentos-autonoma-chatgpt.md). A matriz de entregas está no [planejamento](../../notes/anxionos-planejamento-end-to-end.md).

O [contrato de inferência](../../notes/anxionos-inference-config.md) detalha effort, thinking, tokens, amostragem, saída estruturada, tools, contexto, modalidades e extensões. R08 exige validação por modelo/oferta/provider, precedência explícita, perfis por agente, auditoria e testes de adaptação/failover.

R07/R08 incluem TTS, embeddings e outras famílias conforme o [contrato multimodal](../../notes/anxionos-multimodal-inference.md) e a [pesquisa NVIDIA](../../research/nvidia-model-types-connections.md). Cada agente mantém seu modelo principal e bindings fixos por finalidade; coleções de conhecimento mantêm o espaço vetorial. G1–G4 ficam restritos à linguagem/raciocínio. Schema, limites, formatos, artefatos, jobs, preço e testes são específicos por operação, preservando todas as regras de contas, grants e rotação. MM01–MM12 acrescentam aceitação, sem afirmar implantação de conectores.

R07/R08 também exigem catálogo de modelos publicamente declarados free e gestão de cooldown conforme o [contrato específico](../../notes/anxionos-free-cooldown.md). Gratuidade, acesso e disponibilidade são distintos; sem piso de contexto, sem troca silenciosa para variante paga, sem compartilhar contas particulares entre clientes. Cooldown é por escopo/geração e permanece visível no painel. A [matriz de extração](../../research/9router-functional-coverage.md) registra 36 famílias do 9Router e os critérios CF01–CF16 complementam o aceite.

R07/R08 exigem [catálogo automático e uso caro por finalidade](../../notes/anxionos-catalog-automation.md): detectar mudança de provider, analisar/classificar/publicar e ativar ofertas compatíveis sem cadastro manual. Modelos caros ficam restritos a PLANNING ou SPECIAL autorizados; rotina não os usa. Novas entradas não substituem bindings nem ampliam grants. Preço/volume são independentes dos grupos de qualidade; CA01–CA12 definem aceitação. Valores monetários e regras especiais são configurados no lançamento.

### 6. Graph Explorer e trabalho humano

O administrador navega pelas vistas Agency, Capital, Agent, Strategy, Risk, Execution, Knowledge e Decision. Selecionar um nó apresenta propriedades relevantes, relações, histórico e ações autorizadas. Filtros temporais e de domínio não alteram permissões. Resultados grandes são limitados e paginados; o usuário pode abrir uma fila ou tabela a partir da vista.

O operador começa por tarefas e incidentes, com acesso ao subgrafo que explica o caso. O parceiro começa por campanha, atribuição e receita. A administração da plataforma começa por saúde, tenants e operação do serviço. Fonte de intenção: [dashboards e Graph Views na conversa](../../external-sources/plataforma-investimentos-autonoma-chatgpt.md).

### 7. Metas não funcionais a especificar

| Área | Requisito proposto | Evidência antes de produção |
| --- | --- | --- |
| Segurança e isolamento | Autorização em cada fronteira; segredos fora de grafo, logs e prompts | Testes de acesso adversário e revisão de caminhos privilegiados |
| Consistência | Um proprietário por fato; projeções com versão e atraso observável | Falhas entre persistência, evento, projeção e efeito externo |
| Disponibilidade | Degradação por domínio com política explícita para ações sensíveis | Exercícios de indisponibilidade e recuperação |
| Desempenho | SLO por consulta, tarefa e ação; ticks sem traversal por amostra | Benchmark das consultas críticas com dataset/carga declarados |
| Histórico | Eventos e versões suficientes para reconstrução dentro da retenção contratada | Replay e comparação de estados |
| Privacidade | Classificação, residência, retenção, exportação e exclusão por classe | Testes dos fluxos de dados e revisão das políticas |
| Operabilidade | Logs estruturados, correlação e métricas de atraso, risco e custos | Diagnóstico de incidente reproduzido |
| Usabilidade | Teclado, foco, leitura assistiva e alternativas tabulares ao grafo | Testes das quatro jornadas com representantes dos públicos |

Latência, throughput, RPO, RTO e retenção numéricos serão definidos com Q02, Q07, Q10 e Q12. Números dos exemplos da conversa são ilustrações.

### 8. Métricas do produto

Propostas de medição: tempo até primeira agência configurada; tempo até primeira tarefa útil; percentual de decisões com trilha completa; tempo de resolução de aprovação/incidente; taxa e idade de divergências de reconciliação; custo de IA por tarefa concluída; disponibilidade por integração; uso e retenção por agência; receita e margem por plano/coorte; atribuições comerciais contestadas.

Medir performance financeira exige metodologia e dados adequados, separados das métricas de confiabilidade do software. Metas quantitativas aguardam baseline de pilotos. Donos propostos: produto, operações, engenharia e domínio financeiro.

## Alternatives

### Núcleo modular próprio com adaptadores — recomendação inicial

Permite uma semântica institucional comum e independência de runtimes. Exige investimento em contratos e governança de plugins. Os limites de processo e implantação serão escolhidos pelo workload.

### Federação de plataformas existentes

Reutiliza experiências de agentes e coordenação. É atrativa se a adaptação for pequena e os contratos puderem ser mantidos; perde preferência inicial porque identidade, autorização e estado podem precisar de reconciliação entre produtos. A comparação será feita com provas por contrato, usando as [referências preservadas](../../notes/anxionos-brainstorm.md).

### Serviços independentes desde o início

Adequada para equipes e necessidades de isolamento distintas. Traz custos imediatos de operação e coordenação de eventos. Pode ser escolhida em domínios específicos; ainda faltam dados de escala e capacidade para aplicá-la ao produto inteiro.

### Adiar a implementação e validar primeiro a proposta de valor

Preserva orçamento se a dor ou o público forem incertos. É compatível com entrevistas e protótipos de jornada durante o planejamento. Não substitui o trabalho de arquitetura solicitado, mas pode alterar a ordem de investimento.

## Drawbacks

- Grafo, autoridade temporal e replay exigem contratos e migrações que continuarão sendo mantidos.
- Integrações externas impõem mudanças, falhas e diferenças semânticas; novos adaptadores criam obrigação operacional.
- A amplitude do produto requer coordenação entre engenharia, operação e domínio financeiro.
- Mais autonomia aumenta a necessidade de avaliação e intervenção compreensível.
- Registrar evidências melhora investigação, mas traz custo de armazenamento e decisões de retenção.
- Um produto com vários públicos exige testes de permissão e usabilidade além da validação do fluxo financeiro.

Esses custos são inferências de projeto; serão quantificados por frente no [planejamento](../../notes/anxionos-planejamento-end-to-end.md).

## Unresolved questions

A [auditoria de cobertura da conversa anexada](../../research/auditoria-cobertura-conversa.md) compara 78 seções e mantém o diagnóstico inicial e a resolução documental. O [SDD v1](../specs/001-institutional-contract/spec.md) detalha Graph Kernel/Schema, Agent Brain/Graph RAG, investimento e evolução institucional. A [estrutura modular do backend](../../notes/anxionos-backend-structure.md) foi aceita pelo usuário; os contratos técnicos não representam implementação/homologação.

R07/R08 também incluem o [catálogo de modelos e capacidades](../../notes/anxionos-model-catalog.md): quatro grupos indicados pelo usuário, classificação por janela e capacidades verificadas por oferta, com comparação, proveniência e critérios MC01–MC10. Grupo é referência de escolha, não substituição automática do modelo predefinido. Janelas reais e identidades canônicas exigem evidência.

A [proposta de expansão de Connections](./0002-connections-expansao-operacional.md) complementa R07–R09/R19/R23/R24. A [revisão com evidências](../../research/9router-gaps-validacao.md) e o [contrato operacional v1](../../notes/anxionos-connections-operational-contract.md) corrigem acesso SYSTEM_FREE, multicontas, rotação, reservas, parâmetros e recuperação. As regras técnicas têm critérios V01–V10; valores de lançamento e homologação estão pendentes. Status permanece draft.

O [backlog Q01–Q13](../../notes/anxionos-brainstorm.md) registra decisões e gates de lançamento. Q06/Q09/Q12/Q13 têm contratos propostos; Q07 e integrações exigem homologação, Q04 detalhes operacionais, Q10 capacidade/datas e Q11 valores comerciais. Q03 define titular único e configuração de quantidade de empresas por plano no SDD.

Próximos gates: confirmar integrações stocks/cripto e providers, configurar limites/retenção/regiões, selecionar blueprint além do CEO e definir capacidade/comercial. Autonomia e retirada de mercado já têm comportamento e aceites nas specs003/004; a ativação correspondente exige política e homologação.

## Documentos de apoio

- [SDD v1 — contratos, stack, API e pacotes P01–P09](../specs/001-institutional-contract/spec.md).
- [Backend — estrutura adotada e regras de dependência](../../notes/anxionos-backend-structure.md).
- [Decisão aceita de organização modular](../decisions/0002-adopt-modular-backend-layout.md).

- [Brainstorm e fontes](../../notes/anxionos-brainstorm.md).
- [Modelo do grafo institucional e consultas críticas](../../notes/anxionos-graph-domain-model.md).
- [Connections](../../notes/anxionos-connections.md).
- [Planejamento de ponta a ponta](../../notes/anxionos-planejamento-end-to-end.md).

O status permanece draft. A visão foi solicitada pelo usuário; os contratos e critérios propostos nesta versão ainda estão em discussão.
