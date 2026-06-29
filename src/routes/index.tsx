import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { Sparkles, History, Heart, Trash2, BookOpen } from "lucide-react";
import { AppShell, useUILang } from "@/components/AppShell";
import { SearchBar } from "@/components/SearchBar";
import { DictionaryCard } from "@/components/DictionaryCard";
import { lookupWord, wordOfTheDay, type DictionaryEntry } from "@/lib/dictionary.functions";
import {
  clearRecents, getFavorites, getRecents, getSettings, pushRecent, getDictionaryCache, setDictionaryCache
} from "@/lib/dict-store";
import { tr } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TamilLex AI · Tamil & English Dictionary" },
      { name: "description", content: "Premium AI-powered bilingual dictionary for Tamil and English with pronunciation, examples, synonyms, voice and image search." },
      { property: "og:title", content: "TamilLex AI · Bilingual Dictionary" },
      { property: "og:description", content: "Look up any Tamil or English word with AI-curated meanings, pronunciation, examples, and etymology." },
    ],
  }),
  component: Index,
});

function Index() {
  const [lang] = useUILang();
  const [q, setQ] = useState("");
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [recents, setRecentsState] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [rate, setRate] = useState(0.95);

  const lookupFn = useServerFn(lookupWord);
  const wotdFn = useServerFn(wordOfTheDay);

  useEffect(() => {
    setRecentsState(getRecents());
    setFavorites(getFavorites());
    setRate(getSettings().ttsRate);
    const sync = () => {
      setRecentsState(getRecents());
      setFavorites(getFavorites());
      setRate(getSettings().ttsRate);
    };
    window.addEventListener("tl_recents_changed", sync);
    window.addEventListener("tl_favorites_changed", sync);
    window.addEventListener("tl_settings_changed", sync);
    return () => {
      window.removeEventListener("tl_recents_changed", sync);
      window.removeEventListener("tl_favorites_changed", sync);
      window.removeEventListener("tl_settings_changed", sync);
    };
  }, []);

  // Deep-link: ?q=word triggers a lookup automatically.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const p = new URLSearchParams(window.location.search).get("q");
    if (p && p.trim()) submit(p.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcut: "/" focuses the search input.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        const el = document.querySelector<HTMLInputElement>("input[data-search-input]");
        el?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const wotd = useQuery({
    queryKey: ["wotd"],
    queryFn: () => {
      const apiKey = getSettings().apiKey;
      return wotdFn({ data: { customApiKey: apiKey } });
    },
    staleTime: 1000 * 60 * 60 * 6,
    retry: 0,
  });

  const lookup = useMutation({
    mutationFn: (word: string) => {
      const apiKey = getSettings().apiKey;
      return lookupFn({ data: { word, customApiKey: apiKey } });
    },
    onSuccess: (data, word) => {
      setEntry(data);
      pushRecent(word);
      setDictionaryCache(word, data);
    },
    onError: (e: any) => toast.error(e?.message || "Lookup failed"),
  });

  const submit = (w: string) => {
    setQ(w);
    const cached = getDictionaryCache(w);
    if (cached) {
      setEntry(cached);
      pushRecent(w);
      if (typeof window !== "undefined") window.scrollTo({ top: 180, behavior: "smooth" });
      return;
    }
    
    lookup.mutate(w);
    if (typeof window !== "undefined") window.scrollTo({ top: 180, behavior: "smooth" });
  };

  return (
    <AppShell>
      <Toaster position="top-center" richColors />

      {/* Hero */}
      <section className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 text-center"
        >
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/50 px-3 py-1 text-xs font-semibold text-sky-deep backdrop-blur">
            <Sparkles className="h-3 w-3" /> AI-powered bilingual dictionary
          </div>
          <h1
            className="mx-auto max-w-3xl text-3xl font-extrabold leading-tight tracking-tight text-sky-deep sm:text-5xl"
          >
            <span style={{ fontFamily: "'Noto Sans Tamil', system-ui" }}>தமிழ்</span>
            <span className="mx-2 text-sky-500">·</span>
            English, beautifully defined.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-sky-deep/70 sm:text-base">
            {tr("tagline", lang)}
          </p>
        </motion.div>

        <SearchBar
          value={q}
          onChange={setQ}
          onSubmit={submit}
          uiLang={lang}
          loading={lookup.isPending}
        />
      </section>

      {/* Result */}
      <AnimatePresence mode="wait">
        {lookup.isPending && <Skeleton key="skeleton" />}
        {!lookup.isPending && entry && (
          <DictionaryCard
            key={entry.word}
            entry={entry}
            uiLang={lang}
            voiceRate={rate}
            onPickSimilar={submit}
          />
        )}
      </AnimatePresence>

      {/* Word of the day + side panels */}
      {!entry && !lookup.isPending && (
        <div className="mt-2 grid gap-5 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="mb-3 flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-wider text-sky-deep/80">
              <BookOpen className="h-4 w-4" /> {tr("wotd", lang)}
            </div>
            {wotd.isLoading && <Skeleton />}
            {wotd.data && (
              <DictionaryCard
                entry={wotd.data}
                uiLang={lang}
                voiceRate={rate}
                onPickSimilar={submit}
              />
            )}
            {wotd.isError && (
              <div className="glass rounded-2xl p-6 text-sm text-muted-foreground">
                Word of the day unavailable. Try a search to get started.
              </div>
            )}
          </motion.div>

          <div className="space-y-5">
            <ListPanel
              icon={<History className="h-4 w-4" />}
              title={tr("recent", lang)}
              items={recents}
              onPick={submit}
              empty={tr("empty_recent", lang)}
              action={
                recents.length > 0 ? (
                  <button
                    onClick={() => { clearRecents(); }}
                    className="rounded-full p-1.5 text-sky-deep/60 hover:bg-white/40"
                    aria-label="Clear"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                ) : null
              }
            />
            <ListPanel
              icon={<Heart className="h-4 w-4" />}
              title={tr("favorites", lang)}
              items={favorites}
              onPick={submit}
              empty={tr("empty_fav", lang)}
            />
          </div>
        </div>
      )}
    </AppShell>
  );
}

function ListPanel({
  icon, title, items, onPick, empty, action,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  onPick: (w: string) => void;
  empty: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass-strong rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-deep/80">
          {icon}{title}
        </div>
        {action}
      </div>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">{empty}</p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 18).map((w) => (
          <button
            key={w}
            onClick={() => onPick(w)}
            className="rounded-full bg-white/55 px-3 py-1 text-sm font-medium text-sky-deep transition hover:scale-105 hover:bg-white"
            style={{ fontFamily: /[\u0B80-\u0BFF]/.test(w) ? "'Noto Sans Tamil', system-ui" : undefined }}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="glass-strong rounded-3xl p-6 sm:p-8"
    >
      <div className="space-y-4">
        <div className="h-3 w-24 overflow-hidden rounded-full bg-sky-100">
          <div className="shimmer h-full w-full" />
        </div>
        <div className="h-10 w-2/3 overflow-hidden rounded-xl bg-sky-100">
          <div className="shimmer h-full w-full" />
        </div>
        <div className="h-4 w-1/3 overflow-hidden rounded-full bg-sky-100">
          <div className="shimmer h-full w-full" />
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-24 overflow-hidden rounded-2xl bg-sky-100">
              <div className="shimmer h-full w-full" />
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
