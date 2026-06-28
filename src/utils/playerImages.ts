import type { ImageMetadata } from 'astro';

const portraitModules = import.meta.glob<{ default: ImageMetadata }>(
  '../images/players/*-portrait.png',
  { eager: true },
);
const crestModules = import.meta.glob<{ default: ImageMetadata }>(
  '../images/players/*-crest.png',
  { eager: true },
);

function lookup(
  modules: Record<string, { default: ImageMetadata }>,
  id: string,
  suffix: string,
): ImageMetadata | null {
  const entry = Object.entries(modules).find(([path]) => path.endsWith(`/${id}-${suffix}.png`));
  return entry ? entry[1].default : null;
}

export function getPortrait(id: string): ImageMetadata | null {
  return lookup(portraitModules, id, 'portrait');
}

export function getCrest(id: string): ImageMetadata | null {
  return lookup(crestModules, id, 'crest');
}
