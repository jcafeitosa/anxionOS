---
title: Isolamento de fixtures PostgreSQL v1
description: Contrato de isolamento e critérios de aceitação para testes concorrentes do anxionOS.
type: specification
status: draft
owner: QA e engenharia
issue: ANX-56
tags:
  - testing
  - postgresql
  - concurrency
  - gates
---
# Isolamento de fixtures PostgreSQL v1

**Issue:** ANX-56  
**Status:** draft de especificação; nenhuma alteração de código nesta etapa  
**Relaciona:** [matriz de gates](./gate-readiness-matrix.md) e [roadmap](./execution-roadmap.md).

## Problema observado

O teste de `OrganizationUnitOfWork` passa quando executado isoladamente, mas a suíte ampla de organizations apresentou falha no registro de `domain_journal`. Os arquivos de teste criam pools independentes e executam `TRUNCATE` em `beforeAll` contra o mesmo banco. Em execução paralela, uma suite pode limpar dados de outra; isso também pode produzir timeouts e erros de ciclo de vida do pool.

A evidência atual distingue:

- teste isolado do UoW: 2/2 passou;
- suíte por diretório em uma execução: 41 passou e 1 falhou;
- execução posterior durante alterações paralelas: houve erro transitório de import, que não foi reproduzido no import direto nem no teste isolado.

Portanto, o defeito confirmado é falta de isolamento/coordenação de fixture; o erro transitório de import permanece apenas observação, não causa confirmada.

## Contrato da fixture

Toda suite que usa PostgreSQL deve possuir um namespace de teste que não possa ser limpo por outra suite concorrente. O namespace pode ser:

1. banco/schema dedicado por worker;
2. prefixo de dados com limpeza condicionada ao namespace;
3. serialização explícita para testes que exigem banco compartilhado.

A escolha deve ser única para o conjunto de testes e não pode alterar o comportamento de produção.

A fixture deve:

- criar schema necessário de forma idempotente;
- registrar seu identificador de worker/run;
- limpar somente seu próprio namespace;
- encerrar pools apenas os que criou;
- permitir execução isolada e paralela;
- falhar explicitamente quando a configuração apontar para banco não seguro;
- não usar dados ou credenciais de produção.

## Critérios de aceitação

| Critério | Evidência |
| --- | --- |
| UoW passa isolado | Comando e saída de teste anexados |
| Suíte organizations passa em execução paralela | Comando, contagem e saída sem falhas |
| Duas suites concorrentes não apagam dados uma da outra | Teste de corrida com namespaces distintos |
| Rollback e journal/outbox permanecem atômicos | Testes de commit e rollback |
| Pool não é encerrado por outra suite | Execução repetida sem erro “pool after end” |
| Falha de configuração é fail-closed | Fixture rejeita banco/namespace inseguro |
| Produção não é alterada | diff restrito a testes/fixture e revisão de boundary |
| Regressão é rastreada | ANX-56 e parecer G3 correspondente |

## Hipóteses a testar

- H1: schema por worker elimina interferência sem serializar toda a suíte.
- H2: limpeza por namespace é suficiente quando tabelas têm identificador de namespace.
- H3: serialização é necessária somente para migrações/DDL globais.
- H4: o runner ou a configuração atual pode estar compartilhando processo/pool de forma não declarada.

H1 deve ser testada primeiro. Se não for viável com a infraestrutura disponível, registrar a razão e testar H2/H3; não escolher uma alternativa apenas por conveniência.

## Não aceito

- aumentar timeout para mascarar corrida;
- repetir o teste até passar;
- remover asserções de journal/outbox;
- trocar banco real por mock sem justificar a perda de cobertura;
- usar `TRUNCATE` global em `beforeAll` quando suites podem executar em paralelo;
- declarar G3 aprovado pelo teste isolado enquanto a suíte integrada falha.

## Evidência atual e próximo passo

A hipótese H1 foi validada como mitigação operacional: `bun test tests/organizations --max-concurrency=1` passou com 42 testes e 0 falhas. A execução concorrente anterior reproduziu falha de `domain_journal` e timeouts compatíveis com `TRUNCATE` cruzado. Isso confirma a interferência de fixture, mas serialização não prova isolamento paralelo por namespace.

Antes de marcar G3 como verde, escolher e implementar uma destas estratégias: schema/banco por worker (preferida), namespace de dados com limpeza isolada, ou serialização formal documentada como limitação aceita. Depois, escrever um teste de corrida que falhe sob a fixture atual, observar o RED, implementar a menor mudança e executar novamente a suíte completa. A produção não deve ser modificada nesta issue.
