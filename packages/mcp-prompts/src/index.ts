export * from "./types.js";
import type { CatalogEntry } from "./types.js";
import { loadPrompts } from "./prompts/loader.js";

let _prompts: CatalogEntry[] | null = null;

const getPrompts = async (): Promise<CatalogEntry[]> => {
  if (_prompts === null) {
    _prompts = await loadPrompts();
  }
  return _prompts;
};

export const promptsCatalog = {
  get prompts() {
    throw new Error("Use getPrompts() instead of promptsCatalog.prompts");
  },
};

export const getEnabledPrompts = async () => {
  const prompts = await getPrompts();
  const enabled = [];
  for (const p of prompts) {
    if (p.enabled) enabled.push(p.prompt);
  }
  return enabled;
};

export const getPromptById = async (id: string) => {
  const prompts = await getPrompts();
  for (const p of prompts) {
    if (p.id === id) return p;
  }
  return undefined;
};

export const getPromptsByCategory = async (category: string) => {
  const prompts = await getPrompts();
  const filtered = [];
  for (const p of prompts) {
    if (p.category === category && p.enabled) filtered.push(p);
  }
  return filtered;
};

export { getPrompts };

// For testing only
export const _resetCache = () => {
  _prompts = null;
};
