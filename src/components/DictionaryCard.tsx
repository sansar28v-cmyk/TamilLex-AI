import { motion } from "framer-motion";
import {
  Volume2, Copy, Share2, Heart, Sparkles, BookA, Quote,
  GitBranch, Languages, Hash, ScrollText, Printer, Download,
  Twitter, Facebook, Mail, Link2, MessageCircle, Share,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { DictionaryEntry } from "@/lib/dictionary.functions";
import { isFavorite, toggleFavorite } from "@/lib/dict-store";
import { tr } from "@/lib/i18n";
import type { UILang } from "@/lib/dict-store";
import { toast } from "sonner";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { speak } from "@/lib/speech";

interface Props {
  entry: DictionaryEntry;
  uiLang: UILang;
  voiceRate: number;
  onPickSimilar: (w: string) => void;
}

export function DictionaryCard({ entry, uiLang, voiceRate, onPickSimilar }: Props) {
  const [fav, setFav] = useState(false);
  useEffect(() => setFav(isFavorite(entry.word)), [entry.word]);

  const isTamil = entry.language === "ta";
  const ttsLang = isTamil ? "ta-IN" : "en-US";

  const copyAll = async () => {
    const text = `${entry.word}\n${entry.pronunciation_ipa}\n\nTamil: ${entry.meaning_tamil}\nEnglish: ${entry.meaning_english}\n\nPart of speech: ${entry.part_of_speech}\nSynonyms: ${entry.synonyms.join(", ")}\nAntonyms: ${entry.antonyms.join(", ")}`;
    await navigator.clipboard.writeText(text);
    toast.success(tr("copied", uiLang));
  };

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/?q=${encodeURIComponent(entry.word)}`
    : "";
  const shareText = `${entry.word} — ${entry.meaning_english} · via TamilLex AI`;

  const shareNative = async () => {
    const data = { title: `TamilLex AI · ${entry.word}`, text: shareText, url: shareUrl };
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share(data); } catch {}
    } else {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success(tr("copied", uiLang));
    }
  };
  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success(tr("copied", uiLang));
  };
  const openShare = (url: string) => {
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  };

  const printEntry = () => {
    if (typeof window === "undefined") return;
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${entry.word} · TamilLex AI</title>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;700&family=Inter:wght@400;600;800&display=swap" rel="stylesheet">
    <style>body{font-family:Inter,system-ui,sans-serif;max-width:680px;margin:40px auto;padding:0 24px;color:#0f2a44;}
    h1{font-size:42px;margin:0;}.ipa{color:#5680a0;font-family:ui-monospace,monospace;}
    .ta{font-family:'Noto Sans Tamil',sans-serif;}h3{margin-top:24px;color:#1f6f9e;text-transform:uppercase;font-size:12px;letter-spacing:.08em}
    .chips span{display:inline-block;background:#e6f3fb;padding:4px 10px;border-radius:999px;margin:2px;font-size:14px}
    li{margin:6px 0}</style></head><body>
    <h1>${esc(entry.word)}</h1>
    <p class="ipa">${esc(entry.pronunciation_ipa || "")} · ${esc(entry.part_of_speech || "")}</p>
    <h3>Tamil meaning</h3><p class="ta">${esc(entry.meaning_tamil || "")}</p>
    <h3>English meaning</h3><p>${esc(entry.meaning_english || "")}</p>
    ${entry.synonyms.length ? `<h3>Synonyms</h3><div class="chips">${entry.synonyms.map(s=>`<span>${esc(s)}</span>`).join("")}</div>` : ""}
    ${entry.antonyms.length ? `<h3>Antonyms</h3><div class="chips">${entry.antonyms.map(s=>`<span>${esc(s)}</span>`).join("")}</div>` : ""}
    ${entry.examples_english.length ? `<h3>English examples</h3><ul>${entry.examples_english.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>` : ""}
    ${entry.examples_tamil.length ? `<h3>Tamil examples</h3><ul class="ta">${entry.examples_tamil.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>` : ""}
    ${entry.etymology ? `<h3>Etymology</h3><p>${esc(entry.etymology)}</p>` : ""}
    <p style="margin-top:32px;color:#88a;font-size:12px">TamilLex AI · ${new Date().toLocaleDateString()}</p>
    <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
    </body></html>`;
    w.document.write(html);
    w.document.close();
  };

  const downloadEntry = () => {
    const lines = [
      `# ${entry.word}`,
      `${entry.pronunciation_ipa || ""}  (${entry.part_of_speech || ""})`,
      ``,
      `Tamil: ${entry.meaning_tamil}`,
      `English: ${entry.meaning_english}`,
      ``,
      `Synonyms: ${entry.synonyms.join(", ")}`,
      `Antonyms: ${entry.antonyms.join(", ")}`,
      ``,
      `English examples:`,
      ...entry.examples_english.map((e) => `  - ${e}`),
      `Tamil examples:`,
      ...entry.examples_tamil.map((e) => `  - ${e}`),
      ``,
      `Etymology: ${entry.etymology || "—"}`,
      ``,
      `— TamilLex AI`,
    ].join("\n");
    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${entry.word}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    toast.success(tr("done", uiLang));
  };

  return (
    <motion.article
      key={entry.word}
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="glass-strong relative overflow-hidden rounded-3xl p-5 sm:p-8"
    >
      <div className="pointer-events-none absolute inset-x-0 -top-24 h-48 bg-gradient-to-b from-sky-300/40 to-transparent blur-2xl" />

      {/* Headword row */}
      <header className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-600">
            <Sparkles className="h-3.5 w-3.5" /> {entry.language === "ta" ? "தமிழ்" : entry.language === "en" ? "English" : "—"}
            <span className="rounded-full bg-sky-100/70 px-2 py-0.5 text-[10px] text-sky-deep">
              {entry.part_of_speech}
            </span>
          </div>
          <h2
            className="break-words text-4xl font-extrabold tracking-tight text-sky-deep sm:text-5xl"
            style={{ fontFamily: isTamil ? "'Noto Sans Tamil', system-ui" : undefined }}
          >
            {entry.word}
          </h2>
          {(entry.pronunciation_ipa || entry.pronunciation_tamil) && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {entry.pronunciation_ipa && (
                <span className="font-mono">{entry.pronunciation_ipa}</span>
              )}
              {entry.pronunciation_tamil && (
                <span
                  className="rounded-full bg-white/50 px-2 py-0.5 text-xs"
                  style={{ fontFamily: isTamil ? undefined : "'Noto Sans Tamil', system-ui" }}
                >
                  {entry.pronunciation_tamil}
                </span>
              )}
              <button
                onClick={() => speak(entry.word, ttsLang, voiceRate)}
                className="grid h-8 w-8 place-items-center rounded-full bg-gradient-sky text-white shadow shadow-sky-400/40 transition hover:scale-110"
                aria-label="Pronounce"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <IconBtn label={tr("favorite", uiLang)} onClick={() => setFav(toggleFavorite(entry.word))}>
            <Heart className={`h-4 w-4 ${fav ? "fill-rose-500 text-rose-500" : "text-sky-deep"}`} />
          </IconBtn>
          <IconBtn label={tr("copy", uiLang)} onClick={copyAll}>
            <Copy className="h-4 w-4 text-sky-deep" />
          </IconBtn>
          <IconBtn label={tr("print", uiLang)} onClick={printEntry}>
            <Printer className="h-4 w-4 text-sky-deep" />
          </IconBtn>
          <IconBtn label={tr("download", uiLang)} onClick={downloadEntry}>
            <Download className="h-4 w-4 text-sky-deep" />
          </IconBtn>
          <Popover>
            <PopoverTrigger asChild>
              <button
                aria-label={tr("share", uiLang)}
                className="glass grid h-9 w-9 place-items-center rounded-full transition hover:scale-110 hover:bg-white/70"
              >
                <Share2 className="h-4 w-4 text-sky-deep" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="glass-strong w-60 rounded-2xl border-0 p-2">
              <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-deep/70">
                {tr("shareOn", uiLang)}
              </div>
              <ShareItem
                icon={<Share className="h-4 w-4" />}
                label={tr("shareNative", uiLang)}
                onClick={shareNative}
              />
              <ShareItem
                icon={<MessageCircle className="h-4 w-4 text-emerald-600" />}
                label="WhatsApp"
                onClick={() => openShare(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`)}
              />
              <ShareItem
                icon={<Twitter className="h-4 w-4 text-sky-500" />}
                label="X / Twitter"
                onClick={() => openShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`)}
              />
              <ShareItem
                icon={<Facebook className="h-4 w-4 text-blue-600" />}
                label="Facebook"
                onClick={() => openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`)}
              />
              <ShareItem
                icon={<Mail className="h-4 w-4 text-rose-500" />}
                label="Email"
                onClick={() => openShare(`mailto:?subject=${encodeURIComponent(`TamilLex AI · ${entry.word}`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`)}
              />
              <ShareItem
                icon={<Link2 className="h-4 w-4 text-sky-deep" />}
                label={tr("copyLink", uiLang)}
                onClick={copyLink}
              />
            </PopoverContent>
          </Popover>
        </div>
      </header>

      <div className="my-6 h-px bg-gradient-to-r from-transparent via-sky-300/60 to-transparent" />

      {/* Meanings */}
      <div className="grid gap-4 md:grid-cols-2">
        <MeaningBlock
          icon={<Languages className="h-4 w-4" />}
          label={tr("meaning_ta", uiLang)}
          text={entry.meaning_tamil}
          tamil
          onSpeak={() => entry.meaning_tamil && speak(entry.meaning_tamil, "ta-IN", voiceRate)}
        />
        <MeaningBlock
          icon={<BookA className="h-4 w-4" />}
          label={tr("meaning_en", uiLang)}
          text={entry.meaning_english}
          onSpeak={() => entry.meaning_english && speak(entry.meaning_english, "en-US", voiceRate)}
        />
      </div>

      {/* Synonyms / Antonyms */}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <WordChips label={tr("synonyms", uiLang)} items={entry.synonyms} tone="sky" onPick={onPickSimilar} tamil={isTamil} />
        <WordChips label={tr("antonyms", uiLang)} items={entry.antonyms} tone="rose" onPick={onPickSimilar} tamil={isTamil} />
      </div>

      {/* Word forms */}
      {entry.word_forms.length > 0 && (
        <Section icon={<GitBranch className="h-4 w-4" />} title={tr("forms", uiLang)}>
          <div className="grid gap-2 sm:grid-cols-2">
            {entry.word_forms.map((f, i) => (
              <div key={i} className="glass rounded-xl px-3 py-2">
                <div
                  className="text-sm font-semibold text-sky-deep"
                  style={{ fontFamily: isTamil ? "'Noto Sans Tamil', system-ui" : undefined }}
                >
                  {f.form}
                </div>
                <div className="text-xs text-muted-foreground">{f.description}</div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Examples */}
      {(entry.examples_english.length + entry.examples_tamil.length) > 0 && (
        <Section icon={<Quote className="h-4 w-4" />} title={`${tr("examples_en", uiLang)} / ${tr("examples_ta", uiLang)}`}>
          <div className="grid gap-3 md:grid-cols-2">
            <ExampleList items={entry.examples_english} rate={voiceRate} lang="en-US" />
            <ExampleList items={entry.examples_tamil} rate={voiceRate} lang="ta-IN" tamil />
          </div>
        </Section>
      )}

      {/* Etymology */}
      {entry.etymology && (
        <Section icon={<ScrollText className="h-4 w-4" />} title={tr("etymology", uiLang)}>
          <p className="glass rounded-xl p-4 text-sm leading-relaxed text-foreground/85">
            {entry.etymology}
          </p>
        </Section>
      )}

      {/* Similar */}
      {entry.similar_words.length > 0 && (
        <Section icon={<Hash className="h-4 w-4" />} title={tr("similar", uiLang)}>
          <div className="flex flex-wrap gap-2">
            {entry.similar_words.map((w) => (
              <button
                key={w}
                onClick={() => onPickSimilar(w)}
                className="glass rounded-full px-3 py-1.5 text-sm font-medium text-sky-deep transition hover:scale-105 hover:bg-white/70"
                style={{ fontFamily: isTamil ? "'Noto Sans Tamil', system-ui" : undefined }}
              >
                {w}
              </button>
            ))}
          </div>
        </Section>
      )}
    </motion.article>
  );
}

function IconBtn({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="glass grid h-9 w-9 place-items-center rounded-full transition hover:scale-110 hover:bg-white/70"
    >
      {children}
    </button>
  );
}

function ShareItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-sky-deep transition hover:bg-white/60"
    >
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/60">{icon}</span>
      {label}
    </button>
  );
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]!));
}

function MeaningBlock({ icon, label, text, onSpeak, tamil }: { icon: React.ReactNode; label: string; text: string; onSpeak: () => void; tamil?: boolean }) {
  return (
    <div className="glass-tint rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wider text-sky-deep/80">
        <span className="flex items-center gap-1.5">{icon}{label}</span>
        {text && (
          <button onClick={onSpeak} className="grid h-7 w-7 place-items-center rounded-full bg-white/60 transition hover:bg-white">
            <Volume2 className="h-3.5 w-3.5 text-sky-deep" />
          </button>
        )}
      </div>
      <p
        className="text-base leading-relaxed text-foreground"
        style={{ fontFamily: tamil ? "'Noto Sans Tamil', system-ui" : undefined }}
      >
        {text || "—"}
      </p>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-sky-deep/80">
        {icon}{title}
      </h3>
      {children}
    </section>
  );
}

function WordChips({ label, items, tone, onPick, tamil }: { label: string; items: string[]; tone: "sky" | "rose"; onPick: (w: string) => void; tamil?: boolean }) {
  if (!items.length) return null;
  const cls = tone === "sky"
    ? "bg-sky-100/70 text-sky-deep hover:bg-sky-200/80"
    : "bg-rose-100/70 text-rose-700 hover:bg-rose-200/80";
  return (
    <div className="glass rounded-2xl p-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-wider text-sky-deep/80">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((w) => (
          <button
            key={w}
            onClick={() => onPick(w)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition ${cls}`}
            style={{ fontFamily: tamil ? "'Noto Sans Tamil', system-ui" : undefined }}
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

function ExampleList({ items, rate, lang, tamil }: { items: string[]; rate: number; lang: "en-US" | "ta-IN"; tamil?: boolean }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((s, i) => (
        <li key={i} className="glass flex items-start gap-2 rounded-xl p-3 text-sm">
          <span
            className="flex-1"
            style={{ fontFamily: tamil ? "'Noto Sans Tamil', system-ui" : undefined }}
          >
            “{s}”
          </span>
          <button onClick={() => speak(s, lang, rate)} className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/60 transition hover:bg-white">
            <Volume2 className="h-3.5 w-3.5 text-sky-deep" />
          </button>
        </li>
      ))}
    </ul>
  );
}