import { stopSpeaking } from "@/lib/sounds";
import { requestWithRetry } from "@/lib/http";

const API_ENDPOINT = "/api/v1/tts";
const MAX_TTS_CHARS = 600;
let currentAudio: HTMLAudioElement | null = null;
let playbackChain: Promise<void> = Promise.resolve();
let audioUnlocked = false;

const SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRhQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

export async function unlockAudioPlayback(): Promise<void> {
  if (audioUnlocked) {
    return;
  }

  try {
    const audio = new Audio(SILENT_WAV_DATA_URI);
    audio.volume = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audioUnlocked = true;
  } catch {
    audioUnlocked = false;
  }
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function chunkTtsText(text: string, maxChars = MAX_TTS_CHARS): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  if (normalized.length <= maxChars) {
    return [normalized];
  }

  const sentences = normalized.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [normalized];
  const chunks: string[] = [];
  let current = "";

  const flushCurrent = () => {
    const chunk = current.trim();
    if (chunk) {
      chunks.push(chunk);
    }
    current = "";
  };

  for (const sentenceRaw of sentences) {
    const sentence = sentenceRaw.trim();
    if (!sentence) {
      continue;
    }

    if (sentence.length > maxChars) {
      flushCurrent();
      const words = sentence.split(" ");
      let longSegment = "";
      for (const word of words) {
        const candidate = longSegment ? `${longSegment} ${word}` : word;
        if (candidate.length <= maxChars) {
          longSegment = candidate;
          continue;
        }
        if (longSegment) {
          chunks.push(longSegment.trim());
        }
        if (word.length > maxChars) {
          let cursor = 0;
          while (cursor < word.length) {
            chunks.push(word.slice(cursor, cursor + maxChars));
            cursor += maxChars;
          }
          longSegment = "";
        } else {
          longSegment = word;
        }
      }
      if (longSegment.trim()) {
        chunks.push(longSegment.trim());
      }
      continue;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      flushCurrent();
      current = sentence;
    }
  }

  flushCurrent();
  return chunks;
}

async function fetchSarvamAudio(params: {
  text: string;
  voiceGender: "male" | "female";
  languageCode?: string;
}): Promise<{ audio_base64?: string; mime_type?: string }> {
  return requestWithRetry<{ audio_base64?: string; mime_type?: string }>(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: params.text,
      voice_gender: params.voiceGender,
      language_code: params.languageCode || "en-IN",
    }),
    maxRetries: 3,
    timeoutMs: 25000,
  });
}

export async function playSarvamTts(params: {
  text: string;
  voiceGender: "male" | "female";
  speaker: "judge" | "prosecutor" | "defender";
  languageCode?: string;
}): Promise<void> {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }

  playbackChain = playbackChain
    .catch(() => undefined)
    .then(async () => {
      const cleanText = params.text.trim();
      if (!cleanText) {
        return;
      }

      const ttsChunks = chunkTtsText(cleanText, MAX_TTS_CHARS);
      if (ttsChunks.length === 0) {
        return;
      }

      stopSpeaking();
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
      }

      try {
        for (const chunk of ttsChunks) {
          const payload = await fetchSarvamAudio({
            text: chunk,
            voiceGender: params.voiceGender,
            languageCode: params.languageCode,
          });

          if (!payload.audio_base64) {
            throw new Error("Missing TTS audio payload.");
          }

          const mimeType = payload.mime_type || "audio/wav";
          const bytes = base64ToBytes(payload.audio_base64);
          const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
          const audioUrl = URL.createObjectURL(blob);

          const audio = new Audio(audioUrl);
          audio.preload = "auto";
          currentAudio = audio;
          await new Promise<void>((resolve, reject) => {
            const onEnded = () => {
              cleanup();
              resolve();
            };
            const onError = () => {
              cleanup();
              reject(new Error("Sarvam audio playback failed."));
            };
            const cleanup = () => {
              audio.removeEventListener("ended", onEnded);
              audio.removeEventListener("error", onError);
              URL.revokeObjectURL(audioUrl);
            };

            audio.addEventListener("ended", onEnded);
            audio.addEventListener("error", onError);
            void audio.play().catch((err) => {
              cleanup();
              reject(err);
            });
          });
        }
      } catch (error) {
        console.warn("Sarvam TTS failed, using fallback:", error);
        await fallbackTts(cleanText, params.speaker, params.voiceGender);
        return;
      }
    });

  return playbackChain;
}

function matchesVoiceGender(voice: SpeechSynthesisVoice, voiceGender: "male" | "female"): boolean {
  const voiceName = voice.name.toLowerCase();
  const genderHints = voiceGender === "male"
    ? ["male", "man", "arvind", "ravi", "amit", "rahul"]
    : ["female", "woman", "meera", "aditi", "raveena", "sangeeta"];

  return genderHints.some((hint) => voiceName.includes(hint));
}

function selectPreferredVoice(
  voices: SpeechSynthesisVoice[],
  voiceGender: "male" | "female",
): SpeechSynthesisVoice | null {
  const indianVoices = voices.filter((voice) => {
    const lang = voice.lang || "";
    return lang.includes("en-IN") || lang.includes("IN");
  });

  const indianGenderMatch = indianVoices.find((voice) => matchesVoiceGender(voice, voiceGender));
  if (indianGenderMatch) {
    return indianGenderMatch;
  }
  if (indianVoices.length > 0) {
    return indianVoices[0];
  }

  const englishVoices = voices.filter((voice) => (voice.lang || "").toLowerCase().startsWith("en"));
  const englishGenderMatch = englishVoices.find((voice) => matchesVoiceGender(voice, voiceGender));
  if (englishGenderMatch) {
    return englishGenderMatch;
  }

  const anyGenderMatch = voices.find((voice) => matchesVoiceGender(voice, voiceGender));
  return anyGenderMatch || voices[0] || null;
}

async function getAvailableSpeechVoices(): Promise<SpeechSynthesisVoice[]> {
  const immediateVoices = window.speechSynthesis.getVoices();
  if (immediateVoices.length > 0) {
    return immediateVoices;
  }

  return new Promise((resolve) => {
    const onVoicesChanged = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);
    window.setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 300);
  });
}

export async function fallbackTts(
  text: string,
  speaker: "judge" | "prosecutor" | "defender",
  voiceGender: "male" | "female" = "female",
): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve();
  }

  const voices = await getAvailableSpeechVoices();
  const selectedVoice = selectPreferredVoice(voices, voiceGender);

  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-IN";

    if (selectedVoice) {
      utter.voice = selectedVoice;
      utter.lang = selectedVoice.lang || "en-IN";
    }
    
    utter.onend = () => resolve();
    utter.onerror = (e) => {
      console.warn("Fallback TTS error", e);
      resolve();
    };

    switch (speaker) {
      case "judge":
        utter.rate = 0.8;
        utter.pitch = 0.7;
        break;
      case "prosecutor":
        utter.rate = 1.1;
        utter.pitch = 1.1;
        break;
      case "defender":
        utter.rate = 1.0;
        utter.pitch = 1.0;
        break;
      default:
        utter.rate = 1.0;
        utter.pitch = 1.0;
        break;
    }
    
    window.speechSynthesis.speak(utter);
  });
}

export function stopAudioPlayback(): void {
  stopSpeaking();
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}
