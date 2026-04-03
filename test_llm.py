import asyncio
import os
from langchain_core.messages import HumanMessage
from main import _build_trial_stream_graph

async def main():
    with open('.env', 'r') as f:
        for line in f:
            if line.startswith('GITHUB_MODELS_API_KEY='):
                os.environ['GITHUB_MODELS_API_KEY'] = line.split('=')[1].strip()
    try:
        graph = _build_trial_stream_graph()
        state = {
            "transcript": [HumanMessage(content="I am ready.", name="prosecutor")],
            "user_role": "prosecutor",
            "case_details": "This is a test case."
        }
        print("Invoking graph...")
        stream = graph.astream(state, stream_mode="updates", config={'configurable': {'thread_id': '123'}})
        async for event in stream:
            print(event)
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(main())
