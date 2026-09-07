---
type: decision
title: Adotar organização modular do backend
description: Seguir a árvore backend/apps, modules, services, packages, tests e deploy aceita pelo usuário.
status: stable
decision_status: accepted
date: 2026-09-07
deciders:
  - Owner
tags:
  - decision
  - backend
  - architecture
---
# Adotar organização modular do backend

## Context

A conclusão do planejamento exigia mostrar onde os domínios e contratos seriam implementados. Em 2026-09-07, foi apresentada ao usuário a árvore backend/apps, modules, services, packages, tests e deploy, com 23 módulos e detalhamento de Connections. O usuário confirmou: “vamos documentar essa proposta e vamos seguila”.

O projeto está em documentação, sem backend implantado verificado. A escolha organiza a construção futura e evita concentrar regras em rotas ou dividir prematuramente cada pasta em serviço. A [estrutura adotada](../../notes/anxionos-backend-structure.md) registra a árvore e o ownership.

## Decision

Seguiremos a estrutura modular documentada: apps como composition roots, modules como donos dos casos de uso/estado, packages como contratos e infraestrutura comum, services para runtimes especializados Go/Python, tests por nível e deploy para operação. Connections terá seus contextos próprios de contas/providers/modelos/ofertas/bindings/profiles/routing/pools/quota/cooldown/usage; Graph Kernel fornecerá interface governada sem assumir a escrita de todos os domínios.

Foram consideradas a concentração em uma aplicação sem fronteiras de domínio e a criação imediata de um microservice por módulo. A primeira dificulta ownership e verificação de dependências; a segunda multiplica deploys/coordenação antes de carga e equipe justificarem. A escolha permite módulos separados no mesmo backend e extração posterior por contrato. Integra o [SDD](../specs/001-institutional-contract/spec.md). Este aceite trata da organização apresentada; não ratifica automaticamente valores comerciais, vendors homologados ou operação com capital real.

## Consequences

Engenharia deve seguir a árvore e as regras de import/ownership em novos pacotes; mudanças materiais exigem atualizar o registro, justificativa e plano de migração. A equipe ganha localização previsível de domínio/adapters/testes, mas assume mais fronteiras, interfaces e testes arquiteturais do que uma aplicação pequena sem módulos.

Não criar todos os diretórios vazios nem processos separados por pasta. Runtimes Go/Python precisam manter contrato de jobs/eventos e não duplicar estado de negócio. A organização é reversível antes de código/consumidores; renomear/extrair módulos depois de implementados tem custo de imports, migrations e deploy. Reavaliar extração por evidência de carga/isolamento/equipe, preservando contratos públicos.

Não substitui o [registro0001](./0001-graph-operational-domain-authority.md): centralidade/autoridade física e organização de código são decisões relacionadas, com estados de aceite distintos.
