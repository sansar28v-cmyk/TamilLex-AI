import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const LookupSchema = z.object({
  word: z.string().min(1).max(80),
  customApiKey: z.string().optional(),
});

export interface DictionaryEntry {
  word: string;
  language: "ta" | "en" | "unknown";
  pronunciation_ipa: string;
  pronunciation_tamil: string;
  meaning_tamil: string;
  meaning_english: string;
  part_of_speech: string;
  synonyms: string[];
  antonyms: string[];
  word_forms: { form: string; description: string }[];
  examples_english: string[];
  examples_tamil: string[];
  etymology: string;
  similar_words: string[];
}

const SYSTEM = `You are TamilLex AI, a precise bilingual Tamil/English dictionary.
Return ONLY valid JSON matching the schema. Never include markdown fences or commentary.
If the input word is invalid or not a real word in either language, set all fields to reasonable empty values and "part_of_speech" to "unknown".
Always provide BOTH Tamil and English meanings regardless of input language.
Tamil text must use proper Tamil script (தமிழ்).`;

const SCHEMA_HINT = `{
  "word": string (the headword, normalized),
  "language": "ta" | "en" | "unknown",
  "pronunciation_ipa": string (IPA like /wɜːrd/),
  "pronunciation_tamil": string (Tamil transliteration if input is English, or romanized if input is Tamil),
  "meaning_tamil": string (concise Tamil definition),
  "meaning_english": string (concise English definition),
  "part_of_speech": string (noun, verb, adjective, etc.),
  "synonyms": string[] (3-6 items, in same language as the headword),
  "antonyms": string[] (2-5 items, in same language as the headword),
  "word_forms": [{"form": string, "description": string}] (e.g. plural, past tense, conjugations),
  "examples_english": string[] (2 natural English sentences using the word),
  "examples_tamil": string[] (2 natural Tamil sentences using the word in Tamil script),
  "etymology": string (1-2 sentences on origin),
  "similar_words": string[] (4-6 related words in same language)
}`;

export const lookupWord = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LookupSchema.parse(d))
  .handler(async ({ data }): Promise<DictionaryEntry> => {
    let apiKey = data.customApiKey || process.env.OPENROUTER_API_KEY || process.env.LOVABLE_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    
    // Fallback to client-side Vite env if available
    if (!apiKey) {
      const viteEnv = (import.meta as any).env;
      apiKey = viteEnv?.VITE_OPENROUTER_API_KEY || viteEnv?.VITE_LOVABLE_API_KEY || viteEnv?.VITE_GEMINI_API_KEY || viteEnv?.VITE_OPENAI_API_KEY;
    }

    if (!apiKey) {
      throw new Error("AI gateway / API key not configured. Please add OPENROUTER_API_KEY, LOVABLE_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY to your .env file.");
    }

    let isGemini = false;
    let isOpenRouter = false;
    let isOpenAI = false;
    let isLovable = false;

    if (apiKey.startsWith("sk-or-")) {
      isOpenRouter = true;
    } else if (apiKey.startsWith("sk-")) {
      isOpenAI = true;
    } else if (apiKey.startsWith("AQ.")) {
      isLovable = true;
    } else {
      isGemini = true;
    }

    let res: Response;
    if (isOpenRouter) {
      const url = "https://openrouter.ai/api/v1/chat/completions";
      const model = "google/gemini-2.5-pro";
      
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:8080",
          "X-Title": "TamilLex AI",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: `${SYSTEM}\n\nSchema:\n${SCHEMA_HINT}` },
            { role: "user", content: `Look up the word: "${data.word}"\nReturn JSON only.` },
          ],
          response_format: { type: "json_object" },
        }),
      });
    } else if (isGemini) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Look up the word: "${data.word}"\nReturn JSON only.`,
                },
              ],
            },
          ],
          systemInstruction: {
            parts: [
              {
                text: `${SYSTEM}\n\nSchema:\n${SCHEMA_HINT}`,
              },
            ],
          },
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      });
    } else {
      let url = "https://ai.gateway.lovable.dev/v1/chat/completions";
      let model = "google/gemini-2.5-flash";

      if (isOpenAI) {
        url = "https://api.openai.com/v1/chat/completions";
        model = "gpt-4o-mini";
      }

      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: `${SYSTEM}\n\nSchema:\n${SCHEMA_HINT}` },
            { role: "user", content: `Look up the word: "${data.word}"\nReturn JSON only.` },
          ],
          response_format: { type: "json_object" },
        }),
      });
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Rate limit reached. Please wait a moment.");
      if (res.status === 402) throw new Error("AI credits exhausted. Add credits in Settings → Workspace.");
      throw new Error(`Lookup failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    const content = isGemini
      ? (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}")
      : (json.choices?.[0]?.message?.content ?? "{}");
    let parsed: DictionaryEntry;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error("AI returned malformed response");
    }
    // Normalize defaults
    return {
      word: parsed.word || data.word,
      language: (parsed.language as DictionaryEntry["language"]) || "unknown",
      pronunciation_ipa: parsed.pronunciation_ipa || "",
      pronunciation_tamil: parsed.pronunciation_tamil || "",
      meaning_tamil: parsed.meaning_tamil || "",
      meaning_english: parsed.meaning_english || "",
      part_of_speech: parsed.part_of_speech || "unknown",
      synonyms: parsed.synonyms ?? [],
      antonyms: parsed.antonyms ?? [],
      word_forms: parsed.word_forms ?? [],
      examples_english: parsed.examples_english ?? [],
      examples_tamil: parsed.examples_tamil ?? [],
      etymology: parsed.etymology || "",
      similar_words: parsed.similar_words ?? [],
    };
  });

export const wordOfTheDay = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ customApiKey: z.string().optional() }).parse(d))
  .handler(async ({ data }): Promise<DictionaryEntry> => {
    // Deterministic-ish per day, picked client-side from a curated list then enriched.
    const pool = [
      "serendipity", "ephemeral", "luminous", "wanderlust", "petrichor",
      "அன்பு", "வாழ்க்கை", "கனவு", "ஆகாயம்", "மழை",
      "resilient", "eloquent", "nostalgia", "tranquil", "epiphany",
    ];
    const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    const word = pool[day % pool.length];
    return await lookupWord({ data: { word, customApiKey: data.customApiKey } });
  });