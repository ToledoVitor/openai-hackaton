export type BrandWordmarkVariant = "header" | "hero" | "profile";

const BRAND_NAME = "AI City";

function lettersMarkup() {
  return '<span class="brand-wordmark__ai" aria-hidden="true">AI</span>'
    + '<span class="brand-wordmark__city" aria-hidden="true">City</span>';
}

export function brandWordmarkMarkup(variant: BrandWordmarkVariant) {
  return `<span class="brand-wordmark brand-wordmark--${variant}" role="img" aria-label="${BRAND_NAME}">${lettersMarkup()}</span>`;
}

export function BrandWordmark({ variant }: { variant: BrandWordmarkVariant }) {
  return (
    <span className={`brand-wordmark brand-wordmark--${variant}`} role="img" aria-label={BRAND_NAME}>
      <span className="brand-wordmark__ai" aria-hidden="true">AI</span>
      <span className="brand-wordmark__city" aria-hidden="true">City</span>
    </span>
  );
}
