---
title: Connections e 9Router — gaps e validação
description: Revisão do desenho, reproduções locais e resolução rastreável.
type: research-note
status: draft
date: 2026-09-07
cluster: anxionos
sources:
  - id: upstream
    resource: ../external-sources/9router-eb712ca-source.md
  - id: design
    resource: ../notes/anxionos-connections.md
  - id: proposal
    resource: ../project-docs/proposals/0002-connections-expansao-operacional.md
---
# Connections e 9Router — gaps e validação

Revisão consultiva, com correções de design autorizadas pelo pedido do usuário de identificar gaps, erros e melhorias e resolvê-los. Alvos: Connections v0.7 lido integralmente, contrato de inferência, proposta operacional e extensão de catálogo gratuito. Resolução incorporada em [Connections v0.8](../notes/anxionos-connections.md) e no [contrato operacional v1](../notes/anxionos-connections-operational-contract.md). Sem implantação, inferência real ou alteração no repositório remoto.

## Argumento e escopo

O Owner quer consumir suas assinaturas/APIs e modelos gratuitos do sistema, preservando o modelo e perfil de cada agente. PLATFORM tem identidade administrativa própria e pode consumir contas dos usuários em rotação. Por isso autorização e compatibilidade precisam anteceder seleção e reserva de capacidade. O 9Router oferece mecanismos úteis; copiar sua aplicação inteira não produz automaticamente isolamento institucional.

Rubrica: identidade/isolamento; catálogo/modelo/perfil; multicontas/quotas/rotação; recuperação; custo/dados; atualização/homologação. A [extração existente](./9router-extracao-connections.md) já preservava todo o repositório; esta revisão acrescenta evidência executável e fecha contratos, sem repetir o inventário. Não há ADRs aceitos ou postmortems no projeto. Não existe aplicação Connections implementada no conteúdo do projeto examinado.

## Fonte e método

Fonte primária fixada: [9Router eb712ca](../external-sources/9router-eb712ca-source.md), commit eb712ca821f0ba6bc41043fbd14494c5af5daba5, pacote 0.5.69. [Consulta remota preservada](../external-sources/9router-head-verification.json) em 2026-09-07 retorna o mesmo HEAD. Hash do tar conferido: e488d01363f0aaca2e3898080330cd63726deb7230c7a93cce58a93f55c1631e.

Foram reexaminados os corpos de seleção, persistência de conexões, fallback, refresh, resolução de modelo, normalização de thinking e chamada de capacity adapter. Leitura estática das áreas não implica revisão de todos os 1.540 arquivos. As suítes oficiais upstream não foram executadas.

[Harness final](./9router-probes-1.mjs) e [resultados finais](./9router-probes-results-1.json): Node v26.8.1, oito reproduções locais. Corpos de função vieram do snapshot; imports foram substituídos por fixtures explicitamente sintéticas para DB, registry, capabilities e auth. O classificador de erros usa a configuração original. Relógio monotônico simulado no ensaio de rotação evita empate artificial de timestamps. Não houve uso de segredo real, provider externo ou rede de inferência. A primeira execução revelou empate de relógio no harness; ele foi corrigido antes da execução final. As versões sem sufixo são o ensaio preliminar preservado, não o resultado final.

Esses ensaios demonstram comportamento das funções, não impacto completo no fluxo de produção. Em particular, o teste de output_config não demonstra perda de um campo suportado por um provider real: é um guard de composição para o nosso compiler.

## Achados priorizados e resolução

“Bloqueante” significa não portar/habilitar aquele comportamento em Connections como está. Não é declaração de que o 9Router inteiro seja defeituoso. Confiança é da evidência delimitada, não de compatibilidade atual dos providers. DC = contrato corrigido/documentado; PC = patch candidato local validado; HP = implementação/homologação pendente.

| ID / severidade / confiança | Evidência e problema | Resolução aplicada e aceite | O que mudaria a avaliação |
| --- | --- | --- | --- |
| G01 — bloqueante de design; alta | Connections v0.7 dizia acesso AGENCY somente próprio, mas a conversa posterior inclui gratuitos do sistema; inferência já citava disponibilidade genérica | DC: OWNER_PRIVATE e SYSTEM_FREE separados; publicação administrativa, grant, conta interna oculta e financiamento explícito. V01/V02 | Se “gratuitos” significar redistribuir contas de outros Owners, será outra decisão, não equivalência automática |
| G02 — bloqueante de adaptação; alta | [connectionsRepo.js:106–153](https://github.com/decolua/9router/blob/eb712ca821f0ba6bc41043fbd14494c5af5daba5/src/lib/db/repos/connectionsRepo.js#L106), P03: APIs com mesmo provider/nome são mescladas no mesmo ID | DC/HP: nome só rótulo; IDs explícitos para atualização; conta, OAuth grant e grupo remoto distintos; nenhuma sobrescrita por nome. V03 | Um produto de conta única poderia aceitar essa semântica; nosso requisito é multicontas |
| G03 — bloqueante funcional; alta | [accountFallback.js:120](https://github.com/decolua/9router/blob/eb712ca821f0ba6bc41043fbd14494c5af5daba5/open-sse/services/accountFallback.js#L120), P01: específico expirado mascara global ativo; [auth.js:295–339](https://github.com/decolua/9router/blob/eb712ca821f0ba6bc41043fbd14494c5af5daba5/src/sse/services/auth.js#L295), P08: sucesso remove global sem versão/causa | PC para avaliação OR dos locks; DC/HP para encerramento versionado de bloqueio, sem liberar por sucesso antigo. V06 | Prova de que nunca coexistem locks ou respostas concorrentes reduziria impacto; os campos permitem os estados testados |
| G04 — bloqueante de adaptação; alta para teto, média para campos independentes | [thinkingUnified.js:205–268](https://github.com/decolua/9router/blob/eb712ca821f0ba6bc41043fbd14494c5af5daba5/open-sse/translator/concerns/thinkingUnified.js#L205), P04: 512 vira 65.535; P05: stripAll remove output_config inteiro | DC/HP: compiler verifica payload final, não eleva teto rígido e preserva/valida campos independentes; conflito é erro. V07 | Se limite não fosse rígido, elevação poderia ser intenção de produto. P05 necessita teste de integração para afirmar perda real |
| G05 — bloqueante de adaptação; alta | [model.js:118](https://github.com/decolua/9router/blob/eb712ca821f0ba6bc41043fbd14494c5af5daba5/open-sse/services/model.js#L118), P06: alias desconhecido infere OpenAI; [chat.js:141](https://github.com/decolua/9router/blob/eb712ca821f0ba6bc41043fbd14494c5af5daba5/src/sse/handlers/chat.js#L141) pode aumentar candidatos via capacity adapter | DC/HP: binding e alias estritos; nenhum combo/capacity switch implícito; complexidade escolhe requisitos/perfil. V07 | Mudança explícita para política multi-modelo, ainda não confirmada |
| G06 — bloqueante multiempresa; alta, estática | [connectionsRepo.js:70–90](https://github.com/decolua/9router/blob/eb712ca821f0ba6bc41043fbd14494c5af5daba5/src/lib/db/repos/connectionsRepo.js#L70) filtra provider/isActive e detalhe por ID; tokens nos dados serializados no mesmo repo | DC/HP: repositórios com escopo obrigatório, grants de inferência distintos de leitura, cofre e projeções autorizadas em todos os canais. V01 | Uma fronteira externa integral comprovada poderia isolar instâncias; não atende sozinha ao pool PLATFORM compartilhado |
| G07 — bloqueante distribuído; alta, estática | [auth.js:10](https://github.com/decolua/9router/blob/eb712ca821f0ba6bc41043fbd14494c5af5daba5/src/sse/services/auth.js#L10) usa mutex do processo; [oauthCredentialManager.js:11 e 134](https://github.com/decolua/9router/blob/eb712ca821f0ba6bc41043fbd14494c5af5daba5/open-sse/services/oauthCredentialManager.js#L134) usa Map local | DC/HP: transação autoritativa para reserva/dispatch; lease/fencing e CAS por família de credencial; grupos de limite compartilhados. V03/V05/V08 | Deployment estritamente de um processo reduz concorrência entre réplicas, mas não resolve quotas remotas/refresh de grant compartilhada |
| G08 — substantivo de semântica; alta | [auth.js:135–191](https://github.com/decolua/9router/blob/eb712ca821f0ba6bc41043fbd14494c5af5daba5/src/sse/services/auth.js#L135), P07: padrão sticky=3 produz A/A/A/B/B/B; contratos anteriores deixavam conta única e conjuntos variáveis abertos | DC/HP: sequência por conta no dispatch, garantia só sob conjunto estável, SINGLE_ACCOUNT_WAIT e rejeição de afinidade incompatível. V04 | Se usuário autorizar reutilização ou afinidade, muda política; upstream sticky é opção deliberada, não bug |
| G09 — bloqueante de recuperação; alta | [accountFallback.js:23–49](https://github.com/decolua/9router/blob/eb712ca821f0ba6bc41043fbd14494c5af5daba5/open-sse/services/accountFallback.js#L23), P02: erro 422 desconhecido permite fallback; Connections v0.7 separava incerteza, mas não fechava lease/idempotência do ciclo | DC/HP: erros terminais, deadline/retry budget, payload hash, NOT_SENT vs UNKNOWN_OUTCOME, parcial sem continuação falsa. V08 | Contrato remoto que prove idempotência/status pode permitir retry seguro, por adapter |
| G10 — substantivo financeiro; alta | v0.7 e [proposta operacional](../project-docs/proposals/0002-connections-expansao-operacional.md) deixavam divisão titular/PLATFORM aberta; [auth.js:46–69](https://github.com/decolua/9router/blob/eb712ca821f0ba6bc41043fbd14494c5af5daba5/src/sse/services/auth.js#L46) cria recurso noauth sem identidade institucional de financiamento | DC/HP: política exigida antes de compartilhamento, reserva titular sem empréstimo implícito, fundingSource/capacityResource para noauth, zero ao usuário separado de custo upstream. V02/V05/V09 | Dados reais de planos/quotas ajustam valores e observadores, não eliminam distinções |
| G11 — bloqueante para dados privados em destinos não qualificados; alta de contrato | Proposta A1 já identificava conta contribuinte, histórico upstream e destino como fronteiras distintas; dashboard privado não oculta conteúdo do operador remoto | DC/HP: TrustProfile por destino/dados, sessão/cache isolados, rede governada, classe desconhecida não aceita conteúdo privado. V01/V10 | Evidência por adapter de isolamento/retenção permite ampliar dados elegíveis |
| G12 — substantivo de entrega; alta | Inventário/README e 236 testes inventariados não comprovam cada assinatura ou capability; propostas repetiam hipóteses sem estado de ativação | DC/HP: matriz por adapter/release/capability, configuração obrigatória, contratos V01–V10, canary/rollback e estado explícito para dependência ausente | Homologação real permite promover capacidade; licença do código não certifica serviço remoto |

## Patch localizado e regressão

Foi preparado [patch de isModelLockActive](./9router-account-lock.patch) sobre o snapshot imutável. A função passa a verificar independentemente os bloqueios específico e global com o mesmo instante. Não altera mecanismos de quotas, grants ou clearAccountError.

[Teste de regressão](./9router-lock-regression.mjs), oito casos: sem locks; específico expirado/global ativo; específico ativo/global expirado; ambos expirados; global único; modelo nulo; específico inválido/global ativo; outro modelo. Original: duas falhas. Cópia com patch: oito passam, zero falhas. O patch não foi aplicado ao upstream remoto nem integrado a uma aplicação anxionOS.

**G03 está parcialmente corrigido em código:** a limpeza concorrente por sucesso exige contrato de versão/causa no estado autoritativo, não simplesmente apagar uma linha sem avaliar callbacks em voo. Está incluída em V06. Não anunciar o subsistema de quotas como corrigido por este patch.

## Resoluções no modelo

O [contrato operacional v1](../notes/anxionos-connections-operational-contract.md) fecha a semântica de cada gap. As escolhas adotadas nesta revisão são defaults técnicos em rascunho: OWN_FIRST, SAME_MODEL_ONLY, STRICT, SINGLE_ACCOUNT_WAIT, capacidade compartilhada só com limites explícitos e nenhuma promoção automática de confiança. Preservam regras do usuário sem atribuir a ele aprovação de percentuais, preços ou fornecedores que não escolheu.

Correções propagadas para brainstorm, Connections, inferência, grafo, PRD mestre, proposta de expansão e plano E06. C1–C4 passam a incluir V01–V10. Catálogo SYSTEM_FREE não transforma grants PLATFORM de contas particulares em acesso de clientes.

## Alternativas e custos

- Fork inteiro/sidecar: acelera demonstração e aproveita UI, mas adiciona outro control plane e não elimina os gaps institucionais.
- Instância por Owner: simplifica parte do isolamento; exige federação para PLATFORM e contabilidade comum.
- Núcleo modular próprio + adapters/fixtures selecionados: mantém regras coerentes; exige implementar admissão, ledger, segredos e homologação. É a direção de planejamento mantida.
- Coordenação global de rotação serializa a decisão e pode limitar throughput. Medir antes de fragmentar; não prometer rotação global usando mutexes independentes.
- Perfil estrito, dados qualificados e orçamento explícito reduzem rotas possíveis. Diagnóstico de indisponibilidade faz parte do produto, sem relaxar essas regras silenciosamente.

## O que está e não está resolvido

- **Concluído nesta revisão:** comparação com fonte fixada/HEAD, oito reproduções, patch candidato e oito regressões, contratos corrigidos e cenários V01–V10 definidos.
- **Auditoria documental concluída:** 13 documentos, zero erros e zero avisos nos validadores executados (OKF e links). Propagação das origens SYSTEM_FREE/OWNER_PRIVATE e estados de resolução conferida; não equivale a teste de implementação ou validação de todos os estilos Markdown.
- **Não concluído:** implementação integrada de Connections, teste distribuído real, suíte oficial upstream, performance, compatibilidade comercial/técnica das assinaturas, produção e correções upstream publicadas.
- **Configuração necessária antes de ativar:** providers/modelos iniciais; quotas e budgets; reserva titular/PLATFORM; custeio de SYSTEM_FREE; retenção e SLO/RPO/RTO. O desenho agora define o comportamento quando faltam valores, em vez de presumir ilimitado.
- **Escolha ainda aberta:** trocar modelos por tipo de tarefa. Baseline permanece modelo predefinido, como solicitado; não impede implementar todo o caminho SAME_MODEL_ONLY.

## Checkpoint

- [x] Cobertura anterior e rubrica delimitadas.
- [x] Artefatos principais e dependências lidos; ausência de ADR/postmortem conferida.
- [x] Fonte preservada e HEAD/hash verificados.
- [x] Reproduções locais e regressão do patch executadas.
- [x] Contrato de resolução escrito.
- [x] Propagação e auditoria documental final: 13 documentos, OKF/links sem achados.
