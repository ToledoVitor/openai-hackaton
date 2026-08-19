# AI City

Jogo de gestão urbana em uma cidade low-poly interativa que reúne o frontend Three.js e o backend OpenAI no mesmo aplicativo Next.js.

A entrada apresenta a cidade, pede o nome do jogador e inicia quatro missões sobre escola, mobilidade, infraestrutura e educação.

## Acesso público

Temos uma versão pública onde você pode testar a ideia. Ela foi feita usando a feature de sites do Codex
[Jogar AI City](https://cidade-viva-hackathon.pr-vitortoledo.chatgpt.site)

## Executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Backend

Configure `OPENAI_API_KEY` em `.env` a partir de `.env.example`; a chave deve permanecer somente no servidor.

O backend preservado nesta integração expõe:

- `POST /api/evaluate` para avaliar tentativas nas quatro missões, em português ou inglês.
- `POST /api/realtime-token` para criar sessão temporária de conversa por voz, com áudio bidirecional e tool `submit_prompt`.
- `POST /api/speech` para gerar áudio de uma dica aprovada.

A sessão Realtime nunca decide progresso. O frontend encaminha `submit_prompt` para `/api/evaluate` e aplica somente `progress` e `effectKeys` retornados pelo avaliador determinístico.

## Documentação

- [Design da API bilíngue para quatro missões](docs/superpowers/specs/2026-08-19-mission-evaluation-api-design.md)
- [Contrato HTTP e integração Realtime Voice](docs/API.md)
- [Catálogo de efeitos para geração de assets](docs/ASSET-EFFECT-CATALOG.md)

## Assets

Consulte [ATTRIBUTIONS.md](ATTRIBUTIONS.md) para créditos e licenças CC0.

## Áudio

Trilha urbana e efeitos usam arquivos CC0 existentes. Fontes, autores, licenças e checksums ficam em [`public/audio/SOURCES.md`](public/audio/SOURCES.md).

O áudio inicia após primeira interação do jogador. Controle no topo permite silenciar ou reativar. Para ouvir isoladamente:

```bash
npm run audio:preview
```

## MIT license