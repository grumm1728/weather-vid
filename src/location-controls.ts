import { presets } from './locations.ts';
import type { Location } from './locations.ts';

type Search = (query: string, signal: AbortSignal) => Promise<Location[]>;

export function locationControls(search: Search | undefined, onSelect: (location: Location) => void) {
  const panel = document.querySelector<HTMLDetailsElement>('#location-panel')!;
  const summary = panel.querySelector('summary')!;
  const landmarks = document.querySelector<HTMLFieldSetElement>('#landmarks')!;
  const form = document.querySelector<HTMLFormElement>('#place-search')!;
  const input = document.querySelector<HTMLInputElement>('#search-query')!;
  const status = document.querySelector<HTMLElement>('#search-status')!;
  const results = document.querySelector<HTMLUListElement>('#search-results')!;
  let request: AbortController | undefined;

  function resetSearch(): void {
    request?.abort();
    request = undefined;
    status.textContent = '';
    results.replaceChildren();
  }

  function choose(match: Location): void {
    resetSearch();
    input.value = '';
    onSelect(match);
    panel.open = false;
    summary.focus();
  }

  const buttons = presets.map(preset => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = preset.name;
    button.addEventListener('click', () => choose(preset));
    landmarks.append(button);
    return button;
  });

  panel.hidden = false;
  form.hidden = !search;
  input.addEventListener('input', resetSearch);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!search) return;
    resetSearch();
    const query = input.value.trim();
    if (query.length < 2) {
      status.textContent = 'Enter at least two characters.';
      return;
    }
    const pending = new AbortController();
    request = pending;
    status.textContent = 'Searching…';
    try {
      const matches = await search(query, pending.signal);
      if (request !== pending) return;
      const items = matches.map(match => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = match.name;
        if (match.region) {
          const region = document.createElement('small');
          region.textContent = match.region;
          button.append(region);
        }
        button.addEventListener('click', () => choose(match));
        item.append(button);
        return item;
      });
      results.replaceChildren(...items);
      status.textContent = matches.length === 0 ? 'No places found.' :
        matches.length === 1 ? '1 place found.' : `${matches.length} places found.`;
    } catch {
      if (request === pending) status.textContent = 'Search unavailable. Try again.';
    } finally {
      if (request === pending) request = undefined;
    }
  });

  return (location: Location) => {
    for (const [index, preset] of presets.entries()) {
      buttons[index].setAttribute('aria-pressed', String(preset.id === location.id));
    }
  };
}
