# AI City

## Produto

Jogo curto de gestão urbana e educação em uma cidade 3D low-poly.
A aplicação apresenta a cidade, identifica o jogador e inicia quatro missões com mudanças visuais.

## Stack

- Next.js, React, TypeScript estrito e Three.js.
- Backend OpenAI em rotas de API no mesmo aplicativo.
- Assets CC0 em `public/assets/3d/cidade/`.
- Interface e conteúdo do produto em pt-BR.

## Comandos

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## Arquitetura

- `app/page.tsx`: estrutura da interface do jogo.
- `app/globals.css`: estilos da interface e da entrada.
- `src/game/main.ts`: missões, indicadores, câmera e laço principal.
- `src/game/entrada.ts`: apresentação e identificação do jogador.
- `src/game/cidade.ts`: modelos, personagens, trânsito e evolução visual.
- `app/api/`: avaliação de prompts, voz e credenciais temporárias.
- `src/domain/`: contratos e regras determinísticas do backend.

## Cuidados

- Preserve as rotas e regras do backend ao mudar o jogo.
- Nunca envie `OPENAI_API_KEY` ao navegador.
- Ruas e faixas devem manter continuidade geométrica.
- Personagens devem acompanhar o local de cada missão.
- Vazios urbanos devem aparecer como bairros ou canteiros ativos.

## API de depuração

Use `window.cidadeViva.estado()`, `escolher(id)`, `avancarMissao()`, `reiniciar()`, `focarMissao()` e `visaoGeral()` no console.
