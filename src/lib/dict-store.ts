// Client-side persistence for recents, favorites, and preferences.
export type UILang = "ta" | "en";
export type ThemeMode = "light" | "dark";

export interface Settings {
  uiLang: UILang;
  voiceLang: UILang;
  ttsRate: number;
  theme: ThemeMode;
  fontScale: number; // 0.9 .. 1.2
}

const DEFAULTS: Settings = {
  uiLang: "ta",
  voiceLang: "en",
  ttsRate: 0.95,
  theme: "light",
  fontScale: 1,
};

const isBrowser = () => typeof window !== "undefined";

export function getSettings(): Settings {
  if (!isBrowser()) return DEFAULTS;
  try {
    const raw = localStorage.getItem("tl_settings");
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export function setSettings(s: Settings) {
  if (!isBrowser()) return;
  localStorage.setItem("tl_settings", JSON.stringify(s));
  window.dispatchEvent(new Event("tl_settings_changed"));
}

export function getRecents(): string[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem("tl_recents") || "[]");
  } catch {
    return [];
  }
}

export function pushRecent(word: string) {
  if (!isBrowser()) return;
  const list = getRecents().filter((w) => w.toLowerCase() !== word.toLowerCase());
  list.unshift(word);
  localStorage.setItem("tl_recents", JSON.stringify(list.slice(0, 25)));
  window.dispatchEvent(new Event("tl_recents_changed"));
}

export function clearRecents() {
  if (!isBrowser()) return;
  localStorage.removeItem("tl_recents");
  window.dispatchEvent(new Event("tl_recents_changed"));
}

export function getFavorites(): string[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem("tl_favorites") || "[]");
  } catch {
    return [];
  }
}

export function toggleFavorite(word: string) {
  if (!isBrowser()) return false;
  const list = getFavorites();
  const i = list.findIndex((w) => w.toLowerCase() === word.toLowerCase());
  if (i >= 0) list.splice(i, 1);
  else list.unshift(word);
  localStorage.setItem("tl_favorites", JSON.stringify(list));
  window.dispatchEvent(new Event("tl_favorites_changed"));
  return i < 0;
}

export function isFavorite(word: string): boolean {
  return getFavorites().some((w) => w.toLowerCase() === word.toLowerCase());
}

export function clearFavorites() {
  if (!isBrowser()) return;
  localStorage.removeItem("tl_favorites");
  window.dispatchEvent(new Event("tl_favorites_changed"));
}

export function resetAll() {
  if (!isBrowser()) return;
  localStorage.removeItem("tl_favorites");
  localStorage.removeItem("tl_recents");
  localStorage.removeItem("tl_settings");
  window.dispatchEvent(new Event("tl_favorites_changed"));
  window.dispatchEvent(new Event("tl_recents_changed"));
  window.dispatchEvent(new Event("tl_settings_changed"));
}