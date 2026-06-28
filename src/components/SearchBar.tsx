import { Search, Mic, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { tr } from "@/lib/i18n";
import type { UILang } from "@/lib/dict-store";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  uiLang: UILang;
  loading?: boolean;
}

export function SearchBar({ value, onChange, onSubmit, uiLang, loading }: Props) {
  const [listening, setListening] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const recogRef = useRef<any>(null);

  useEffect(() => () => {
    try { recogRef.current?.stop?.(); } catch {}
  }, []);

  const startVoice = () => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      toast.error("Voice search not supported in this browser");
      return;
    }
    const r = new SR();
    recogRef.current = r;
    r.lang = uiLang === "ta" ? "ta-IN" : "en-US";
    r.interimResults = false;
    r.continuous = false;
    r.onstart = () => setListening(true);
    r.onerror = (e: any) => { setListening(false); toast.error(`Voice error: ${e.error || "unknown"}`); };
    r.onend = () => setListening(false);
    r.onresult = (e: any) => {
      const text = e.results?.[0]?.[0]?.transcript?.trim();
      if (text) {
        onChange(text);
        onSubmit(text);
      }
    };
    try { r.start(); } catch { setListening(false); }
  };

  const onImage = async (file: File) => {
    setOcrBusy(true);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const { data } = await Tesseract.recognize(file, "eng+tam");
      const text = (data.text || "").trim().split(/\s+/).slice(0, 1).join(" ");
      if (!text) {
        toast.error("Couldn't read any word from the image");
        return;
      }
      onChange(text);
      onSubmit(text);
    } catch (e: any) {
      toast.error(e?.message || "OCR failed");
    } finally {
      setOcrBusy(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onSubmit={(e) => { e.preventDefault(); if (value.trim()) onSubmit(value.trim()); }}
      className="glass-strong relative flex items-center gap-1 rounded-full p-2 pl-4 sm:gap-2 sm:pl-5"
    >
      <Search className="h-5 w-5 shrink-0 text-sky-600" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={tr("searchPlaceholder", uiLang)}
        className="min-w-0 flex-1 bg-transparent py-2 text-base font-medium text-sky-deep placeholder:text-sky-700/40 focus:outline-none sm:text-lg"
        autoFocus
        data-search-input
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sky-deep/60 hover:bg-white/40"
          aria-label="Clear"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImage(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="glass hidden h-10 w-10 shrink-0 place-items-center rounded-full transition hover:scale-105 sm:grid"
        aria-label={tr("imageSearch", uiLang)}
        title={tr("imageSearch", uiLang)}
      >
        {ocrBusy ? <Loader2 className="h-4 w-4 animate-spin text-sky-deep" /> : <ImageIcon className="h-4 w-4 text-sky-deep" />}
      </button>
      <button
        type="button"
        onClick={startVoice}
        className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full transition ${
          listening ? "bg-rose-500 text-white" : "glass hover:scale-105"
        }`}
        aria-label={tr("voiceSearch", uiLang)}
      >
        <Mic className={`h-4 w-4 ${listening ? "text-white" : "text-sky-deep"}`} />
        {listening && <span className="absolute inset-0 animate-ping rounded-full bg-rose-400/60" />}
      </button>
      <button
        type="submit"
        disabled={loading || !value.trim()}
        className="ml-1 grid h-10 shrink-0 place-items-center rounded-full bg-gradient-sky px-4 text-sm font-bold text-white shadow-md shadow-sky-400/40 transition hover:scale-105 disabled:opacity-50 sm:px-5"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : tr("search", uiLang)}
      </button>
    </motion.form>
  );
}