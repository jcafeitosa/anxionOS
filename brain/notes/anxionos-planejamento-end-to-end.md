---
type: planning-note
title: anxionOS — planejamento de ponta a ponta
description: Fases, 13 épicos, dependências, validação, lançamento e operação do produto completo.
status: draft
cluster: anxionos
tags:
  - anxionos
  - roadmap
  - planning
sources:
  - id: prd
    resource: ../project-docs/proposals/0001-anxionos-prd-mestre.md
  - id: brainstorm
    resource: ./anxionos-brainstorm.md
---
# anxionOS — planejamento de ponta a ponta

Versão 0.1 para discussão. Cobre descoberta, arquitetura, desenvolvimento, validação, lançamento, operação e evolução do produto completo. Deriva do [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md), do [brainstorm](./anxionos-brainstorm.md), do [grafo](./anxionos-graph-domain-model.md) e de [Connections](./anxionos-connections.md).

Este é um planejamento de programa proposto, não um plano de implementação aprovado. Prazos e pessoas não foram inventados. Os papéis responsáveis indicam a especialidade necessária; Q10 definirá equipe, capacidade e datas.

## Detalhamento técnico e organização adotada

O [SDD v1](../project-docs/specs/001-institutional-contract/spec.md) desdobra este programa em P01–P09, com contratos de schema/API, Agents/Knowledge, Investment, evolução e Connections. A [estrutura do backend](./anxionos-backend-structure.md) foi aceita pelo usuário e deve orientar a implementação. Mapeamento: E01/E02/E12→P04/P07; E03/E04→P01–P03; E05/E07→P04; E06→P05; E08–E11→P06/P08; E13→P09. Gates de homologação/configuração permanecem explícitos; nenhuma fase é marcada implementada pela conclusão dos documentos.

## Estratégia de entrega

Desenhar o sistema completo e construir incrementos integrados. Cada incremento entrega uma jornada observável com dados, autoridade, interfaces e operação. Um módulo só é concluído quando seus fluxos de falha e dependências também funcionam.

O grafo começa na fundação: identidade, relações, autoridade e eventos. O produto cresce adicionando domínios e consultas ao mesmo contrato institucional. Simulação e paper trading servem à validação progressiva e permanecem capacidades do produto final.

## Fases e critérios de saída

| Fase | Entrega | Dependências | Evidência de saída |
| --- | --- | --- | --- |
| F0 — Definição | Owner, capital próprio e seleção Stocks/Cripto/ambos confirmados | Q01 resolvida; detalhar integrações em Q02 e Q03/Q04 | Jornada de onboarding e alteração posterior dos mercados compreendida |
| F1 — Fundação | Identidade, Owner, tenancy, assinatura/entitlement inicial, Graph Kernel, eventos e contratos | Q03/Q06/Q07/Q12; contrato comercial inicial | Duas empresas de Owners distintos isoladas; evento de assinatura repetido não duplica empresa |
| F2 — Organização e inteligência | Nome, mercados, blueprint C-level, onboarding retomável, configurações, agentes e Connections | F1 | Empresa nasce com mercados escolhidos, Owner e equipe; escolha pode mudar sem recriar empresa ou agentes |
| F3 — Pesquisa e simulação | Dados, instrumentos, estratégias, backtests, carteiras e executor simulado | F1/F2; datasets e avaliação definidos | Jornada de hipótese até resultado simulado com versões e custos |
| F4 — Operação de mercado controlada | Risco, aprovação, motores externos, OMS, fills e reconciliação | F3; Q02/Q04/Q09 | Paper/shadow e teste de falhas; capital real depende do modelo operacional e critérios aprovados |
| F5 — Produto comercial completo | Quatro dashboards, partners, billing, suporte, exportação e encerramento | APIs das fases anteriores; Q11 | Jornadas comerciais e operacionais completas com permissões e conciliação |
| F6 — Preparação e lançamento | Testes de carga, recuperação, migração, playbooks, piloto e operação assistida | F1–F5 no escopo de lançamento escolhido | Evidências de aceite, responsáveis, rollback e capacidade operacional |
| F7 — Evolução institucional | Mais mercados/modelos, reputation, ensembles, digital twin e auto-organização governada | Operação medida; Evaluation e Governance | Mudanças promovidas por evidência e com reversão/compensação definida |

Design das quatro experiências começa em F0/F1. F5 marca a cobertura integrada completa, não o início do trabalho de frontend. Workers, interfaces e operação evoluem junto de cada domínio.

## Frentes de trabalho e rastreabilidade

| Épico | Pacote de trabalho | Requisitos | Depende de | Entrega verificável / responsável proposto |
| --- | --- | --- | --- | --- |
| E01 | Produto e experiência dos quatro públicos | R19, R24 | F0 | Jornadas/protótipos testados / produto e design |
| E02 | Identity, Owner, onboarding, mercados e tenancy | R01, R02 | F0 e contrato inicial de E12 | Nome e Stocks/Cripto/ambos configurados e alteráveis; proprietário humano invariável / core |
| E03 | Graph Kernel e temporalidade | R03, R04 | E02 conceitual | Schema inicial, consultas T01–T20 e contratos de versão / arquitetura |
| E04 | Infraestrutura, eventos e observabilidade | R23 | Q06/Q10 | Ambientes, entrega durável, traces e recuperação / plataforma |
| E05 | Blueprint C-level, Agents, trabalho e gateway | R05, R06, R10 | E02–E04 | CEO e equipe criados automaticamente, runs retomáveis e delegação / agentes |
| E06 | Connections | R07, R08, R09 | E02–E04 | Assinaturas/APIs, modelo predefinido por agente, pools, roteamento, quotas e reconciliação; incrementos C0–C6 / integrações IA |
| E07 | Knowledge, memória e Market Data | R11, R12 | E03/E04 | Fontes, instrumentos e recuperação filtrada / dados |
| E08 | Research, Strategy e Evaluation | R13, R20 | E05–E07 | Experimentos versionados e promoção / pesquisa e domínio |
| E09 | Capital, Portfolio e Risk | R14, R15 | E02/E03/E07 | Alocação, limites e aprovação concorrente / domínio financeiro |
| E10 | Execution e motores externos | R16 | E04/E08/E09 | OMS, adaptadores, cancelamento e resultado incerto / execução |
| E11 | Accounting, Analytics e Audit | R17, R18 | E09/E10 | Fills, taxas, posições, divergências e relatórios / operações e dados |
| E12 | Assinaturas, Partners e Billing | R21, R22 | Contrato inicial junto a E02; consumo/comissões após E06/E11 | Assinatura habilita onboarding; expansão inclui uso, comissão e estorno / comercial |
| E13 | Lançamento, suporte e ciclo de cliente | R23, R24 | E01–E12 conforme release | Runbooks, backup, exportação e encerramento / operações |

Contratos conceituais de E02/E03/E04 e a parte inicial de E12 (assinatura/entitlements) devem ser acertados juntos para evitar uma dependência circular de implementação. O onboarding não espera a apuração financeira de E11: E12 fornece primeiro identidade da assinatura, elegibilidade e eventos idempotentes; consumo, comissões e conciliação comercial vêm depois. E05/E06 podem evoluir em paralelo após essa base. Interfaces consomem contratos simulados desde cedo. E11 começa pelo modelo de ledger e pelos casos de reconciliação antes de haver integrações reais.

Todos os R01–R24 têm pelo menos uma frente responsável. A distribuição em épicos não significa microserviço obrigatório.

## Detalhamento de E06 — Connections

A [extração do 9Router](../research/9router-extracao-connections.md) preserva integralmente a revisão eb712ca e mapeia seus subsistemas. [Connections v0.12](./anxionos-connections.md) define C0–C6: extração documental concluída; contratos; acesso API e assinatura; pools do mesmo modelo; operação; cobertura de providers; extensões. Implementação/homologação ainda pendentes. C-levels recebem binding no blueprint; ausência de rota deixa o agente aguardando configuração. A assinatura comercial de E12 não equivale à assinatura upstream de E06.

E02/E06 incluem onboarding de providers/assinaturas, grants do titular e grants PLATFORM para ofertas particulares gratuitas/pagas, além de publicações/grants SYSTEM_FREE. C1 modela beneficiário; C2 persiste grants idempotentes; C3 entrega alternância coordenada por conta/requisição; C4 mostra distribuição e consumo. Aceite: AGENCY B não usa conta A nem gratuita; PLATFORM alterna A/B/C/A com pool estável; keys da mesma conta não duplicam participação. Mudança de preço, quota ou revogação reavalia a rotação.

C4 entrega duas projeções de dashboard: usuário com suas contas e informações disponíveis; administrador com todas as contas de todos os usuários. E01/E02/E06 validam lista, detalhe, busca, totais, exportação, notificações, streams e cache com usuários A/B e administrador. Usuário/AGENCY usa contas próprias e ofertas SYSTEM_FREE; papel Owner não concede read_all. Consumo do conjunto de contas dos usuários é exclusivo dos agentes próprios PLATFORM.

Q05 resolvida: agentes PLATFORM podem consumir ofertas pagas/gratuitas de todos os usuários, inclusive trabalho interno. E02/E05/E06 entregam cadastro administrativo dos agentes próprios PLATFORM, identidade institucional, grants, quota e atribuição por fundingAccountId. Cadastro e configurações dos agentes de usuários permanecem AGENCY, inclusive quando recebem suporte de um administrador. Acrescentar caso de aceite: PLATFORM alterna contas elegíveis de A/B por requisição, AGENCY de B usa B ou SYSTEM_FREE; ambos preservam modelo e perfil. A semântica de reserva/teto está definida no contrato operacional; valores por conta/janela ainda exigem configuração.

O [contrato de effort/thinking](./anxionos-inference-config.md) define I1–I5 dentro de E06: schemas/perfis; compilação nativa; editor e preview; custos/traces/failover; benchmark e expansão. São controles centrais do módulo, presentes desde C1/C2, com expansão por adapter.

A [expansão operacional proposta](../project-docs/proposals/0002-connections-expansao-operacional.md) aprofunda E06 em D1–D5: contratos; fatia vertical; compartilhamento confiável; operação completa; repertório ampliado. Mapeia C1–C6 e I1–I5 existentes, sem substituir o roadmap ou assumir aprovação das políticas sugeridas. A priorização proposta fecha capacidade, confiança, recuperação e reconciliação antes de aumentar conectores.

A [revisão do 9Router e do desenho](../research/9router-gaps-validacao.md) fecha 12 gaps no [contrato operacional v1](./anxionos-connections-operational-contract.md). C1/D1 incorpora identidade/publicação, SINGLE_ACCOUNT_WAIT, estados de tentativa e erro; C2/D2 cobre API, assinatura e SYSTEM_FREE; C3/C4/D3 exige V01–V10, incluindo saturação, crash e ledger. O patch de bloqueio tem oito regressões locais passando; isto não conclui implementação integrada nem homologação. Configuração ausente de budget, retenção ou financiamento tem bloqueio explícito de ativação.

Nova definição em E06: multicontas de assinatura/API por titular/provider, balanceamento próprio e roteamento conforme tipo/complexidade. C1 modela OwnerProviderPool e TaskRequirementsSnapshot; C2 valida cadastro/refresh/deduplicação; C3 coordena filas, grupos de quota e seleção; C4 explica distribuição por tarefa/provider/conta. Aceite com assinaturas e APIs do mesmo provider, quotas independentes/compartilhadas, chamadas concorrentes do titular/PLATFORM e tarefas de capacidades distintas. Seleção entre modelos por tarefa segue aberta; baseline preserva modelo configurado.

E06 também entrega o [catálogo de classificação de modelos](./anxionos-model-catalog.md): quatro grupos de referência, resolução de nomes, capacidades por oferta e buckets de contexto. C1 define entidades e critérios; C2 incorpora discovery/entitlement; C3 filtra janela efetiva por turno; C4 mostra grupos/comparações/proveniência; C5 amplia avaliação por adapter. Aceitação MC01–MC10 inclui limites de faixa, nomes ambíguos, ofertas diferentes, atualização de catálogo e preservação do binding. Não depende de habilitar seleção automática entre modelos.

### E06 — modalidades e contratos de inferência

TTS e embeddings são requisitos confirmados; a [análise NVIDIA](../research/nvidia-model-types-connections.md) e o [contrato multimodal](./anxionos-multimodal-inference.md) incorporam schema/slots/artefatos/jobs em C1, discovery por operação em C2, compatibilidade e roteamento em C3, unidades/ledger/UI em C4 e homologação em C5. C6 amplia demais modalidades. Ordem proposta de conectores: embeddings/reranking → TTS/STT → OCR/visão → mídia/especializados. Isso não exige todos os conectores no primeiro lançamento.

Fatia inicial inclui fakes de embedding e TTS com payload tipado, grants e reservas; MM01–MM12 verificam espaços vetoriais, voz/stream, jobs, custos e evidência de capacidades. Modelos reais dependem de oferta/acesso homologados. Knowledge controla indexação/reindexação; Agent Runtime compõe pipelines; Connections executa cada inferência com seu binding e escopo. Benchmark e prazo por modalidade continuam pendentes.

### E06 — cobertura upstream, modelos free e recuperação

A [matriz de 36 famílias](../research/9router-functional-coverage.md) dá destino e fase para cada capacidade inventariada. O [contrato free/cooldown](./anxionos-free-cooldown.md) acrescenta DFree/DCool dentro de C1–C4: declaração/preço/escopo → discovery por fonte → cooldown/leases/fila → painel/reconciliação. CF01–CF16 entram nos aceites, junto de V01–V10, MC01–MC10 e MM01–MM12. C5 amplia fontes e providers com homologação; copiar o inventário não marca o conector como implementado.

### E06 — catálogo contínuo e uso de modelos caros

O [contrato de automação](./anxionos-catalog-automation.md) acrescenta watchers por provider, análise/classificação/publicação e ativação sem cadastro manual de modelo compatível. C1 define políticas de admissão/custo; C2 implementa detecção/diff/jobs; C3 verifica PLANNING/SPECIAL, binding e reserva; C4 oferece métricas/painel/reconciliação. CA01–CA12 testam duplicação, stale, publicação imediata, não substituição e restrição de uso caro. Polling 5min/reconciliação 6h e p95 pós-detecção 30s são defaults/metas propostos, ajustáveis e sujeitos a limites/teste, não workers ativos ou SLA já comprovado.

## Primeiras entregas concretas de planejamento

Pacotes **PL01–PL08** (planejamento de programa) são distintos dos pacotes de implementação **P01–P09** do [SDD](../project-docs/specs/001-institutional-contract/spec.md) e da [estrutura do backend](./anxionos-backend-structure.md).

| Ordem | Artefato / resultado | Quem resolve | Critério para encerrar |
| --- | --- | --- | --- |
| PL01 | Q01 resolvida e mercados definidos; detalhar onboarding | Fundador/produto | Usuário assina, nomeia empresa, escolhe Stocks/Cripto/ambos e recebe C-levels; definir autonomia e troca de mercados |
| PL02 | Revisar PRD e distinguir compromisso de lançamento de evolução | Produto/engenharia | Requisitos com prioridade e dependências |
| PL03 | ADR de fronteiras de identidade, tenancy e autoridade | Arquitetura/produto | Casos de colaboração e revogação sem ambiguidade |
| PL04 | ADR de estado, eventos, Graph Core e ledger | Arquitetura | Proprietário por agregado e comportamento diante de falhas |
| PL05 | Avaliar referências por contrato, revisão e licença | Engenharia | Reutilizar, adaptar ou implementar com justificativa |
| PL06 | Especificar Graph Kernel e Connections | Engenharia | APIs, schema, erros, segurança, migração e teste |
| PL07 | Definir piloto, datasets e critérios de domínio | Produto/risco/dados | Avaliação reproduzível e caminho de promoção |
| PL08 | Estimar capacidade, operação e custo | Fundador/engenharia | Pessoas, cenários de demanda e orçamento por fase |

PL03–PL08 são trabalhos futuros propostos; não são ADRs já aceitos ou specs já produzidas.

## Padrão de especificação por módulo

Cada módulo deverá ter objetivo, interfaces, dependências, entidades/relações, commands/events, regras de autorização, estados, falhas, migração, métricas e aceitação. A documentação nasce em propostas, decisões e specs conforme o ciclo do projeto.

Antes do código, cada pacote deve conter pelo menos um caso completo com entrada, decisão de política, estado durável, eventos e saída; casos de acesso indevido, duplicidade, atraso e indisponibilidade; e estratégia de implantação/rollback. O schema compartilhado tem dono, versionamento e compatibilidade entre produtores e consumidores.

Plugins declaram versão do contrato, capabilities, escopos, eventos, configuração, migração e política de isolamento. Desinstalação deve identificar agentes, tarefas e ordens dependentes antes de retirar a integração.

## Validação de ponta a ponta

| Camada | Casos prioritários | Evidência |
| --- | --- | --- |
| Domínio | Mandato, grants, budgets, preços, capital e estados | Exemplos determinísticos e invariantes |
| Contratos | Adaptadores IA, market data, brokers/exchanges e eventos | Suites de compatibilidade por integração |
| Integração | Persistência → evento → grafo → consumidor | Duplicidade, reordenação, reinício e replay |
| Concorrência | Revogação durante ordem; reservas simultâneas; dois operadores | Estado final e efeitos externos únicos |
| Dados financeiros | Fill parcial, fees, moeda, arredondamento e saldo divergente | Ledger e reconciliação com dados de teste conhecidos |
| Agentes/modelos | Contexto, fontes, tool calls, qualidade e mudanças de modelo | Avaliação versionada por tarefa |
| Segurança | Isolamento em busca/contexto, permissões indiretas, segredos e conteúdo hostil | Testes adversários e revisão de fronteiras |
| Experiência | Onboarding, seleção e troca de mercados, aprovação, incidente, atribuição e encerramento | Testes com os quatro públicos |
| Configuração de mercados | Três escolhas iniciais e transições entre Stocks, Cripto e ambos; troca com estratégias, ordens e posições em curso | Identidade/Owner/histórico preservados; novas intenções respeitam configuração; operações em curso seguem Q13 |
| Desempenho | T01–T20, ingestão, fila de tarefas e conexão externa | Relatório com volume, distribuição, hardware e percentis |
| Operação | Backup, restore, perda de projeção, indisponibilidade de motor e versão incompatível | Exercício documentado e tempos medidos |

Retorno de backtest não é critério isolado de promoção. A avaliação proposta inclui qualidade dos dados, separação temporal, custos, slippage e limitações do simulador; o método exato será definido por especialistas do domínio.

## Ambientes, rollout e dados

Proposta: desenvolvimento local com dados sintéticos; integração automatizada; staging; simulação/paper; piloto restrito; produção. Configurações, contas e permissões de cada ambiente são identificáveis e não intercambiáveis.

Migrações versionam schemas e eventos. Projeções novas podem ser reconstruídas e comparadas antes de substituir a leitura. Feature flags separam habilitação por agência/integração. Rollback de software não desfaz uma ordem externa: efeitos financeiros precisam de reconciliação e, quando autorizado, compensação.

Dados de teste não usam segredos ou carteiras reais por padrão. Arquivamento, retenção e exportação preservam referências históricas conforme a política definida em Q12. Encerrar uma agência resolve ordens em curso, jobs, credenciais, cobrança e retenção antes de concluir o processo.

## Operação contínua

Definir responsáveis e runbooks para: indisponibilidade de provider/modelo; atraso de projeção; rejeições anormais de risco; ordem incerta; diferença de reconciliação; vazamento de segredo; falha de pagamento; restauração e troca de versão.

Painel operacional deve separar disponibilidade de serviço, atualidade dos dados, saúde dos motores, incidentes de capital e custos de IA. Cada incidente deve apontar uma correlação e uma ação executável. Atendimento ao cliente usa acesso delegado e auditado, com escopo e duração.

Após lançamento: revisar incidentes, qualidade de modelos, budgets, tempo de intervenção e uso por agência; alimentar backlog de melhoria sem aumentar autonomia automaticamente.

## Capacidade, custos e cronograma

Sem Q10, datas seriam especulativas. Estimar por frente: esforço de domínio, dependências, integração, operação e incerteza. Definir caminho crítico depois que equipe e modelo de lançamento estiverem claros.

Modelo de custo a preencher: infraestrutura fixa + armazenamento/retenção + dados/licenças + inferência observada + execução/integrações + suporte/operação. Separar despesas da plataforma, custo de IA do cliente e taxas de mercado. Modelos locais incluem capacidade computacional e operação; não pressupor custo zero.

Cenários a dimensionar: número de agências, agentes ativos, tarefas concorrentes, chamadas por tarefa, dados por mercado, ordens por conta, retenção e expansão de consultas. Os valores serão fornecidos e medidos; nenhum número da conversa original é assumido como requisito.

## Riscos e checkpoints de decisão

- Q01 resolvida: assinante, Owner e capital próprio. Q02 já define Stocks, Cripto ou ambos e alteração posterior; faltam integrações específicas. Q03/Q04 detalham colaboração e operação.
- Retirada de mercado com operações em curso: resolver Q13 antes de implementar a transição.
- Graph e ledger divergentes: Q06 antes de execução real.
- Banco escolhido sem carga representativa: Q07 antes de compromisso operacional.
- Reutilização que amplia dependências: Q08 por integração.
- Autonomia superior à avaliação disponível: Q09 antes de promoção.
- Roadmap maior que capacidade: Q10 antes de compromisso de prazo.
- Custos sem margem definida: Q11 antes de precificação.
- Retenção incompatível com recuperação ou dados: Q12 antes de produção.

Os riscos desenvolvem a [revisão inicial](../research/analise-planejamento-anxionos.md) e o [brainstorm](./anxionos-brainstorm.md). Checkpoints decidem promoção de escopo e não substituem a entrega do planejamento completo.

## Estado desta rodada

Produzidos: enquadramento, alternativas, PRD mestre, modelo inicial do grafo com 20 consultas críticas, domínio Connections e este plano de programa.

Atualização: Q01 resolvida por [definição do usuário](./anxionos-brainstorm.md); Q02, Q03 e Q11 parcialmente resolvidas. O cliente assina, nomeia a empresa, escolhe Stocks, Cripto ou ambos, permanece Owner e recebe C-levels para operar capital próprio. Os mercados podem ser alterados depois nas configurações da empresa. Em aberto: integrações, Q13 para retirada de mercados com operações em curso, equipe completa, autonomia, ADRs, specs e estimativas.
