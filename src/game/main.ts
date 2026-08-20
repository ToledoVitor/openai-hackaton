import { getStoredLanguage } from '../client/language';
import { uiText } from '../client/ui-copy';
import { mostrarEntrada, type PlayerProfile } from './entrada';

export type GameRuntime = {
  start(profile: PlayerProfile): Promise<void> | void;
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

function showLoadFailure() {
  const loading = document.querySelector<HTMLElement>('#carregando');
  const loadingText = document.querySelector<HTMLElement>('#carregando-texto');
  if (!loading || !loadingText) return;
  loadingText.textContent = uiText(getStoredLanguage(window.localStorage), 'loading_error');
  loading.classList.add('erro');
}

if (typeof window !== 'undefined') {
  void bootstrapGame().catch(showLoadFailure);
}
