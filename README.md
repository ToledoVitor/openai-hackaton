# AI City

Jogo de gestão urbana em uma cidade low-poly interativa que reúne o frontend Three.js e o backend OpenAI no mesmo aplicativo Next.js.

A entrada apresenta a cidade, pede o nome do jogador e inicia quatro missões sobre escola, mobilidade, infraestrutura e educação.

## Executar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## Backend

Configure `OPENAI_API_KEY` em `.env` a partir de `.env.example`; a chave deve permanecer somente no servidor.

O backend preservado nesta integração expõe:

- `POST /api/evaluate` para avaliar uma tentativa de prompt.
- `POST /api/realtime-token` para criar uma credencial temporária de transcrição.
- `POST /api/speech` para gerar áudio de uma dica aprovada.

A interface 3D e as rotas de API compartilham a mesma aplicação, enquanto a conexão das missões visuais ao fluxo livre de prompts continua como próxima etapa.

## Assets

Consulte [ATTRIBUTIONS.md](ATTRIBUTIONS.md) para créditos e licenças CC0.
