const BUILDINGS = Array.from({ length: 10 }, (_, index) =>
  `<span class="entrada-predio entrada-predio--${index + 1}"></span>`,
).join("");

const TREES = Array.from({ length: 6 }, (_, index) =>
  `<span class="entrada-arvore entrada-arvore--${index + 1}"></span>`,
).join("");

export function entryCityBackdropMarkup() {
  return `<div class="entrada-cidade" aria-hidden="true">
    <div class="entrada-cidade__bairro">${BUILDINGS}</div>
    <div class="entrada-cidade__parque">${TREES}</div>
    <div class="entrada-cidade__via"><span></span><span></span><span></span></div>
  </div>`;
}
