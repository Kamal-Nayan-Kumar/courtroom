export interface TtsRequest {
  text: string;
  voiceGender: "male" | "female";
  languageCode?: string;
}

export async function playSarvamTts(request: TtsRequest): Promise<boolean> {
  try {
    const response = await fetch("/api/v1/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: request.text,
        voice_gender: request.voiceGender,
        language_code: request.languageCode ?? "en-IN",
      }),
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as {
      audio_base64?: string;
      mime_type?: string;
    };

    if (!payload.audio_base64) {
      return false;
    }

    const source = `data:${payload.mime_type ?? "audio/wav"};base64,${payload.audio_base64}`;
    const audio = new Audio(source);
    await audio.play();
    return true;
  } catch {
    return false;
  }
}
