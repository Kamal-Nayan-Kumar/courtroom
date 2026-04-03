import os
import requests
import base64

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

if not SARVAM_API_KEY:
    print("SARVAM_API_KEY not found in .env")
    exit(1)

url = "https://api.sarvam.ai/text-to-speech"
headers = {"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"}

speakers_to_test = ["meera", "arvind", "mahesh", "pavithra", "swara", "raman"]

print("Testing Sarvam AI Voices...")

for speaker in speakers_to_test:
    payload = {
        "inputs": [
            f"Order in the court. This is a test of the Indian English voice for {speaker}."
        ],
        "target_language_code": "en-IN",
        "speaker": speaker,
        "model": "bulbul:v3",
    }

    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code == 200:
            data = response.json()
            audios = data.get("audios", [])
            if audios:
                filename = f"test_voice_{speaker}.wav"
                with open(filename, "wb") as f:
                    f.write(base64.b64decode(audios[0]))
                print(f"✅ Success: {speaker} (saved to {filename})")
            else:
                print(f"⚠️ Success but no audio for: {speaker}")
        else:
            print(
                f"❌ Failed: {speaker} - HTTP {response.status_code} - {response.text}"
            )
    except Exception as e:
        print(f"❌ Error testing {speaker}: {e}")
