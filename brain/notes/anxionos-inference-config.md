---
title: anxionOS — effort, thinking e configuração de inferência
description: Perfis versionados, controles completos e tradução de parâmetros por oferta.
type: planning-note
status: draft
cluster: anxionos
sources:
  - id: requisito
    resource: ./anxionos-brainstorm.md
  - id: 9router
    resource: ../external-sources/9router-eb712ca-source.md
---
# Effort, thinking e configuração de inferência

Contrato de planejamento v0.1, parte de [Connections](./anxionos-connections.md). [Requisito do usuário](./anxionos-brainstorm.md): gerenciamento completo de effort, thinking e outros parâmetros. Aplica-se igualmente a agentes de empresas e agentes próprios da plataforma; cada agente mantém modelo predefinido.

## Resultado esperado

Owner e administrador configuram o comportamento de inferência por perfis versionados, veem quais opções o modelo aceita e conseguem explicar o que cada tentativa enviou. O router escolhe conexões que atendam ao modelo **e ao perfil**. Perfis não são novos modelos nem concedem acesso a contas.

A administração configura os agentes PLATFORM e seus perfis; esses agentes pertencem à plataforma e não são agentes de usuários. O Owner define perfis permitidos para seus agentes AGENCY. Edição administrativa de um perfil de agente de usuário preserva seu escopo AGENCY e suas permissões de consumo. Usuário continua vendo somente suas contas; administrador vê todas. Um perfil compartilhado pode ser template, mas as configurações privadas e os runs permanecem isolados.

## Evidência extraída do 9Router

Fonte: [snapshot integral eb712ca](../external-sources/9router-eb712ca-source.md). Leitura adicional estática dos arquivos abaixo, sem executar testes ou afirmar compatibilidade atual dos serviços externos.

| Arquivo no snapshot | Comportamento observado | Tratamento proposto no anxionOS |
| --- | --- | --- |
| open-sse/translator/concerns/thinking.js | Tabela de níveis, budgets e conversões aproximadas | Referência de adaptador; não assumir equivalência universal de esforço/tokens |
| open-sse/translator/concerns/thinkingUnified.js | Extrai intenção, traduz formatos, limita budget e remove thinking quando capabilities não indicam reasoning | Resolver e validar antes de transmitir; registrar transformações e rejeitar perda incompatível |
| open-sse/providers/thinkingLevels.js | Opções por formato, provider e padrão de modelo; possibilidade de desativação | Schema versionado por oferta, confirmado por contrato/teste; nome do modelo sozinho não certifica suporte |
| tests/unit/provider-thinking-config.test.js | Testa preservação de reasoning_effort em turnos que não são do usuário | Preservar configuração ao retornar resultados de ferramentas |

O snapshot trata formatos como reasoning_effort, reasoning.effort, output_config.effort, thinking.type/budget_tokens e thinkingConfig. São observações do código fixado, não uma tabela de suporte atual de cada fornecedor. Os adaptadores do anxionOS publicarão evidência de homologação e limitações por oferta.

## Configuração por tipo de operação

O [contrato multimodal](./anxionos-multimodal-inference.md) define ModelOperationSchema e perfis por taskKind. Effort/thinking são condicionais a operações/modelos que os suportem; não são parâmetros obrigatórios de TTS, embeddings ou OCR. O compiler aplica schema específico: voz/idioma/codec para síntese, dimensão/normalização/espaço para embeddings, limites de pares/score para reranking, duração/segmentação para STT e resolução/formato para mídia. Campo inaplicável é rejeitado ou adaptado somente por regra explícita, nunca enviado indiscriminadamente.

InferenceBindingVersion fixa o modelo e perfil de cada finalidade; o binding principal de raciocínio preserva o contrato existente. Reservas e métricas usam unidades próprias da operação; testes MM01–MM12 complementam os testes de parâmetros de linguagem.

## Catálogo completo de controles

“Completo” significa descobrir, configurar, validar, versionar, aplicar e auditar todos os controles suportados por uma oferta. Não significa enviar todos os parâmetros a todos os modelos.

| Grupo | Controles previstos | Validação |
| --- | --- | --- |
| Reasoning/effort | Modo herdado/automático/desligado/adaptativo/nível/budget; nível aceito pela oferta | Enum dinâmico; proibir desligar quando não suportado |
| Thinking budget | Limite de tokens de raciocínio, faixa e modo adaptativo | Unidade, mínimo, máximo, limites de contexto/saída e custo |
| Exposição de reasoning | Resumo ou blocos disponibilizados pelo provider; tratamento de blocos opacos | Separar execução de thinking de sua exibição; não prometer acesso ao raciocínio interno |
| Saída | maxOutputTokens, verbosity, stop sequences, número de respostas quando suportado | Limites por modelo e interferência com reasoning |
| Amostragem | temperature, topP, topK, seed, penalties, logit bias e logprobs quando disponíveis | Faixas e incompatibilidades; seed não garante determinismo |
| Estrutura | Texto, JSON, JSON Schema, strict structured output | Compatibilidade real do schema e interação com tools |
| Ferramentas | toolChoice, auto/required/none ou ferramenta específica, parallelToolCalls | Gateway restringe ferramentas e execução; habilitar tools não amplia autoridade |
| Contexto | Janela, truncamento autorizado, compactação, recuperação e cache | Política versionada; sem descarte silencioso de evidência/instrução |
| Sessão | Continuidade, ids opacos, afinidade, reaproveitamento de estado | Isolamento por run/tenant e dependência de conta/endpoint |
| Modalidades | Texto, imagem, áudio, vídeo, formato/qualidade/resolução/voz quando aplicável | Modalidades e capacidades por oferta; sem converter/remover silenciosamente |
| Transporte | Streaming, timeout, cancelamento, protocolo e limites de payload | Deadline global separado de timeout por tentativa |
| Serviço e dados | Tier/priority quando suportado, armazenamento upstream, cache e região | Política de dados e orçamento prevalece; metadado desconhecido não vira garantia |
| Extensões | Campos nativos específicos do provider | Namespace e schema próprios, allowlist, versão e auditoria |

Níveis como low/medium/high ou xhigh/max são exemplos encontrados no upstream. A interface consulta a lista da oferta; não impõe uma escala fixa universal. “Não configurado” difere de zero, false, off ou auto. Defaults do provider são explicitamente identificados.

Thinking budget, limite de saída, janela de contexto, quota e orçamento monetário são conceitos distintos. A contabilidade de reasoning pode estar incluída em outros campos segundo o provider: somas e reservas seguem o schema da oferta, evitando dupla contagem.

## Entidades e schema de capacidades

- **ParameterSchemaVersion:** oferta/adapter/modelVersion, parâmetros suportados, tipo, enum/faixa, default, unidade, campos incompatíveis/requeridos, proveniência e data da verificação.
- **InferenceProfileVersion:** dono/escopo, nome, modelo ou restrições de compatibilidade, parâmetros, baseProfileVersion, validade, autor e motivo.
- **OverridePolicyVersion:** atores, campos e faixas que podem variar por tarefa/run; limites duros e regras de adaptação.
- **EffectiveInferenceConfig:** valores resolvidos, origem por campo, configuração solicitada, mapeamento nativo, adaptações, schemaVersion, adapterVersion e hash.
- **InferenceAttempt:** referências imutáveis ao binding/perfil/política usados e parâmetros efetivamente enviados; valores confirmados pelo provider quando disponíveis.

Perfis podem ter rótulos como Rápido, Balanceado e Análise profunda. São presets internos editáveis, com valores por modelo homologado; rótulo não promete qualidade nem tem um número fixo de tokens.

## Grupo do modelo e janela de contexto

O [catálogo de modelos](./anxionos-model-catalog.md) mantém G1–G4 independentes de effort/thinking, capacidade de contexto e preço. ContextProfileVersion define limites totais/input/output e contabilidade de reasoning por oferta; o compiler verifica entrada, histórico, tools, saída reservada e margem de estimativa. Mesmo grupo não garante mesmo perfil, e maior janela não implica melhor desempenho. MC01–MC10 complementam os casos de validação.

## Tipo e complexidade da tarefa

Connections classifica o trabalho e seleciona requisitos/perfil dentro de TaskRoutingPolicyVersion. TaskRequirementsSnapshot preserva tipo, complexidade, regras e motivo; essa resolução ocorre antes da configuração efetiva do run. Complexidade não equivale automaticamente a prioridade, effort alto ou permissão de gasto.

O perfil e as capacidades exigidas filtram providers/ofertas do modelo predefinido. O usuário balanceia entre contas próprias, incluindo várias assinaturas/APIs do mesmo provider, e pode usar ofertas SYSTEM_FREE autorizadas pelo binding, conforme o [contrato operacional](./anxionos-connections-operational-contract.md). Uma classificação não autoriza escolher outro modelo; seleção entre modelos previamente autorizados por tarefa está em esclarecimento. Providers incompatíveis são excluídos, não compensados por perda silenciosa de parâmetros.

## Precedência sem ambiguidade

1. Resolver binding e modelo do agente autenticado.
2. Coletar restrições duras de plataforma, empresa, dados, credencial, oferta, orçamento e mandato de ferramentas. Interseção prevalece; perfil não pode ampliá-las.
3. Resolver defaults versionados de plataforma/empresa, perfil do agente e overrides permitidos para a tarefa, nessa ordem. Em agentes PLATFORM, usar política de agentes da plataforma em vez de inventar Agency.
4. Validar o resultado para cada oferta candidata. Configuração nativa do endpoint é regra de compatibilidade, não uma camada que pode sobrescrever silenciosamente a intenção.
5. Selecionar rota e capturar a configuração da tentativa. Revalidar limites e revogações antes de retries; preservar versão do perfil do run.
6. Compilar para protocolo nativo e registrar delta solicitado → efetivo → enviado. Resposta HTTP 200 não prova que o provider aplicou cada parâmetro.

Overrides são restritos por campos, faixas e autoridade. Agente não pode elevar effort/budget sozinho fora dessas faixas. Troca de perfil ou de modelo pelo Owner/admin afeta novos runs; alteração de run ativo é comando explícito. Limites revogados prevalecem imediatamente na fronteira de nova tentativa.

Conflitos como nível e budget simultâneos, configuração incompatível de amostragem ou tokens fora de faixa produzem erro de validação antes de chamada cobrável.

## Contrato conceitual

```typescript
type ThinkingIntent =
  | { mode: "inherit" | "auto" | "off" | "adaptive" }
  | { mode: "level"; level: string } // validado no schema da oferta
  | { mode: "budget"; budgetTokens: number };

type InferenceProfileVersion = {
  id: string;
  version: number;
  ownerScope: { kind: "AGENCY" | "PLATFORM"; id: string };
  thinking: ThinkingIntent;
  output: { maxTokens?: number; verbosity?: string; format?: string };
  sampling?: { temperature?: number; topP?: number; topK?: number };
  tools?: { choice?: string; parallel?: boolean };
  extensions?: Record<string, unknown>; // namespaces com schema e allowlist
  overridePolicyVersionId: string;
};

type ConfigResolution = {
  profileVersionId: string;
  parameterSchemaVersionId: string;
  adapterVersion: string;
  requested: Record<string, unknown>;
  effective: Record<string, unknown>;
  nativePayloadConfig: Record<string, unknown>;
  adaptations: Array<{ field: string; reason: string; policyRuleId: string }>;
};
```

Esse trecho ilustra a união de modos e a rastreabilidade, não o schema final de todos os campos. Ferramentas, schemas de saída e extensões nunca carregam chaves de provider; a identidade do titular é resolvida pelo serviço.

## Roteamento e política de adaptação

O filtro exige: modelo predefinido + versão/alias permitido + perfil compatível + grant + capacidade/quota/orçamento. Agente PLATFORM alterna contas elegíveis por requisição de forma balanceada, preservando modelo/perfil; agente AGENCY usa contas do próprio titular ou ofertas SYSTEM_FREE publicadas, com origem de consumo e financiamento explícitos. Afinidade upstream obrigatória incompatível com alternância exclui a rota PLATFORM; SINGLE_ACCOUNT_WAIT é o default técnico para única conta igual à última selecionada.

Baseline: modo STRICT. Se effort, thinking ou campo obrigatório não puder ser preservado, excluir a oferta. Sem candidatas, retornar CONFIGURATION_UNSUPPORTED, detalhando apenas rotas visíveis ao consumidor. Não trocar o modelo nem reduzir o perfil escondido.

Modo ADAPT_EXPLICITLY é opção de política: permite somente mapeamentos homologados, como nível para budget dentro de limites conhecidos. Mostrar regra, perda semântica e valor resultante na prévia e no trace. Não oferecer equivalência exata quando ela não foi demonstrada. Clamping ou omissão também contam como adaptação.

Exemplo abstrato: agente pede nível alto; conta A oferece esse nível, B aceita apenas budget numérico. STRICT exclui B; ADAPT_EXPLICITLY pode incluir B se houver mapeamento aprovado por configuração, custo reservado e limites compatíveis. O exemplo não define valores de qualquer provider.

Suffixes como model(level) e parâmetros de clientes compatíveis podem ser interpretados na entrada; nunca ultrapassam o binding/perfil autorizado. Parâmetros nativos conflitantes não vencem a política por precedência de parsing.

## Correções da revisão do 9Router

A [revisão e reproduções](../research/9router-gaps-validacao.md) confirmam riscos de portar a normalização diretamente: elevar maxOutputTokens para acomodar thinking e apagar output_config inteiro. O compiler deve preservar limites rígidos no payload final, separar os campos de reasoning dos de formato e rejeitar incompatibilidade antes do dispatch. Nem ADAPT_EXPLICITLY pode violar teto de orçamento/saída. Ver V07 no contrato operacional. São correções de contrato; compiladores e testes integrados ainda serão implementados.

## Dashboard e operação

Editor de perfil apresenta controles compatíveis com o modelo, modo avançado com validação, origem de defaults, opções herdadas, restrições, diff e histórico. Seleção de outra conta do mesmo modelo informa diferenças de suporte antes de salvar.

Prévia de rota: modelo/perfil, ofertas elegíveis, incompatibilidades, parâmetros resolvidos e faixa de custo quando estimável. Usuário vê contas próprias e disponibilidade genérica do sistema; administrador vê contas de todos os usuários e perfis dos agentes PLATFORM.

Playground é execução identificada e cobrável conforme rota; preview de configuração não chama inferência. Playground usa quota e orçamento próprios, sem executar ferramentas com efeito externo automaticamente.

Ações de aplicação: getParameterSchema, createProfile, validateProfile, previewEffectiveConfig, assignProfileToAgent, compareProfileVersions, evaluateProfile e retireProfile. Permissões distintas para editar perfil próprio, governar templates globais e configurar agentes da plataforma.

Eventos: inference.profile_created/versioned/assigned/retired; inference.config_resolved/rejected/adapted. Binding HAS_INFERENCE_PROFILE ProfileVersion; Attempt USED_CONFIG EffectiveInferenceConfig; Config CONFORMED_TO ParameterSchemaVersion.

## Uso caro condicionado à finalidade

O [contrato de catálogo automático e custo](./anxionos-catalog-automation.md) restringe modelos caros a PLANNING/SPECIAL autenticados pelo workflow e política do servidor. TaskPurpose não é taskKind, persona do agente ou texto do prompt. Reavaliar preço/custo estimado e finalidade antes de dispatch e retry; quotas/reservas hierárquicas incluem subtarefas e thinking. Mudança automática no catálogo não eleva esforço nem orçamento. Binding de planejamento/especial permanece fixo por slot; rotina com modelo restrito retorna diagnóstico sem substituir modelo.

## Custos, auditoria e avaliação

Registrar tokens disponíveis, TTFT, duração, resultado, rate limit, custo estimado/observado e configuração por tentativa. Consumo PLATFORM_INTERNAL é separado do consumo do titular, com fundingAccountId e plataforma como beneficiária, mesmo quando o segredo pertence ao usuário.

Faixas de esforço não garantem custo ou latência. Reservas usam limites reais e regra de cobrança da oferta. Evitar que thinking “auto” contorne o teto financeiro; se não houver mecanismo para limitar a tentativa conforme orçamento, a rota é inelegível.

Comparar perfis com mesma rubrica/dataset e registrar qualidade, latência, custo e falhas. Benchmark sugere alteração; não muda automaticamente o modelo/perfil do agente. Reprodutibilidade é limitada por alias, nondeterminismo e opacidade upstream.

Não registrar nem reconstruir raciocínio privado não fornecido. Quando o provider entrega resumo de reasoning ou blocos opacos necessários à continuidade, conservar conforme contrato de privacidade e sessão; não expor material de outros usuários.

## Entrega e aceitação

| Etapa | Entrega verificável |
| --- | --- |
| I1 | Schema de parâmetros e perfis com validação, versionamento e autorização |
| I2 | Resolução de precedência e compiladores nativos para adapters iniciais |
| I3 | Editor, preview, perfil do agente e visão administrativa |
| I4 | Reservas, traces, streaming e failover preservando parâmetros |
| I5 | Benchmarks, matriz de compatibilidade e expansão de todos os adapters |

Casos obrigatórios: parâmetro desconhecido, off indisponível, valor fora de faixa, conflito entre budget/nível, reasoning junto a tools, ausência vs zero, limitação de saída/contexto, failover com suporte distinto, override sem permissão, schema alterado, perfil revogado, cliente tentando se identificar como PLATFORM e dois workloads concorrendo por quota.

Aceite: configuração inválida não dispara chamada; válida gera payload esperado; adaptação gera trace; chamada sem suporte não perde configuração; custo e identidade permanecem atribuídos; usuário não inspeciona contas alheias; plataforma utiliza contas pagas/gratuitas com identidade própria.

Implementação e testes ainda pendentes. Permanecem abertos: providers iniciais, valores dos presets por modelo, limites/prioridades de uso da plataforma versus titular e metas de qualidade/custo/latência. A autorização de consumo pela plataforma já está confirmada.
