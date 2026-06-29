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
CRITICAL: You MUST provide ACCURATE and REAL Tamil translations (தமிழ்). Do NOT hallucinate or invent fake Tamil words. If you are unsure of the exact Tamil translation, return an empty string.
Always provide BOTH Tamil and English meanings regardless of input language.
Tamil text MUST use proper Tamil script (தமிழ்) without mixing English letters or other alphabets.`;

const SCHEMA_HINT = `{
  "word": string (the headword, normalized),
  "language": "ta" | "en" | "unknown",
  "pronunciation_ipa": string (IPA like /wɜːrd/),
  "pronunciation_tamil": string (Tamil transliteration if input is English, or romanized if input is Tamil),
  "meaning_tamil": string (concise Tamil definition),
  "meaning_english": string (concise English definition),
  "part_of_speech": string (noun, verb, adjective, etc.),
  "synonyms": string[] (max 3 items),
  "antonyms": string[] (max 2 items),
  "word_forms": [{"form": string, "description": string}] (max 2 items),
  "examples_english": string[] (1 simple sentence),
  "examples_tamil": string[] (1 simple sentence),
  "etymology": string (1 brief sentence),
  "similar_words": string[] (max 3 items)
}`;

function cleanAndParseJSON(text: string) {
  let cleaned = text.trim();
  
  // Remove markdown code blocks if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();
  }
  
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Attempt to extract JSON substring between the first '{' and the last '}'
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const jsonSub = cleaned.substring(startIdx, endIdx + 1);
      try {
        return JSON.parse(jsonSub);
      } catch (innerErr) {
        console.error("Failed to parse extracted JSON block:", jsonSub, innerErr);
      }
    }
    throw e;
  }
}

export const lookupWord = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LookupSchema.parse(d))
  .handler(async ({ data }): Promise<DictionaryEntry> => {
    let apiKey = data.customApiKey || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.LOVABLE_API_KEY || process.env.OPENAI_API_KEY;
    
    // Fallback to client-side Vite env if available
    if (!apiKey) {
      const viteEnv = (import.meta as any).env;
      apiKey = viteEnv?.VITE_GEMINI_API_KEY || viteEnv?.VITE_OPENROUTER_API_KEY || viteEnv?.VITE_LOVABLE_API_KEY || viteEnv?.VITE_OPENAI_API_KEY;
    }

    if (!apiKey) {
      throw new Error("AI gateway / API key not configured. Please add OPENROUTER_API_KEY, LOVABLE_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY to your .env file.");
    }

    console.log("[DEBUG] Using API Key starting with:", apiKey.substring(0, 12) + "...");

    let res: Response | null = null;
    let isGemini = false;
    let isOpenRouter = false;
    let isOpenAI = false;

    if (apiKey.startsWith("sk-or-")) isOpenRouter = true;
    else if (apiKey.startsWith("sk-")) isOpenAI = true;
    else if (apiKey.startsWith("AIza") || apiKey.startsWith("AQ.")) isGemini = true;

    // Helper to fetch OpenRouter
    const fetchOpenRouter = async (key: string) => {
      const url = "https://openrouter.ai/api/v1/chat/completions";
      const models = ["google/gemini-2.0-flash-lite-preview-02-05:free"];
      let lastErr: Error | null = null;
      for (const model of models) {
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
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
              max_tokens: 1500,
            })
          });
          if (r.ok) return r;
          const status = r.status;
          const text = await r.text().catch(() => "");
          if (status === 401 || status === 400) throw new Error(`Lookup failed: ${status} ${text}`);
          lastErr = new Error(`Model ${model} returned ${status}: ${text}`);
        } catch (e: any) {
          lastErr = e;
          if (e.message && (e.message.includes("401") || e.message.includes("unauthorized"))) throw e;
        }
      }
      throw lastErr || new Error("All OpenRouter models failed");
    };

    try {
      if (isOpenRouter) {
        res = await fetchOpenRouter(apiKey);
      } else if (isGemini) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `Look up the word: "${data.word}"\nReturn JSON only.` }] }],
            systemInstruction: { parts: [{ text: `${SYSTEM}\n\nSchema:\n${SCHEMA_HINT}` }] },
            generationConfig: { responseMimeType: "application/json" },
          }),
        });
        
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (res.status === 429) {
            console.warn("[DEBUG] Gemini Rate Limited (429). Attempting fallback...");
            const viteEnv = (import.meta as any).env;
            const orKey = process.env.OPENROUTER_API_KEY || viteEnv?.VITE_OPENROUTER_API_KEY;
            if (orKey && !data.customApiKey) {
              console.log("[DEBUG] Falling back to OpenRouter...");
              res = await fetchOpenRouter(orKey);
              isGemini = false;
            } else {
              throw new Error(`Rate limit reached (429): ${text}`);
            }
          } else {
            throw new Error(`Lookup failed: ${res.status} ${text}`);
          }
        }
      } else {
        let url = "https://ai.gateway.lovable.dev/v1/chat/completions";
        let model = "google/gemini-2.0-flash";
        if (isOpenAI) {
          url = "https://api.openai.com/v1/chat/completions";
          model = "gpt-4o-mini";
        }
        res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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

      if (!res || !res.ok) {
        const text = res ? await res.text().catch(() => "") : "";
        const status = res ? res.status : 500;
        if (status === 429) throw new Error(`Rate limit reached (429): ${text}`);
        if (status === 402) throw new Error(`AI credits exhausted (402): ${text}`);
        throw new Error(`Lookup failed: ${status} ${text}`);
      }
    } catch (err: any) {
      throw new Error(err.message || String(err));
    }

    const json = await res.json();
    const content = isGemini
      ? (json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}")
      : (json.choices?.[0]?.message?.content ?? "{}");
    let parsed: DictionaryEntry;
    try {
      parsed = cleanAndParseJSON(content);
    } catch (e: any) {
      console.error("[DEBUG] Failed to parse JSON content:", content);
      throw new Error(`AI returned malformed response: ${e.message || e}. Raw: ${content.substring(0, 120)}...`);
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