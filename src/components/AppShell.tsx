import { Link } from "@tanstack/react-router";
import { BookOpenText, Settings as SettingsIcon, Languages, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { getSettings, setSettings, type UILang } from "@/lib/dict-store";
import { tr } from "@/lib/i18n";

export function useUILang(): [UILang, (l: UILang) => void] {
  const [lang, setLang] = useState<UILang>("ta");
  useEffect(() => {
    const sync = () => setLang(getSettings().uiLang);
    sync();
    window.addEventListener("tl_settings_changed", sync);
    return () => window.removeEventListener("tl_settings_changed", sync);
  }, []);
  const update = (l: UILang) => {
    const s = getSettings();
    setSettings({ ...s, uiLang: l });
  };
  return [lang, update];
}

/**
 * Applies theme + font scale globally based on settings.
 * Mounted once at the AppShell root.
 */
function useApplyAppearance() {
  useEffect(() => {
    const apply = () => {
      const s = getSettings();
      const root = document.documentElement;
      root.classList.toggle("dark", s.theme === "dark");
      root.style.fontSize = `${Math.round(16 * s.fontScale)}px`;
    };
    apply();
    window.addEventListener("tl_settings_changed", apply);
    return () => window.removeEventListener("tl_settings_changed", apply);
  }, []);
}

export function AppShell({ children }: { children: ReactNode }) {
  const [lang, setLang] = useUILang();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useApplyAppearance();
  useEffect(() => {
    const sync = () => setTheme(getSettings().theme);
    sync();
    window.addEventListener("tl_settings_changed", sync);
    return () => window.removeEventListener("tl_settings_changed", sync);
  }, []);
  const toggleTheme = () => {
    const s = getSettings();
    setSettings({ ...s, theme: s.theme === "dark" ? "light" : "dark" });
  };
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* floating background blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full bg-[#87CEEB]/55 blur-3xl animate-blob" />
        <div className="absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full bg-[#b8e3f4]/60 blur-3xl animate-blob" style={{ animationDelay: "-6s" }} />
        <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-[#5fb8e5]/40 blur-3xl animate-blob" style={{ animationDelay: "-12s" }} />
      </div>

      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="sticky top-0 z-40 px-3 pt-3 sm:px-6 sm:pt-5"
      >
        <div className="glass-strong mx-auto flex max-w-6xl items-center gap-3 rounded-2xl px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-sky shadow-md shadow-sky-400/40">
              <BookOpenText className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-extrabold tracking-tight text-sky-deep sm:text-lg">
                TamilLex<span className="text-sky-500"> AI</span>
              </div>
              <div className="hidden truncate text-[11px] text-muted-foreground sm:block">
                {tr("tagline", lang)}
              </div>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <div className="glass hidden items-center gap-0.5 rounded-full p-1 sm:flex">
              {(["ta", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    lang === l
                      ? "bg-gradient-sky text-white shadow"
                      : "text-sky-deep hover:bg-white/40"
                  }`}
                >
                  {l === "ta" ? "தமிழ்" : "English"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="glass grid h-10 w-10 place-items-center rounded-full sm:hidden"
              aria-label="Switch language"
            >
              <Languages className="h-4 w-4 text-sky-deep" />
            </button>
            <button
              onClick={toggleTheme}
              className="glass grid h-10 w-10 place-items-center rounded-full transition hover:scale-105"
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {theme === "dark"
                ? <Sun className="h-4 w-4 text-sky-deep" />
                : <Moon className="h-4 w-4 text-sky-deep" />}
            </button>
            <Link
              to="/settings"
              className="glass grid h-10 w-10 place-items-center rounded-full transition hover:scale-105"
              activeProps={{ className: "bg-gradient-sky text-white" }}
              aria-label="Settings"
            >
              <SettingsIcon className="h-4 w-4 text-sky-deep" />
            </Link>
          </div>
        </div>
      </motion.header>

      <main className="mx-auto w-full max-w-6xl px-3 pb-20 pt-6 sm:px-6 sm:pt-10">
        {children}
      </main>

      <footer className="pb-6 text-center text-xs text-sky-deep/70">
        TamilLex AI · Crafted with care · {new Date().getFullYear()}
      </footer>
    </div>
  );
}