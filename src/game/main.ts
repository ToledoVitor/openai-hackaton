import { getStoredLanguage } from '../client/language';
import { uiText } from '../client/ui-copy';
import { mostrarEntrada, type PlayerProfile } from './entrada';

export type GameRuntime = {
  start(profile: PlayerProfile): Promise<void>;
};

type LoadFailureView = {
  loading: { classList: { add(name: string): void } };
  loadingText: { textContent: string | null };
  showRetry(label: string, onRetry: () => void): void;
};

type BootstrapDependencies = {
  showEntry: () => Promise<PlayerProfile>;
  loadRuntime: () => Promise<GameRuntime>;
};

const defaultDependencies: BootstrapDependencies = {
  showEntry: mostrarEntrada,
  loadRuntime: () => import('./runtime'),
};

export async function bootstrapGame(dependencies: BootstrapDependencies = defaultDependencies) {
  const profile = await dependencies.showEntry();
  const runtime = await dependencies.loadRuntime();
  await runtime.start(profile);
}

export function renderLoadFailure(
  language: PlayerProfile['language'],
  view: LoadFailureView,
  reload: () => void,
) {
  view.loadingText.textContent = uiText(language, 'loading_error');
  view.showRetry(uiText(language, 'retry'), reload);
  view.loading.classList.add('erro');
}

function showLoadFailure() {
  const loading = document.querySelector<HTMLElement>('#carregando');
  const loadingText = document.querySelector<HTMLElement>('#carregando-texto');
  const retry = document.querySelector<HTMLButtonElement>('#recarregar-cidade');
  if (!loading || !loadingText || !retry) return;
  renderLoadFailure(
    getStoredLanguage(window.localStorage),
    {
      loading,
      loadingText,
      showRetry(label, onRetry) {
        retry.textContent = label;
        retry.hidden = false;
        retry.onclick = onRetry;
      },
    },
    () => window.location.reload(),
  );
}

if (typeof window !== 'undefined') {
  void bootstrapGame().catch(showLoadFailure);
}
