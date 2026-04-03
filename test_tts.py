import asyncio
import httpx

async def main():
    sarvam_api_key = ""
    with open('.env', 'r') as f:
        for line in f:
            if line.startswith('SARVAM_API_KEY='):
                sarvam_api_key = line.split('=')[1].strip()
    
    headers = {
        "api-subscription-key": sarvam_api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": ["Hello your honor"],
        "target_language_code": "en-IN",
        "speaker": "meera",
        "pitch": 0,
        "speed": 1.0,
        "model": "bulbul:v3",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            "https://api.sarvam.ai/text-to-speech",
            json=payload,
            headers=headers,
        )
        print(response.status_code)
        print(response.text)

if __name__ == "__main__":
    asyncio.run(main())
