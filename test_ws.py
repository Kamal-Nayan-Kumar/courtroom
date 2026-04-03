import asyncio
import json
import websockets

async def main():
    async with websockets.connect("ws://127.0.0.1:8000/api/v1/trial/stream") as ws:
        await ws.send(json.dumps({
            "message": "I am ready.",
            "thread_id": "test_thread",
            "player_role": "prosecutor",
            "case_details": "This is a test case."
        }))
        while True:
            try:
                msg_str = await ws.recv()
                msg = json.loads(msg_str)
                print(json.dumps(msg, indent=2))
                if msg.get("event") == "done" or msg.get("error"):
                    break
            except Exception as e:
                print("Error:", e)
                break

if __name__ == "__main__":
    asyncio.run(main())
