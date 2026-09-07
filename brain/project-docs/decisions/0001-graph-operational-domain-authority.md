---
type: decision
title: Grafo operacional com autoridade por domínio
description: Registrar centralidade do grafo e baseline proposto de confirmação, eventos e projeções.
status: draft
decision_status: proposed
date: 2026-09-07
deciders:
  - Arquitetura
  - Owner
tags:
  - decision
  - graph
  - anxionos
---
# Grafo operacional e autoridade de domínio

## Context

A [conversa preservada](../../external-sources/conversa-graph-connections-audit.md) posiciona o grafo como modelo operacional, mas alterna entre Graph Core, transações e “quatro fontes de verdade”. A [auditoria AC04](../../research/auditoria-cobertura-conversa.md) identifica a ambiguidade. Connections já especifica confirmação transacional; capital, ordens e grants precisam de uma regra compatível. Não existe aplicação implantada verificada nesta base.

A direção de produto — entidades conectadas, autoridade resolvida pelo grafo e agentes via capabilities — foi pedida pelo usuário. A disposição física abaixo é proposta técnica para completar o planejamento autorizado, ainda não um aceite de implantação. Status decisório: proposto.

## Decision

Manteremos o grafo institucional como modelo operacional comum. O baseline proposto confirma cada fato no domínio proprietário em PostgreSQL com journal/outbox atômicos; Neo4j projeta relações/histórico para o Graph Kernel, Timescale mantém observações de mercado e pgvector índices semânticos. NATS JetStream transporta eventos sem substituir o journal durável. A autorização obtida no grafo só fundamenta efeito externo após revalidação autoritativa de epochs e limites, conforme [contrato institucional](../specs/001-institutional-contract/spec.md).

Consideramos journal e todas as transações no Graph Core: aproxima escrita e traversal, mas amplia o acoplamento entre ledger, quotas, autoridade e capacidades do engine. Consideramos PostgreSQL sem Graph Core: reduz operação inicial, mas deixa o centro relacional exigido dependente de consultas e projeções caseiras. A alternativa escolhida preserva o grafo governado e uma fronteira transacional explícita, aceitando consistência eventual da visualização.

A escolha de Neo4j e stack é baseline proposto, condicionada ao spike de edição/licença/desempenho; não se presume Graph Types ou outra função de versão comercial específica. Este registro complementa o [PRD](../proposals/0001-anxionos-prd-mestre.md); não altera seu status draft. Não há ADR anterior a substituir.

## Consequences

Fica possível reconstruir projeções e explicar quem confirmou cada fato. Falha do grafo não corrompe o ledger, mas impede consultas/delegações que exigem contexto atual e pode bloquear novos envios. A equipe assume custo de operar múltiplos armazenamentos, medir lag, manter upcasters e testar restores; a abstração não torna migração entre engines gratuita.

Identidades/eventos/API são compromissos caros de reverter após clientes e histórico existirem. Adapter, topology e geração da projeção são reversíveis por rebuild/switch. Reavaliar este baseline se benchmark de T01–T20, custo operacional ou isolamento demonstrar inadequação, preservando as quinze leis e os contratos externos. Aceite final da disposição física pertence a Arquitetura/Owner após P01; não foi fabricado nesta sessão.
