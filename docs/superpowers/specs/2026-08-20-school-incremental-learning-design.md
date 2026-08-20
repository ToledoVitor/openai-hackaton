# Missões com progresso incremental

## Objetivo

Adicionar `school_construction` como quarta missão de aprendizagem livre. Trocar o fluxo de recusa binária em **todas** as missões por revisões progressivas: cada envio deixa explícitos requisitos atendidos, requisitos novos, regressões e próximo ajuste concreto.

## Escopo

- Escola é missão independente, sem pré-requisito: atende público, localização, escala, acesso/porta, segurança e escolha de implantação.
- Moradia, hospital, reparo urbano, escola e futuras missões usam mesmo contrato de checkpoint, regressão e revisão.
- Tentativa representa a revisão atual do pedido. Interface pré-preenche último pedido editável; não concatena histórico oculto.
- Avaliação mantém critérios ainda suportados pela revisão atual; uma contradição remove apenas critérios afetados. Exemplo: `escola grande` seguido por `escola pequena` remove escala, preserva porta/acesso se ainda declarado.
- Resposta canônica traz `satisfied`, `newlySatisfied`, `regressed`, `missing`, status parcial e checkpoint seguinte. Cena aplica efeito parcial seguro para requisito ausente e melhora quando ele volta.
- Browser persiste apenas estado de exibição e recibo assinado. Servidor continua autoridade para conclusão, estado recebido e progresso entre reloads. Nenhum prompt bruto, áudio, transcrição ou resposta do provedor é persistido.

## Contrato e autoridade

`POST /api/evaluate` recebe missão, etapa, idioma, tentativa, seleção e snapshot limitado de critérios já atendidos. Para toda missão, avaliador deriva conjunto novo da extração atual e aplica tabela declarativa de invalidação por critério; cliente nunca declara regressão nem conclusão.

O recibo HMAC passa a incluir snapshot canônico limitado por missão, ligado ao `safetyIdentifier`. Ele contém somente IDs de critérios e escolhas válidas, sem texto. Recibo adulterado, critério fora da missão, resposta de provedor inválida, moderação indisponível ou falha de extração não alteram estado. Fallback permanece `retry` sem progresso inventado.

`progress.regressed` é uma lista ordenada de critérios antes atendidos que a revisão contradiz. `partial` é resultado válido e aplica checkpoints/efeitos; apenas `success` completa missão e atualiza conjunto de missões concluídas.

## Interface e cena

Cada missão mostra painel de checkpoints com três grupos localizados: concluído, corrigido nesta revisão, e ainda pendente. Feedback usa uma dica específica do primeiro requisito pendente, sem linguagem punitiva. Uma regressão informa qual decisão foi substituída e mantém o restante visível. Escola é primeiro conteúdo novo nesse modelo; não exceção de UX/API.

Escola aparece na seleção livre com propósito, conceito e briefing bilíngues. Os efeitos reutilizam catálogo documentado/procedural: construção incompleta visível para escala, acesso/porta, contexto ou segurança; conclusão remove estado incorreto. Não adicionar mídia sem proveniência CC0 comprovada.

## Segurança e privacidade

- Limites atuais de corpo, rate limit, `no-store`, validação de schema, moderação e segredo somente no servidor permanecem.
- Realtime continua opcional e só relaya avaliação HTTP; não altera checkpoints.
- Testes removem chave OpenAI e bloqueiam `openai.com`; usam extrações/fetches falsos determinísticos.

## Critérios de aceite

1. Escola pode ser escolhida antes/depois de qualquer missão e sobreviver reload via recibo válido.
2. Toda missão produz `partial`, efeito visual parcial e checklist útil para pedido incompleto; não bloqueio binário.
3. Em toda missão, revisão que satisfaz requisito pendente o move para concluído; revisão contraditória só regride requisito dependente.
4. Cliente adulterado não consegue completar/escrever checkpoints autoritativos.
5. PT/EN, teclado, mobile/desktop, texto e voz seguem utilizáveis.
6. Testes cobrem parcial, regressão, reload, troca de missão, resposta atrasada, recibo inválido e falha offline/provedor; typecheck, lint e build passam sem chamada paga.

## Fora de escopo

- Conta de usuário, banco de prompts, histórico de chat, analytics de conteúdo ou memória de conversas.
- Geração de asset novo por provedor ou chamada OpenAI durante teste.

## Evolução futura

Uma conta leve e banco de estado podem sincronizar recibos e preferências entre dispositivos. Essa evolução exige autenticação, retenção, privacidade e revogação próprias; não entra nesta entrega local e sem conta.
