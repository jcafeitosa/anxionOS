---
title: Auditoria de cobertura — conversa Graph e Connections
description: "Fechamento documental: 78/78 seções endereçadas, 73 cobertas e cinco evoluídas; histórico preservado."
type: research-note
status: draft
advisory: true
cluster: anxionos
date: 2026-09-07
sources:
  - id: attachment
    resource: ../external-sources/conversa-graph-connections-audit.md
  - id: prd
    resource: ../project-docs/proposals/0001-anxionos-prd-mestre.md
  - id: graph
    resource: ../notes/anxionos-graph-domain-model.md
  - id: requirements
    resource: ../notes/anxionos-brainstorm.md
coverage_sections: 78
coverage_addressed: 78
coverage_scope: documental
version: "2.0"
---
# Auditoria de cobertura — conversa Graph e Connections

## Fechamento documental — continuação de 2026-09-07

**78/78 seções do anexo endereçadas documentalmente: 73 C e 5 E; nenhuma P ou A permanece no recorte auditado.** Introdução, conclusão do schema e 15 leis também têm contrato e aceite rastreável. “100%” aqui significa cobertura dos requisitos da conversa no planejamento: não significa produto implementado, conectores homologados, benchmarks executados ou todas as decisões técnicas aprovadas.

O diagnóstico inicial 37 C / 35 P / 1 A / 5 E fica preservado abaixo como histórico anterior à criação dos contratos. A reclassificação não decorre de apenas adicionar links: foram escritos schema tipado, API, planos T01–T20 com fixture/oracles, máquinas de estado, algoritmos de contexto/reputação, contratos financeiros, simulação/apply/rollback e pacotes de implementação.

### Fechamento de AC01–AC07

| Achado | Resolução documental concreta | Verificação prevista |
| --- | --- | --- |
| AC01 | [Schema](../notes/anxionos-graph-schema-v1.md), [Kernel/API](../project-docs/specs/001-institutional-contract/spec.md), [20 traversals](../notes/anxionos-graph-traversals-v1.md): campos, cardinalidades, bitemporalidade, índices, limites, erros, inputs, planos lógicos e oracles | SC01–SC08/GK01–GK09/T01–T20 |
| AC02 | [Agents/Knowledge](../project-docs/specs/002-agents-knowledge/spec.md): Brain, descoberta/ranking, DAG/CEO, leases, heartbeat, cancel/resume, memória e Graph RAG autorizado | AG01–AG08 |
| AC03 | [Evolução institucional](../project-docs/specs/004-institutional-evolution/spec.md): amostra/incerteza/decaimento, datasets, promoção, auto-organização, snapshot/diff/rebase/saga/rollback | EV01–EV08 |
| AC04 | [SDD/stack](../project-docs/specs/001-institutional-contract/spec.md) e [ADR0001 proposto](../project-docs/decisions/0001-graph-operational-domain-authority.md): dono por fato, journal/outbox/NATS, projeção, epochs, hot/warm/intelligence e metas de ensaio | P01/P02/P09, GK03/GK07/GK09 |
| AC05 | [Investment](../project-docs/specs/003-investment-lifecycle/spec.md): Market, capital próprio, ledger/valoração, risco/segregação/ordens/reconciliação, impacto/attribution/flight recorder | FI01–FI12; fixture NAV1012/PnL12 |
| AC06 | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): runtime adapters locais, Strategy slots, ensembles/judge, herança, SDK/APIs/workers e CX-P1–CX-P7 | CX01–CX10 + suites operacionais/CF/CA/MM existentes |
| AC07 | PRD, brainstorm, grafo e roadmap agora vinculam contratos vigentes e distinguem leitura inicial de 39 arquivos, reproduções posteriores e homologação pendente | Revisão de consistência + OKF/links |

A [estrutura de backend](../notes/anxionos-backend-structure.md) foi apresentada em tela e explicitamente aceita pelo usuário; [ADR0002](../project-docs/decisions/0002-adopt-modular-backend-layout.md) registra o aceite. Inclui 23 módulos, ownership e AR01–AR06. O aceite dessa organização não foi aplicado automaticamente ao ADR0001 ou à operação real.

### Matriz de resolução por seção

C = requisito detalhado no planejamento. E = evolução deliberada, também endereçada; a regra posterior é a solução vigente e não se reintroduz a sugestão incompatível antiga. Coluna “aceite” aponta teste a implementar/executar, não resultado de execução.

| ID | Seção do anexo | Antes → agora | Contrato e trecho de resolução | Aceite/pacote |
| --- | --- | --- | --- | --- |
| A01 | Grafo como sistema nervoso | C → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): Um proprietário por fato; mapa canônico | GK01/GK07 |
| A02 | Agency como subgrafo | C → C | [Schema v1](../notes/anxionos-graph-schema-v1.md): Identity; catálogo de relações | SC01/SC02 |
| A03 | Autorização por grafo | C → C | [Traversals v1](../notes/anxionos-graph-traversals-v1.md): T01–T03 | GK03/GK08 |
| A04 | Delegação governada | C → C | [Agents/Knowledge](../project-docs/specs/002-agents-knowledge/spec.md): Descoberta; delegação e máquina de Run | AG04 |
| A05 | Capital Graph | P → C | [Investment](../project-docs/specs/003-investment-lifecycle/spec.md): Capital próprio, alocação e ledger | FI02/FI08/T07 |
| A06 | Market Graph | P → C | [Investment](../project-docs/specs/003-investment-lifecycle/spec.md): Market Data e identidade | FI01 |
| A07 | Decision de primeira classe | C → C | [Investment](../project-docs/specs/003-investment-lifecycle/spec.md): Decision, risco, aprovação e ordem | FI04/FI09 |
| A08 | Institutional Flight Recorder | P → C | [Investment](../project-docs/specs/003-investment-lifecycle/spec.md): Impact Analysis e Flight Recorder | FI09/FI12 |
| A09 | Temporal Graph | C → C | [Schema v1](../notes/anxionos-graph-schema-v1.md): Tipos comuns, escopo e tempo | SC04/T02 |
| A10 | Graph + Event Store | P → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): Eventos, replay e recuperação | GK07/GK09 |
| A11 | Agent Brain | P → C | [Agents/Knowledge](../project-docs/specs/002-agents-knowledge/spec.md): Identidade, Brain e ciclo de vida | AG01/AG07 |
| A12 | Descoberta de agentes por capability | P → C | [Agents/Knowledge](../project-docs/specs/002-agents-knowledge/spec.md): Descoberta de agentes | AG05/T04 |
| A13 | Heartbeat e orquestração no grafo | P → C | [Agents/Knowledge](../project-docs/specs/002-agents-knowledge/spec.md): Máquina de heartbeat e Run | AG02/AG03 |
| A14 | Separação de armazenamentos e abstração | P → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): Um proprietário por fato; stack | P01/GK09 |
| A15 | GraphService e linguagem de consulta | P → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): API semântica do Kernel | GK02/T01–T20 |
| A16 | Graph RAG | P → C | [Agents/Knowledge](../project-docs/specs/002-agents-knowledge/spec.md): Graph Context e Graph RAG | AG06/AG08 |
| A17 | Dashboards como vistas do grafo | C → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): UX, comercial e encerramento | UI03/UI04 |
| A18 | Loop institucional | P → C | [Evolução](../project-docs/specs/004-institutional-evolution/spec.md): Loop de aprendizado e promoção | EV03/EV08 |
| A19 | Tese da plataforma institucional | C → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): Goals; mapa canônico e limites | GK01–GK09 |
| B36 | Quatro fontes de verdade / Graph Core | P → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): Um proprietário por fato; eventos | GK07/GK09/P01 |
| B37 | Schema de nós por domínio | P → C | [Schema v1](../notes/anxionos-graph-schema-v1.md): Tipos de nós e payload mínimo | SC01/SC05 |
| B38 | Catálogo oficial de edges | P → C | [Schema v1](../notes/anxionos-graph-schema-v1.md): Catálogo de relações | SC02/SC05 |
| B39 | Propriedades das relações | P → C | [Schema v1](../notes/anxionos-graph-schema-v1.md): Envelope e regras de integridade | SC02/FI04 |
| B40 | História de autoridade | C → C | [Traversals v1](../notes/anxionos-graph-traversals-v1.md): T02 | SC04 |
| B41 | Tenant isolation | C → C | [Schema v1](../notes/anxionos-graph-schema-v1.md): Scope e integridade | SC01/GK08 |
| B42 | Agente não conhece Cypher | C → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): API semântica | GK05/GK06 |
| B43 | Graph Kernel e serviços | P → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): API e responsabilidade por fato | P03/T01–T20 |
| B44 | Graph Context do agente | P → C | [Agents/Knowledge](../project-docs/specs/002-agents-knowledge/spec.md): Graph Context; manifest e orçamento | AG07/T05 |
| B45 | Graph RAG 2.0 | P → C | [Agents/Knowledge](../project-docs/specs/002-agents-knowledge/spec.md): Pipeline Graph RAG | AG06/AG08 |
| B46 | Decision Graph navegável | C → C | [Traversals v1](../notes/anxionos-graph-traversals-v1.md): T10–T12 | FI09 |
| B47 | Impact Analysis | P → C | [Investment](../project-docs/specs/003-investment-lifecycle/spec.md): Impact Analysis | T13/T14/FI08 |
| B48 | Agent Reputation por domínio | P → C | [Evolução](../project-docs/specs/004-institutional-evolution/spec.md): Evaluation e reputação contextual | EV01/EV02 |
| B49 | Versões de agente/modelo/skill/policy | C → C | [Schema v1](../notes/anxionos-graph-schema-v1.md): Versioned + payloads Agent/Model/Skill | SC04/AG03 |
| B50 | Eventos alimentam projeções | P → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): Envelope e replay | GK07/GK09 |
| B51 | Ticks fora do grafo | C → C | [Investment](../project-docs/specs/003-investment-lifecycle/spec.md): Market Data | FI01 |
| B52 | Três velocidades operacionais | P → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): Três caminhos e metas iniciais | P01/P09 benchmark |
| B53 | Subgrafo de portfolio e filtros | C → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): UX: vistas/filtros/tabelas | UI03 |
| B54 | Agency Explorer e painel lateral | C → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): UX: painel do nó/Company | UI03/UI04 |
| B55 | Oito Graph Views no mesmo grafo | C → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): Oito vistas do grafo comum | UI03/GK08 |
| B56 | CEO como orquestrador | P → C | [Agents/Knowledge](../project-docs/specs/002-agents-knowledge/spec.md): Goal planning e CEO | AG03/AG04/T06 |
| B57 | Auto-organização | P → C | [Evolução](../project-docs/specs/004-institutional-evolution/spec.md): Auto-organização | EV08 |
| B58 | Agency Digital Twin | P → C | [Evolução](../project-docs/specs/004-institutional-evolution/spec.md): Agency Digital Twin | EV05/EV06 |
| B59 | Simulação de mudanças no grafo | P → C | [Evolução](../project-docs/specs/004-institutional-evolution/spec.md): Diff/rebase/apply/rollback | EV06/EV07 |
| B60 | Quinze leis do SDD | P → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): Quinze leis como requisitos testáveis | GK01–GK09/FI03–FI05 |
| B61 | Stack completa proposta | A → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): Stack proposta e fronteiras | P01/AR01–AR06 |
| B62 | InstitutionalGraph Contract | P → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): API semântica + T01–T20 | P03 |
| B63 | Grafo comum a todas as experiências | C → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): Mapa canônico, UX e interfaces | GK05/UI03 |
| C01 | AI Connectivity Graph | C → C | [Schema v1](../notes/anxionos-graph-schema-v1.md): Connections identity/registry/execution | SC01/CX02 |
| C02 | Provider/Connection/Endpoint/Model separados | C → C | [Schema v1](../notes/anxionos-graph-schema-v1.md): Payloads Connections e autenticação opcional | SC01/CX07 |
| C03 | Subdomínios de Connections | C → C | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): APIs, workers, pacotes e ownership | CX-P1–CX-P7 |
| C04 | Model Registry completo | C → C | [Catálogo](../notes/anxionos-model-catalog.md): Catálogo, capacidades/contexto/grupos | MC01–MC10 |
| C05 | Resolver modelo por capabilities | E → E | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): Modelo fixo e tipo de tarefa | CX03/CX09 |
| C06 | 9Router inspira, não define sistema | C → C | [9Router36](./9router-functional-coverage.md): 36 famílias com destino/evidência | CX-P1–CX-P7 |
| C07 | Graph-aware escolhe entre modelos | E → E | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): Elegibilidade do binding; fairness | CX01/CX03 |
| C08 | RoutingPolicy | C → C | [Inferência](../notes/anxionos-inference-config.md): Perfil versionado e configuração efetiva | CX06 |
| C09 | Falhas e fallback | E → E | [Operacional](../notes/anxionos-connections-operational-contract.md): Falhas/retry/continuidade | CX03/V01–V10 |
| C10 | Multi-account | C → C | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): Contas próprias e sequência PLATFORM | CX01/CX04 |
| C11 | Connection Health | C → C | [Free/cooldown](../notes/anxionos-free-cooldown.md): Bloqueios, saúde e recuperação | CF01–CF16 |
| C12 | Quota Engine hierárquico | C → C | [Operacional](../notes/anxionos-connections-operational-contract.md): Reservas/limites/capacidade | V05/CX04 |
| C13 | AI Cost Engine | C → C | [Operacional](../notes/anxionos-connections-operational-contract.md): Uso/custo/ledger/reconciliação | T17/CX10 |
| C14 | Modelos locais e privados | P → C | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): Runtime Adapter Contract e matriz local | CX07 |
| C15 | Roteamento por sensibilidade | C → C | [Operacional](../notes/anxionos-connections-operational-contract.md): DataTrustProfile e isolamento | CX02/CX07 |
| C16 | Model Cascading | E → E | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): Cascata com slots fixos, workflow F7 | CX08/EV03 |
| C17 | Model Ensemble / Judge | P → C | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): Ensemble/quórum/judge/falhas | CX08 |
| C18 | Relação temporal Agent→Model | E → E | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): Strategy/Knowledge/slots; modelo fixo | CX09 |
| C19 | AgentModelPolicy | C → C | [Inferência](../notes/anxionos-inference-config.md): Bindings/profiles/config efetiva | CX06/CX09 |
| C20 | Strategy exige capacidades de modelo | P → C | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): StrategyVersion→requirements→binding | CX09 |
| C21 | Connections Dashboard | C → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): UX Company/Platform/Operator/Partner | UI03/UI04 |
| C22 | Detalhe do provider | C → C | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): API providers/accounts e visibilidade | CX02 |
| C23 | Detalhe do modelo | C → C | [Catálogo](../notes/anxionos-model-catalog.md): ModelOffering/capacidades/contexto/evidência | MC01–MC10 |
| C24 | Routing Decision Trace | C → C | [Traversals v1](../notes/anxionos-graph-traversals-v1.md): T16 routing trace | CX03/CX06 |
| C25 | Aprender por tipo de tarefa | P → C | [Evolução](../project-docs/specs/004-institutional-evolution/spec.md): Evaluation/datasets/treinamento/promoção | EV01–EV04 |
| C26 | Grafo tarefa→resultado→reputação | P → C | [Evolução](../project-docs/specs/004-institutional-evolution/spec.md): Reputação por modelo/tarefa/domínio | EV01/EV03 |
| C27 | Escopos platform/org/agency/pessoal | P → C | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): Propriedade, consumo, funding e herança | CX02 |
| C28 | Isolamento da credencial | C → C | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): Credential injection/adapter | CX07/AR04 |
| C29 | Runtime Credential Injection | C → C | [Operacional](../notes/anxionos-connections-operational-contract.md): Runtime injection/refs/gerações | CX07/CX10 |
| C30 | Estrutura de módulos/APIs/workers | P → C | [Connections integration](../project-docs/specs/005-connections-integration/spec.md): APIs/SDK/workers/pacotes + árvore backend | CX-P1–CX-P7/AR01–AR06 |
| C31 | Connections como plano de inferência institucional | C → C | [SDD001](../project-docs/specs/001-institutional-contract/spec.md): Mapa de domínios e interfaces | P04/P05/P06 |

### Introdução, conclusão e quinze leis

L1–72/L852–865: centralidade do grafo, APIs por capabilities/intents e todas as entidades/ações relevantes representáveis → SDD mapa canônico, schema/envelope e registros/eventos/projeções. L2042 (schema completo): catálogo tipado + T01–T20 + migração e aceites; quantidade de tipos não é substituto de conformidade.

As15 leis estão consolidadas, uma a uma, na seção “Quinze leis como requisitos testáveis” do [SDD](../project-docs/specs/001-institutional-contract/spec.md). Leis14/15 agora têm a matriz de segregação de [Investment](../project-docs/specs/003-investment-lifecycle/spec.md) e FI03/FI05: identidades efetivas distintas, grant/policy, permit e caminho de envio obrigatório. Ter cargos distintos, sozinho, continua insuficiente.

### Requisitos posteriores preservados

| Requisito confirmado | Destino vigente |
| --- | --- |
| Assinatura, nome da empresa, Owner humano, C-levels incluindo CEO | SDD UX/onboarding; Agents AG01; estrutura organizations |
| Capital do próprio titular | Investment ownership/ledger; FI02/FI08 |
| Stocks/crypto/ambos mutável posteriormente | Investment MarketConfig/ENABLED→DRAINING→DISABLED; FI10 |
| Agentes PLATFORM configurados pelos admins ≠ AGENCY | Connections matriz de consumo; CX02/AG01 |
| User own accounts; admin inventário global | SDD UX; Connections APIs; UI03/UI04/CX02 |
| Plataforma usa contas gratuitas/pagas; usuário próprias + SYSTEM_FREE | Operacional/SupplyScope/grants; CX02 |
| Várias API/assinaturas no mesmo provider sem conflito | AccountKey/quotaGroup/reservas; CX01/CX04 |
| Alternância global de contas PLATFORM; próprio usuário reutiliza própria | Coordenador menos-recentemente-despachada, SINGLE_ACCOUNT_WAIT; CX01/CX03 |
| Modelos fixos e task type/complexity | Binding/requirements/profile/slots; CX03/CX09 |
| Effort/thinking/outros parâmetros completos | ParameterSchema/EffectiveConfig; CX06 |
| Grupos solicitados G1–G4 e janela independente | Catálogo MC01–MC10; nomes ilustrativos não IDs inventados |
| TTS/embeddings/outros/NVIDIA | Multimodal MM01–MM12; AdapterContract/CX07 |
| Modelos free publicamente declarados | FreeDeclaration/oferta/acesso/readiness separados; CF01–CF16 |
| Cooldown por scope/geração/tempo | Operacional + free/cooldown; CX03/CX04 |
| Detectar mudança/classificar/disponibilizar imediatamente após detecção | Automação CA01–CA12/CX05; limites conhecidos/compatíveis, sem rebind |
| Modelo caro só planejamento/especial | Server purpose+policy+budget; CA/CX06 |
| Extração de todas funcionalidades9Router com gaps/erros/melhorias | Matriz36 + CX-P1–CX-P7; adaptações explícitas e testes, sem alegar portabilidade concluída |

### O que continua fora da afirmação de 100%

Os contratos novos são drafts técnicos, exceto a organização do backend aceita. L01–L05 no SDD especificam quem define versões/licenças/topologia, adapters iniciais, planos/preços/equipe/datas, retenção/residência/RPO/RTO e limites monetários. Há comportamento definido enquanto faltam entradas obrigatórias: manter configuração pendente e não habilitar a operação correspondente. Não substituir falta de evidência por números inventados.

Testes funcionais/concorrência/recovery/bench citados são plano de verificação. O código da aplicação, SDK gerado, migrações e suites integradas ainda precisam ser implementados. A cobertura foi fechada documentalmente; confiabilidade operacional só poderá ser afirmada após evidência de execução.

### Validação do fechamento

Conferência pelo OpenKnowledge: matriz atual com78 IDs únicos (73 C/5 E),124 assinaturas de relação e119 nomes distintos; tabela do schema com colunas consistentes. Auditorias de project-docs (9 documentos), notes (13), esta auditoria (1) e índice (1) retornaram zero achados em OKF/links. Esses validadores não executam código, benchmarks nem homologação de APIs; markdownlint não constou em ran.

A varredura ampla de brain encontrou cinco avisos de type ausente em vault/ACCESS_POLICY, HEARTBEAT, SOUL, USER e wiki/OVERVIEW, fora dos contratos alterados. Não foram classificados como lacunas da conversa nem corrigidos mudando a semântica desses arquivos. A revisão de consistência também corrigiu autenticação opcional de endpoints públicos, preservou a seleção PLATFORM menos-recentemente-despachada e separou o aceite da estrutura de backend dos demais baselines.

## Auditoria inicial preservada — estado anterior ao fechamento

Todo o texto abaixo desta divisória registra a avaliação realizada antes dos contratos desta continuação. Expressões como “atual”, “pendente”, “não foram criadas” e as contagens37/35/1/5 pertencem àquela rodada histórica; o estado vigente é a matriz de resolução acima.

Revisão consultiva de cobertura documental, em 2026-09-07. **A documentação preserva a visão geral e detalha bastante Connections, mas não cobre integralmente o desenho da conversa em nível de contrato e planejamento executável.** Não foi reescrito o desenho para resolver achados nesta auditoria.

## Escopo e critério

Comparação com [anexo integral de 3.124 linhas](../external-sources/conversa-graph-connections-audit.md), incluindo suas 78 seções numeradas e os princípios não numerados. Corpus: brainstorm, PRD mestre, proposta de expansão, modelo do grafo, Connections v0.12, contratos operacional/inferência/catálogo/multimodal/free/automação, roadmap e pesquisas de apoio. A leitura e busca distinguiram conteúdo elaborado de fontes apenas preservadas.

A pergunta do usuário é cobertura da conversa. Esta auditoria usa evidência e achados calibrados de review-a-design como método auxiliar, sem trocar a tarefa por uma avaliação de viabilidade comercial, fact-check de fornecedores ou revisão de implementação.

Não contar como cobertura suficiente uma palavra na lista de módulos, uma linha de roadmap ou a cópia da conversa em external-sources. Também não exigir que uma decisão posterior seja desfeita para reproduzir literalmente uma sugestão antiga.

| Código | Significado |
| --- | --- |
| C | Coberto explicitamente no nível de requisito/contrato de planejamento, com comportamento rastreável; não significa implementado |
| P | Parcial: intenção preservada, mas faltam aspectos materiais do desenho solicitado |
| A | Ausente como artefato consolidado correspondente; pode haver menções soltas na base |
| E | Evoluído/restringido por decisão posterior registrada; não tratar como omissão acidental |

Resultado por seção: **37 C, 35 P, 1 A e 5 E**. Os itens repetem conceitos entre os blocos; essas contagens não são percentuais de conclusão do produto nem ponderação por importância. Specs e ADRs sob brain/project-docs estavam com zero documentos; isso confirma o estágio de planejamento, não ausência de trabalho.

## O argumento preservado

O usuário assina, nomeia a empresa, permanece Owner e opera capital próprio em stocks, cripto ou ambos. Pessoas/agentes/capital/decisões são relacionados pelo grafo institucional; autoridade e risco governam os efeitos. Connections separa inteligência de execução financeira e mantém modelos/ofertas/contas/custos sob políticas. Essa tese está explícita em [PRD: princípios e módulos](../project-docs/proposals/0001-anxionos-prd-mestre.md) e [Grafo: papel central](../notes/anxionos-graph-domain-model.md).

O desequilíbrio de detalhamento é claro: Connections ganhou vários contratos e matrizes de aceite; Agents, Knowledge, Graph Kernel, investimento e evolução institucional permanecem sobretudo no PRD e roadmap.

## Achados priorizados

### AC01 — Substantivo: Graph Domain Model ainda é inicial, não o schema/API completo prometido

Evidência: anexo L864, L930–1078 e L1927–2042 pedem tipos, relações, propriedades, cardinalidades e InstitutionalGraph. O [modelo atual](../notes/anxionos-graph-domain-model.md), abertura e “Evolução e evidências necessárias”, declara ser conceitual inicial e transfere propriedades obrigatórias, índices, comandos/eventos e migrações para specs futuras. T01–T20 são perguntas com entrada/resultado, sem contratos completos, queries, fixtures e desempenho medido.

Consequência: equipes ainda precisam inventar semântica compartilhada para implementar os módulos. Ter 20 consultas listadas não demonstra que a espinha dorsal do SDD esteja concluída. A quantidade 80–120 não precisa ser preenchida artificialmente; o gap é a formalização por caso de uso.

Resolução recomendada: spec do Graph Kernel + catálogo tipado de nós/arestas + API semântica com autorização/tempo/limites/erros + fixtures T01–T20. Confiança alta; reclassificar se esses contratos existirem em outro artefato verificável.

### AC02 — Substantivo: Agent Brain, orquestração e Graph RAG não têm contrato ponta a ponta

Evidência: anexo A11–A16 e B43–B45/B56; [PRD R05/R06/R11](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Grafo T04/T05/T06](../notes/anxionos-graph-domain-model.md) e [roadmap E05/E07](../notes/anxionos-planejamento-end-to-end.md) preservam os objetivos. O [contrato multimodal](../notes/anxionos-multimodal-inference.md) descreve embeddings/reranking e limites de domínio, mas não substitui a especificação de Knowledge/Agent Runtime.

Faltam composição do contexto institucional, memória/experiência e retenção, seleção de agentes por capability/autoridade/disponibilidade/reputação/custo, máquina de heartbeat, cancelamento/retomada e ranking de recuperação temporal/autorizada. Não há pipeline completo de Graph RAG apenas por listar embeddings.

Resolução: specs vinculadas de Agents/Orchestration e Knowledge/Graph Context com uma jornada de pesquisa, delegação, decisão e evidência. Confiança alta para cobertura parcial; muda com contratos equivalentes e testes de cenário.

### AC03 — Substantivo: reputação, aprendizado, auto-organização e Digital Twin estão no roadmap, sem desenho completo

Evidência: anexo B48/B57–B59 e C25–C26; [PRD Evaluation & Learning/R20](../project-docs/proposals/0001-anxionos-prd-mestre.md), [roadmap F7](../notes/anxionos-planejamento-end-to-end.md) e [Grafo T19/final](../notes/anxionos-graph-domain-model.md). Snapshot sem efeito em produção está previsto, mas não há protocolo de cenário, diff, aplicação sobre estado alterado ou rollback. Reputação não tem rubrica/domínio/amostra/atualização e efeito operacional definidos.

Resolução: decompor F7 em pacotes rastreáveis: reputação por tarefa/domínio; avaliação e promoção; proposta organizacional; simulação e aplicação governada. O adiamento da implementação é legítimo, mas não equivale a planejamento completo. Confiança alta; muda com esses pacotes e aceites.

### AC04 — Substantivo: estado autoritativo, stack e três velocidades continuam abertos

Evidência: anexo B36/B50/B52/B61; [Grafo “Comandos, eventos e armazenamento”](../notes/anxionos-graph-domain-model.md) deixa alternativas de confirmação institucional para Q06; [brainstorm Q06/Q07](../notes/anxionos-brainstorm.md) mantém banco/topologia como decisões abertas. O contrato transacional de [Connections](../notes/anxionos-connections-operational-contract.md) não fecha automaticamente autoridade de ordens, capital e permissões financeiras. A stack completa Astro/React, Bun/Elysia/Zod/Drizzle, runtimes Go/TS/Python/Go-Rust e observabilidade não foi consolidada num artefato de escolha.

Resolução: ADRs por autoridade/armazenamento e stack, tabela de caminhos hot/warm/cold com fronteiras e orçamento de latência, sem tratar números ilustrativos como SLO comprovado. Não se recomenda ratificar a stack só porque foi proposta pelo assistente no anexo. Confiança alta sobre pendência; escolha técnica continua do projeto.

### AC05 — Substantivo: Market/Capital/Impact/Flight Recorder preservam a intenção, faltam contratos quantitativos e operacionais

Evidência: anexo A5/A6/A8 e B47; [PRD R12–R18](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Grafo T07–T13](../notes/anxionos-graph-domain-model.md) e [roadmap E07–E11](../notes/anxionos-planejamento-end-to-end.md). Relações de instrumentos, alocação, fill e outcome existem, mas correlações/eventos de mercado, cálculo de impacto, atribuição de P&L, evidências de replay e retenção continuam para detalhamento.

Resolução: contratos de Market Data, Capital/Portfolio, Risk/Execution/Accounting e Audit/Attribution com dados exemplares e falhas. Preservar a correção atual: linhagem não prova causalidade, e replay não promete resposta idêntica de LLM. Confiança alta sobre profundidade documental; não se conclui que operações existentes estejam erradas.

### AC06 — Substantivo: algumas extensões de Connections ainda não têm desenho completo

Evidência: anexo C14/C17/C20/C25–C27/C30; [Expansão X13/X16 e EQ3/EQ8](../project-docs/proposals/0002-connections-expansao-operacional.md), [catálogo “Classificação de grupo e adequação”](../notes/anxionos-model-catalog.md) e [brainstorm Q03](../notes/anxionos-brainstorm.md). Falta fechar cada runtime local citado, ensemble/judge, herança organizacional de acesso, contrato StrategyVersion→requisitos→binding e loop de reputação/treinamento.

Resolução: preservar o baseline de binding fixo, registrar o destino e aceite dessas extensões, e detalhar a integração Strategy/Knowledge/Connections. Não é pedido para reativar seleção livre entre modelos. Confiança alta; homologação não é confundida com simples presença no registry.

### AC07 — Menor: estado histórico e regra vigente estão misturados em alguns trechos

Evidência: [PRD onboarding](../project-docs/proposals/0001-anxionos-prd-mestre.md) ainda rotula um link como Connections v0.9; [brainstorm “O que aproveitar das referências” e encerramento](../notes/anxionos-brainstorm.md) ainda menciona 39 arquivos/testes não executados e documentos v0.1, enquanto [revisão funcional](./9router-functional-coverage.md) registra reproduções posteriores e Connections está v0.12. Os links resolvem, mas o resumo de progresso pode confundir extração original com revisão vigente.

Resolução: futuramente consolidar versão/estado numa fonte única e rotular narrativas históricas. Esta auditoria só adiciona rastreabilidade; não aplica reescritas de design. Confiança alta; baixa severidade porque as atualizações posteriores estão documentadas.

## Diferenças intencionais, não lacunas

| Tema antigo | Regra vigente e justificativa |
| --- | --- |
| Router escolhe livremente modelos por capabilities/qualidade | Usuário pediu modelo predefinido; seleção resolve ofertas/contas compatíveis. Novos modelos são publicados sem substituir bindings |
| Cascata/downgrade em qualquer falha | SAME_MODEL_ONLY é baseline; combos/ensemble são extensões explícitas, sem promoção automática |
| Inteligência grande por cargo executivo | Modelos caros apenas PLANNING/SPECIAL; cargo CEO não é autorização de gasto |
| Capital de investidores em geral | Usuário confirmou capital próprio e Owner humano permanente |
| Credencial sempre curta | API key permanente pode existir só no adapter; TTL upstream não é inventado |
| Quatro fontes concorrentes de verdade | Documentação propõe proprietário por fato; escolha institucional ainda pendente |
| Grafo prova causalidade/reprodução idêntica | Registro histórico, replay e atribuição causal são diferenciados |
| Nome/grupo/janela prova capacidade | Catálogo exige evidência e admite UNKNOWN/UNCLASSIFIED; variantes são preservadas |

Referências: [brainstorm](../notes/anxionos-brainstorm.md), [operacional](../notes/anxionos-connections-operational-contract.md), [automação/custo](../notes/anxionos-catalog-automation.md), [grafo](../notes/anxionos-graph-domain-model.md).

## Matriz integral das 78 seções

A = bloco Graph 1–19; B = continuação Graph 36–63; C = Connections 1–31. A coluna Estado usa C/P/A/E definidos acima; não confundir o prefixo C do ID com a classificação. L indica linha inicial no [TXT preservado](../external-sources/conversa-graph-connections-audit-20260907.txt).

| Seção / linha | Tema | Estado | Documento atual | Evidência / parte faltante |
| --- | --- | --- | --- | --- |
| A01 / L73 | Grafo como sistema nervoso | C | [Grafo](../notes/anxionos-graph-domain-model.md), [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | Vistas do mesmo grafo e centralidade explícitas. |
| A02 / L106 | Agency como subgrafo | C | [Grafo](../notes/anxionos-graph-domain-model.md) | Hierarquia, equipes, membership e isolamento definidos conceitualmente. |
| A03 / L141 | Autorização por grafo | C | [Grafo](../notes/anxionos-graph-domain-model.md) | Grant, deny, escopo, mandato, tempo e explicação T01–T03. |
| A04 / L194 | Delegação governada | C | [Grafo](../notes/anxionos-graph-domain-model.md), [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | Delegação não amplia permissões; cadeia sem ciclos. |
| A05 / L239 | Capital Graph | P | [Grafo](../notes/anxionos-graph-domain-model.md), [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | Propriedade/alocação/exposição presentes; falta contrato completo de capital e atribuição. |
| A06 / L279 | Market Graph | P | [Grafo](../notes/anxionos-graph-domain-model.md), [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | Instrumentos/mercados/sinais presentes; correlação/eventos macro/observação sem schema completo. |
| A07 / L305 | Decision de primeira classe | C | [Grafo](../notes/anxionos-graph-domain-model.md), [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | Autor, evidência, intenção, risco, aprovação, ordem e resultado. |
| A08 / L330 | Institutional Flight Recorder | P | [Grafo](../notes/anxionos-graph-domain-model.md), [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | R18 e linhagem presentes; retenção/snapshots de entradas e método de atribuição pendentes. |
| A09 / L372 | Temporal Graph | C | [Grafo](../notes/anxionos-graph-domain-model.md) | Validade e registro separados; intervalos, revogação e T02. |
| A10 / L419 | Graph + Event Store | P | [Grafo](../notes/anxionos-graph-domain-model.md), [Brainstorm](../notes/anxionos-brainstorm.md) | Eventos/replay descritos; autoridade institucional e retenção ainda Q06/Q12. |
| A11 / L453 | Agent Brain | P | [Grafo](../notes/anxionos-graph-domain-model.md), [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | Entidades dispersas; falta contrato único de memória, experiências e contexto do agente. |
| A12 / L493 | Descoberta de agentes por capability | P | [Grafo](../notes/anxionos-graph-domain-model.md) | T04 prevê candidatos; falta ranking por disponibilidade/autoridade/reputação/custo. |
| A13 / L527 | Heartbeat e orquestração no grafo | P | [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Roadmap](../notes/anxionos-planejamento-end-to-end.md) | Heartbeats/delegação em E05; máquina ponta a ponta ainda sem spec. |
| A14 / L571 | Separação de armazenamentos e abstração | P | [Grafo](../notes/anxionos-graph-domain-model.md), [Brainstorm](../notes/anxionos-brainstorm.md) | Responsabilidades propostas; implementação/autoridade/topologia abertas. |
| A15 / L630 | GraphService e linguagem de consulta | P | [Grafo](../notes/anxionos-graph-domain-model.md) | API semântica prevista, sem contratos de todos os métodos; Cypher livre rejeitado na evolução. |
| A16 / L670 | Graph RAG | P | [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Grafo](../notes/anxionos-graph-domain-model.md), [Multimodal](../notes/anxionos-multimodal-inference.md) | Recuperação filtrada e embeddings presentes; pipeline completo de resolução/traversal/ranking pendente. |
| A17 / L728 | Dashboards como vistas do grafo | C | [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Grafo](../notes/anxionos-graph-domain-model.md) | Oito vistas, painel de nó, ações e filtros descritos. |
| A18 / L789 | Loop institucional | P | [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Roadmap](../notes/anxionos-planejamento-end-to-end.md) | Ciclo ponta a ponta previsto; aprendizado/promover mudança ainda sem contrato operacional. |
| A19 / L838 | Tese da plataforma institucional | C | [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Brainstorm](../notes/anxionos-brainstorm.md) | Visão preservada; comparação comercial não é promessa de resultado. |
| B36 / L876 | Quatro fontes de verdade / Graph Core | P | [Grafo](../notes/anxionos-graph-domain-model.md), [Brainstorm](../notes/anxionos-brainstorm.md) | Tensão reconhecida; proposta de um proprietário por fato, Q06/Q07 ainda abertas. |
| B37 / L930 | Schema de nós por domínio | P | [Grafo](../notes/anxionos-graph-domain-model.md) | Vocabulário inicial; propriedades/constraints/migrações por tipo não concluídas. |
| B38 / L985 | Catálogo oficial de edges | P | [Grafo](../notes/anxionos-graph-domain-model.md) | Relações agrupadas e cardinalidades iniciais; aliases e regras ainda a normalizar. |
| B39 / L1042 | Propriedades das relações | P | [Grafo](../notes/anxionos-graph-domain-model.md) | Envelope temporal e grants presentes; limites monetários/alavancagem por relação sem schema final. |
| B40 / L1079 | História de autoridade | C | [Grafo](../notes/anxionos-graph-domain-model.md) | Consultas validAt/knownAt e vigência explícitas. |
| B41 / L1115 | Tenant isolation | C | [Grafo](../notes/anxionos-graph-domain-model.md), [Operacional](../notes/anxionos-connections-operational-contract.md) | Escopo explícito em nós/arestas e proibição de acesso arbitrário. |
| B42 / L1150 | Agente não conhece Cypher | C | [Grafo](../notes/anxionos-graph-domain-model.md), [Connections](../notes/anxionos-connections.md) | API governada, sem storage direto. |
| B43 / L1185 | Graph Kernel e serviços | P | [Grafo](../notes/anxionos-graph-domain-model.md) | Responsabilidade descrita; GraphContext/Traversal/Lineage/Impact etc. sem APIs detalhadas. |
| B44 / L1217 | Graph Context do agente | P | [Grafo](../notes/anxionos-graph-domain-model.md), [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | T05 e fontes filtradas; composição/ranking/truncamento/atualidade ainda não fechados. |
| B45 / L1268 | Graph RAG 2.0 | P | [Grafo](../notes/anxionos-graph-domain-model.md), [Multimodal](../notes/anxionos-multimodal-inference.md), [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | Não há spec dedicada da sequência temporal/autorizada/semântica/mercado. |
| B46 / L1320 | Decision Graph navegável | C | [Grafo](../notes/anxionos-graph-domain-model.md), [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | T10–T12 e R18 ligam evidências, aprovação, execução e outcome. |
| B47 / L1374 | Impact Analysis | P | [Grafo](../notes/anxionos-graph-domain-model.md) | T13/T14/T19 existem; falta cálculo completo para estratégia/portfólio/capital e limites de traversal. |
| B48 / L1424 | Agent Reputation por domínio | P | [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Roadmap](../notes/anxionos-planejamento-end-to-end.md) | Evaluation e F7 citam reputação; métricas, amostra, decaimento e uso em seleção não definidos. |
| B49 / L1457 | Versões de agente/modelo/skill/policy | C | [Grafo](../notes/anxionos-graph-domain-model.md), [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | Identidades e versões explícitas; reprodução de LLM não é prometida. |
| B50 / L1492 | Eventos alimentam projeções | P | [Grafo](../notes/anxionos-graph-domain-model.md), [Operacional](../notes/anxionos-connections-operational-contract.md) | Contrato de Connections mais concreto; confirmação de agregados institucionais/financeiros ainda aberta. |
| B51 / L1533 | Ticks fora do grafo | C | [Grafo](../notes/anxionos-graph-domain-model.md), [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | Fronteira explícita para processamento de alta frequência. |
| B52 / L1567 | Três velocidades operacionais | P | [Brainstorm](../notes/anxionos-brainstorm.md), [Grafo](../notes/anxionos-graph-domain-model.md), [Roadmap](../notes/anxionos-planejamento-end-to-end.md) | Menção e fronteira de ticks preservadas; budgets/SLAs/interfaces por caminho ausentes. |
| B53 / L1598 | Subgrafo de portfolio e filtros | C | [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Grafo](../notes/anxionos-graph-domain-model.md) | Graph Explorer e filtros por domínio/tempo com alternativa tabular. |
| B54 / L1634 | Agency Explorer e painel lateral | C | [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md) | Nó, propriedades, histórico e ações autorizadas previstos. |
| B55 / L1672 | Oito Graph Views no mesmo grafo | C | [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Grafo](../notes/anxionos-graph-domain-model.md) | Agency/Capital/Agent/Strategy/Risk/Execution/Knowledge/Decision explícitos. |
| B56 / L1695 | CEO como orquestrador | P | [Brainstorm](../notes/anxionos-brainstorm.md), [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Roadmap](../notes/anxionos-planejamento-end-to-end.md) | CEO provisionado e coordenação definidos; decomposição/replanejamento e escolha de agentes pendentes. |
| B57 / L1723 | Auto-organização | P | [Brainstorm](../notes/anxionos-brainstorm.md), [Roadmap](../notes/anxionos-planejamento-end-to-end.md) | Prevista em F7/Q09; gatilhos, proposta, aprovação, aplicação e rollback não especificados. |
| B58 / L1757 | Agency Digital Twin | P | [Grafo](../notes/anxionos-graph-domain-model.md), [Roadmap](../notes/anxionos-planejamento-end-to-end.md) | Simulação/snapshot e isolamento citados; domínio e métricas de cenários incompletos. |
| B59 / L1794 | Simulação de mudanças no grafo | P | [Grafo](../notes/anxionos-graph-domain-model.md) | T19 e proibição de efeitos em produção; diff/merge/rebase/aplicação ainda sem protocolo. |
| B60 / L1819 | Quinze leis do SDD | P | [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Grafo](../notes/anxionos-graph-domain-model.md), [Brainstorm](../notes/anxionos-brainstorm.md) | Princípios espalhados; rastreabilidade e segregação verificável ainda incompletas. |
| B61 / L1871 | Stack completa proposta | A | [Brainstorm](../notes/anxionos-brainstorm.md), [Grafo](../notes/anxionos-graph-domain-model.md), [Roadmap](../notes/anxionos-planejamento-end-to-end.md) | Não há documento consolidado da stack/ADR: bancos candidatos citados, conjunto runtime/frontend/observabilidade sem decisão rastreada. |
| B62 / L1927 | InstitutionalGraph Contract | P | [Grafo](../notes/anxionos-graph-domain-model.md) | Contratos conceituais e T01–T20, sem interface completa versionada/erros/paginação/limites. |
| B63 / L1981 | Grafo comum a todas as experiências | C | [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Grafo](../notes/anxionos-graph-domain-model.md) | Diretriz central explícita; schema v1 completo prometido ao final continua pendente. |
| C01 / L2057 | AI Connectivity Graph | C | [Grafo](../notes/anxionos-graph-domain-model.md), [Connections](../notes/anxionos-connections.md) | Connections integra entidades, relações e consumo institucional. |
| C02 / L2101 | Provider/Connection/Endpoint/Model separados | C | [Connections](../notes/anxionos-connections.md) | Domínio distingue conta, credencial, oferta, versão e endpoint. |
| C03 / L2175 | Subdomínios de Connections | C | [Connections](../notes/anxionos-connections.md), [Operacional](../notes/anxionos-connections-operational-contract.md), [Expansão](../project-docs/proposals/0002-connections-expansao-operacional.md) | Registry, acesso, quotas, custo, saúde, routing, adapters e operação detalhados. |
| C04 / L2203 | Model Registry completo | C | [Catálogo](../notes/anxionos-model-catalog.md), [Inferência](../notes/anxionos-inference-config.md), [Multimodal](../notes/anxionos-multimodal-inference.md) | Campos/capacidades/contexto/ofertas/proveniência e modalidades documentados. |
| C05 / L2259 | Resolver modelo por capabilities | E | [Connections](../notes/anxionos-connections.md), [Catálogo](../notes/anxionos-model-catalog.md), [Brainstorm](../notes/anxionos-brainstorm.md) | Regra posterior fixa modelo; capabilities agora validam oferta/perfil e ajudam configuração. |
| C06 / L2295 | 9Router inspira, não define sistema | C | [Expansão](../project-docs/proposals/0002-connections-expansao-operacional.md), [Connections](../notes/anxionos-connections.md) | 36 famílias mapeadas com adaptação institucional e limites de extração. |
| C07 / L2336 | Graph-aware escolhe entre modelos | E | [Connections](../notes/anxionos-connections.md), [Operacional](../notes/anxionos-connections-operational-contract.md) | Graph governa elegibilidade; escolha livre de modelo substituída por binding fixo. |
| C08 / L2370 | RoutingPolicy | C | [Connections](../notes/anxionos-connections.md), [Inferência](../notes/anxionos-inference-config.md), [Operacional](../notes/anxionos-connections-operational-contract.md) | Restrições, tentativas, orçamento, parâmetros e origem versionados. |
| C09 / L2399 | Falhas e fallback | E | [Operacional](../notes/anxionos-connections-operational-contract.md), [Free/cooldown](../notes/anxionos-free-cooldown.md), [Connections](../notes/anxionos-connections.md) | Erros/retry concretos; downgrade/segundo modelo não habilitados por erro automaticamente. |
| C10 / L2441 | Multi-account | C | [Connections](../notes/anxionos-connections.md), [Operacional](../notes/anxionos-connections-operational-contract.md) | Identidade, pools, quotas e rotação próprias/PLATFORM detalhadas. |
| C11 / L2469 | Connection Health | C | [Connections](../notes/anxionos-connections.md), [Free/cooldown](../notes/anxionos-free-cooldown.md), [Expansão](../project-docs/proposals/0002-connections-expansao-operacional.md) | Saúde, indisponibilidade, probes, cooldown e SLOs por etapa previstos; metas numéricas pendentes. |
| C12 / L2495 | Quota Engine hierárquico | C | [Operacional](../notes/anxionos-connections-operational-contract.md), [Free/cooldown](../notes/anxionos-free-cooldown.md) | Reservas, janelas, grupos compartilhados e limites por escopo. |
| C13 / L2528 | AI Cost Engine | C | [Connections](../notes/anxionos-connections.md), [Operacional](../notes/anxionos-connections-operational-contract.md), [Inferência](../notes/anxionos-inference-config.md) | Atribuição, ledger, custos conhecidos/estimados, reservas e reconciliação. |
| C14 / L2558 | Modelos locais e privados | P | [Multimodal](../notes/anxionos-multimodal-inference.md), [Connections](../notes/anxionos-connections.md), [Expansão](../project-docs/proposals/0002-connections-expansao-operacional.md) | Tipos de implantação e custo cobertos; cada runtime citado ainda sem matriz de adapter homologado. |
| C15 / L2589 | Roteamento por sensibilidade | C | [Connections](../notes/anxionos-connections.md), [Operacional](../notes/anxionos-connections-operational-contract.md), [Expansão](../project-docs/proposals/0002-connections-expansao-operacional.md) | Classificação de dados, destino, região, trust e filtragem a cada tentativa. |
| C16 / L2620 | Model Cascading | E | [Connections](../notes/anxionos-connections.md), [Expansão](../project-docs/proposals/0002-connections-expansao-operacional.md), [Brainstorm](../notes/anxionos-brainstorm.md) | Extensão entre modelos não é baseline; regra posterior exige modelos fixos e autorização explícita. |
| C17 / L2655 | Model Ensemble / Judge | P | [Expansão](../project-docs/proposals/0002-connections-expansao-operacional.md), [Roadmap](../notes/anxionos-planejamento-end-to-end.md) | Fusion inventariada e F7; votação, correlação de erros, julgamento e promoção não especificados. |
| C18 / L2683 | Relação temporal Agent→Model | E | [Connections](../notes/anxionos-connections.md), [Multimodal](../notes/anxionos-multimodal-inference.md), [Inferência](../notes/anxionos-inference-config.md) | Binding versionado por finalidade preserva essência; primary/secondary/emergency não são fallback automático. |
| C19 / L2709 | AgentModelPolicy | C | [Connections](../notes/anxionos-connections.md), [Inferência](../notes/anxionos-inference-config.md) | Binding, perfil, versão e políticas por agente substituem nomenclatura antiga sem perder finalidade. |
| C20 / L2733 | Strategy exige capacidades de modelo | P | [Grafo](../notes/anxionos-graph-domain-model.md), [Connections](../notes/anxionos-connections.md) | TaskRequirements existe; contrato StrategyVersion→requisitos→binding/run não está completo. |
| C21 / L2750 | Connections Dashboard | C | [Connections](../notes/anxionos-connections.md), [Expansão](../project-docs/proposals/0002-connections-expansao-operacional.md), [Free/cooldown](../notes/anxionos-free-cooldown.md), [Catálogo](../notes/anxionos-model-catalog.md) | Jornadas e vistas de catálogo/contas/quotas/saúde/audit documentadas. |
| C22 / L2790 | Detalhe do provider | C | [Connections](../notes/anxionos-connections.md), [Expansão](../project-docs/proposals/0002-connections-expansao-operacional.md) | Contas, consumo, saúde e visibilidade própria/admin previstos. |
| C23 / L2816 | Detalhe do modelo | C | [Catálogo](../notes/anxionos-model-catalog.md), [Connections](../notes/anxionos-connections.md), [Multimodal](../notes/anxionos-multimodal-inference.md) | Oferta, capacidades, contexto, custo, estado, evidência e compatibilidade. |
| C24 / L2845 | Routing Decision Trace | C | [Connections](../notes/anxionos-connections.md), [Operacional](../notes/anxionos-connections-operational-contract.md), [Inferência](../notes/anxionos-inference-config.md) | Candidatos, exclusões, política, config, conta e tentativa rastreados. |
| C25 / L2886 | Aprender por tipo de tarefa | P | [Catálogo](../notes/anxionos-model-catalog.md), [Inferência](../notes/anxionos-inference-config.md), [Roadmap](../notes/anxionos-planejamento-end-to-end.md) | Rubricas/eval/recomendação previstas; treinamento e loop de promoção não fechados. |
| C26 / L2914 | Grafo tarefa→resultado→reputação | P | [Grafo](../notes/anxionos-graph-domain-model.md), [Catálogo](../notes/anxionos-model-catalog.md), [Roadmap](../notes/anxionos-planejamento-end-to-end.md) | Usage/eval/outcome existem; reputação operacional de modelos por domínio incompleta. |
| C27 / L2942 | Escopos platform/org/agency/pessoal | P | [Connections](../notes/anxionos-connections.md), [Grafo](../notes/anxionos-graph-domain-model.md), [Brainstorm](../notes/anxionos-brainstorm.md) | Titular/AGENCY/PLATFORM e SYSTEM_FREE claros; herança organizacional e colaboração Q03 abertas. |
| C28 / L2969 | Isolamento da credencial | C | [Connections](../notes/anxionos-connections.md), [Operacional](../notes/anxionos-connections-operational-contract.md) | CredentialRef/cofre; segredos fora do grafo, prompt e dashboard. |
| C29 / L2994 | Runtime Credential Injection | C | [Connections](../notes/anxionos-connections.md), [Operacional](../notes/anxionos-connections-operational-contract.md) | Segredo resolvido no adapter; temporário só quando suportado, sem fingir TTL da API key. |
| C30 / L3016 | Estrutura de módulos/APIs/workers | P | [Connections](../notes/anxionos-connections.md), [Expansão](../project-docs/proposals/0002-connections-expansao-operacional.md), [Roadmap](../notes/anxionos-planejamento-end-to-end.md) | Domínios e workers inventariados; SDK/schema executável e tarefas de implementação pendentes. |
| C31 / L3076 | Connections como plano de inferência institucional | C | [PRD mestre](../project-docs/proposals/0001-anxionos-prd-mestre.md), [Connections](../notes/anxionos-connections.md), [Grafo](../notes/anxionos-graph-domain-model.md) | Fronteira com Execution e consumo por agentes/serviços/humanos preservados. |

## Princípios não numerados e quinze leis

A introdução e “Minha decisão arquitetural” (L1–72 e L852–865) estão preservadas como direção no PRD e papel central do grafo. O pedido final de schema completo (L2042) continua parcial conforme AC01. Não foi interpretado “tudo vira nó” literalmente para cada tick, token ou segredo; o próprio anexo limita esse sentido.

| Lei do anexo B60 | Cobertura atual |
| --- | --- |
| 01 Identidade estável | G: contrato de nó |
| 02 Relações explícitas | G: catálogo inicial; completude por domínio pendente |
| 03 Autoridade resolvível | G: T01–T03 e regras de grant/deny |
| 04 Temporalidade crítica | G: validFrom/Until, recordedAt, knownAt |
| 05 Sem storage direto | G/P: API governada |
| 06 Capabilities/intents | G/P: delegação e TradeIntent |
| 07 Linhagem crítica | G/P: Decision/Evidence/R18 |
| 08 Evidência/versões/policy/autoridade por decisão executável | G/P: intenção/risco/aprovação; snapshot integral ainda AC05 |
| 09 Ticks fora do grafo | G/P: fronteira explícita |
| 10 Mutações derivadas de eventos | G: direção; confirmação por agregado ainda Q06 |
| 11 Isolamento Agency | G/O: escopos e grants |
| 12 Reconstrução | G/P: replay; retenção e fonte autoritativa ainda pendentes |
| 13 Sem autoexpansão | B/G/P: Owner, delegação e governança |
| 14 Risco independente de investimento | B: limite do CRO; falta matriz de segregação e teste de conflito de funções |
| 15 Execução independente de estratégia | P/G: domínios e validações separados; falta contrato explícito de funções incompatíveis e bypass |

As duas últimas não devem ser consideradas plenamente operacionalizadas só porque há agentes CIO/CRO/COO diferentes.

## Requisitos posteriores já incorporados além do anexo

Onboarding/Owner/capital próprio, stocks/cripto/ambos, distinção AGENCY/PLATFORM, visibilidade por titular/admin, multicontas/rotação/SYSTEM_FREE, effort/thinking, G1–G4/contexto, modalidades NVIDIA, free/cooldown, catálogo automático e uso caro por finalidade têm seções rastreáveis nos documentos atuais. São avanço real da documentação e não devem desaparecer numa consolidação com o anexo antigo.

## Sequência recomendada para fechar cobertura

1. Formalizar Graph Schema/Kernel/API e decisões de autoridade/eventos/stack, incluindo segregação de funções.
2. Especificar Agent Brain/Runtime/Orchestration e Knowledge/Graph RAG em uma jornada conjunta.
3. Detalhar Market/Capital/Strategy/Risk/Execution/Audit e suas fronteiras com Connections.
4. Desenvolver reputação, avaliação, auto-organização, Impact Analysis e Digital Twin com aceites próprios.
5. Consolidar rastreabilidade conversa → requisito → decisão → spec → tarefa → teste; atualizar rótulos históricos sem apagar evolução.

ADRs e specs são entregas recomendadas, não foram criadas nem consideradas aprovadas nesta revisão. Este resultado é suficiente para responder cobertura; não exige resolver agora toda a arquitetura ou reabrir escolhas confirmadas.

## Validação da auditoria

78 seções numeradas mapeadas, além da introdução e 15 leis. Fonte preservada com hash; buscas e leituras pelo OpenKnowledge; diretórios de specs/decisions vazios observados. Validação de OKF e links concluída nos cinco documentos criados/alterados nesta rodada, sem achados. Não executados testes de produto ou benchmarks e não revalidadas afirmações comerciais/técnicas upstream do texto.
