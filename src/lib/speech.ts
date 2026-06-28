import { toast } from "sonner";

export function speak(text: string, lang: "ta-IN" | "en-US", rate: number) {
  const langPrefix = lang.split("-")[0].toLowerCase();

  // For Tamil, use Google Translate TTS as the primary audio player.
  // Standard OS installations (Windows/macOS/Linux) do not have Tamil TTS voices installed by default,
  // causing native browser SpeechSynthesis to fail or play silently. Google Translate TTS is 100% reliable
  // and produces high-quality, natural Tamil speech.
  if (langPrefix === "ta") {
    playGoogleTTS(text, "ta");
    return;
  }

  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    // If SpeechSynthesis is not supported, fallback to Google Translate TTS
    playGoogleTTS(text, langPrefix);
    return;
  }

  try {
    window.speechSynthesis.cancel();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;

      const voices = window.speechSynthesis.getVoices();
      let voice = voices.find(
        (v) => v.lang.toLowerCase().replace("_", "-") === lang.toLowerCase()
      );

      if (!voice) {
        voice = voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith(langPrefix) ||
            v.lang.toLowerCase().includes(langPrefix)
        );
      }

      if (voice) {
        utterance.voice = voice;
        utterance.onerror = (e) => {
          console.error("SpeechSynthesisUtterance error, falling back to Google TTS:", e);
          playGoogleTTS(text, langPrefix);
        };
        window.speechSynthesis.speak(utterance);
      } else {
        // If no matching native voice is found, fallback to Google Translate TTS
        console.warn(`No native voice found for ${lang}, falling back to Google TTS.`);
        playGoogleTTS(text, langPrefix);
      }
    }, 50);
  } catch (err) {
    console.error("Speech synthesis error, falling back to Google TTS:", err);
    playGoogleTTS(text, langPrefix);
  }
}

function playGoogleTTS(text: string, lang: string) {
  try {
    // Google Translate TTS limit is 200 characters per request
    const cleanText = text.substring(0, 200);
    const url = `/api/tts?text=${encodeURIComponent(cleanText)}&lang=${lang}`;
    const audio = new Audio(url);
    
    // We can adjust playback rate if needed, although standard Audio element speed is 1.0
    audio.play().catch((err) => {
      console.error("Google TTS audio playback failed:", err);
      toast.error("Audio playback failed. Please check browser audio/autoplay permissions.");
    });
  } catch (err) {
    console.error("Failed to initialize Google TTS audio:", err);
    toast.error("Audio playback failed.");
  }
}
