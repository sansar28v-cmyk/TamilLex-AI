import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Volume2, Sun, Moon, Trash2, Heart, History, RotateCcw, Sparkles, Keyboard } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  clearFavorites, clearRecents, getSettings, resetAll, setSettings,
  type ThemeMode, type UILang,
} from "@/lib/dict-store";
import { tr } from "@/lib/i18n";
import { toast } from "sonner";
import { speak } from "@/lib/speech";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings · TamilLex AI" },
      { name: "description", content: "Adjust language and voice preferences for TamilLex AI." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [uiLang, setUiLang] = useState<UILang>("ta");
  const [voiceLang, setVoiceLang] = useState<UILang>("en");
  const [rate, setRate] = useState(0.95);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [fontScale, setFontScale] = useState(1);
  const [customApiKey, setCustomApiKey] = useState("");

  useEffect(() => {
    const s = getSettings();
    setUiLang(s.uiLang);
    setVoiceLang(s.voiceLang);
    setRate(s.ttsRate);
    setTheme(s.theme);
    setFontScale(s.fontScale);
    setCustomApiKey(s.apiKey || "");
  }, []);

  const save = (next: Partial<ReturnType<typeof getSettings>>) => {
    const cur = getSettings();
    setSettings({ ...cur, ...next });
  };

  const testVoice = () => {
    const text = voiceLang === "ta" ? "வணக்கம், இது உங்கள் குரல் சோதனை." : "Hello, this is your voice test.";
    speak(text, voiceLang === "ta" ? "ta-IN" : "en-US", rate);
  };

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto max-w-2xl"
      >
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-sky-deep/80 hover:text-sky-deep">
          <ArrowLeft className="h-4 w-4" /> {tr("home", uiLang)}
        </Link>

        <div className="glass-strong rounded-3xl p-6 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-sky-deep">
            {tr("settings", uiLang)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tr("tagline", uiLang)}
          </p>

          <div className="mt-6 space-y-6">
            <Field label={tr("uiLanguage", uiLang)}>
              <Segmented
                value={uiLang}
                onChange={(v) => { setUiLang(v); save({ uiLang: v }); }}
                options={[{ v: "ta", label: "தமிழ்" }, { v: "en", label: "English" }]}
              />
            </Field>

            <Field label={tr("theme", uiLang)}>
              <Segmented
                value={theme}
                onChange={(v) => { setTheme(v); save({ theme: v }); }}
                options={[
                  { v: "light", label: (<span className="inline-flex items-center gap-1.5"><Sun className="h-3.5 w-3.5" />{tr("light", uiLang)}</span>) as any },
                  { v: "dark", label: (<span className="inline-flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" />{tr("dark", uiLang)}</span>) as any },
                ]}
              />
            </Field>

            <Field label={`${tr("fontSize", uiLang)} · ${Math.round(fontScale * 100)}%`}>
              <input
                type="range"
                min={0.85}
                max={1.25}
                step={0.05}
                value={fontScale}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setFontScale(v);
                  save({ fontScale: v });
                }}
                className="w-full accent-sky-500"
              />
            </Field>

            <Field label={tr("voiceLanguage", uiLang)}>
              <Segmented
                value={voiceLang}
                onChange={(v) => { setVoiceLang(v); save({ voiceLang: v }); }}
                options={[{ v: "ta", label: "தமிழ்" }, { v: "en", label: "English" }]}
              />
            </Field>

            <Field label={`${tr("speakRate", uiLang)} · ${rate.toFixed(2)}×`}>
              <input
                type="range"
                min={0.5}
                max={1.5}
                step={0.05}
                value={rate}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRate(v);
                  save({ ttsRate: v });
                }}
                className="w-full accent-sky-500"
              />
              <button
                onClick={testVoice}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-gradient-sky px-4 py-2 text-sm font-bold text-white shadow shadow-sky-400/40"
              >
                <Volume2 className="h-4 w-4" /> Test voice
              </button>
            </Field>

            <Field label={tr("customApiKey", uiLang)}>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="AQ.Ab8..."
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="w-full rounded-xl border border-sky-100 bg-white/50 px-4 py-2 text-sm text-sky-deep focus:border-sky-500 focus:outline-none dark:border-sky-900/30 dark:bg-slate-900/50"
                />
                <button
                  onClick={() => {
                    save({ apiKey: customApiKey });
                    toast.success(tr("apiKeySaved", uiLang));
                  }}
                  className="rounded-xl bg-gradient-sky px-4 py-2 text-sm font-bold text-white shadow shadow-sky-400/40 cursor-pointer transition active:scale-95"
                >
                  {uiLang === "ta" ? "சேமி" : "Save"}
                </button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {tr("customApiKeyDesc", uiLang)}
              </p>
            </Field>

            <Field label={tr("clear", uiLang)}>
              <div className="flex flex-wrap gap-2">
                <DangerBtn icon={<History className="h-4 w-4" />} onClick={() => { clearRecents(); toast.success(tr("done", uiLang)); }}>
                  {tr("clearRecent", uiLang)}
                </DangerBtn>
                <DangerBtn icon={<Heart className="h-4 w-4" />} onClick={() => { clearFavorites(); toast.success(tr("done", uiLang)); }}>
                  {tr("clearFav", uiLang)}
                </DangerBtn>
                <DangerBtn icon={<RotateCcw className="h-4 w-4" />} onClick={() => {
                  if (window.confirm(tr("resetConfirm", uiLang))) { resetAll(); toast.success(tr("done", uiLang)); }
                }}>
                  {tr("resetAll", uiLang)}
                </DangerBtn>
              </div>
            </Field>

            <div className="rounded-2xl bg-sky-100/50 p-4 text-xs text-sky-deep/80">
              <div className="mb-1 flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <Keyboard className="h-3.5 w-3.5" /> {tr("shortcut", uiLang)}
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                TamilLex AI v1.0 · Crafted with care
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-deep/80">{label}</div>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { v: T; label: React.ReactNode }[] }) {
  return (
    <div className="glass inline-flex rounded-full p-1">
      {options.map((o) => (
        <button
          key={o.v as string}
          onClick={() => onChange(o.v)}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            value === o.v ? "bg-gradient-sky text-white shadow" : "text-sky-deep hover:bg-white/40"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function DangerBtn({ children, onClick, icon }: { children: React.ReactNode; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="glass inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:scale-105 hover:bg-rose-50"
    >
      {icon}{children}
    </button>
  );
}