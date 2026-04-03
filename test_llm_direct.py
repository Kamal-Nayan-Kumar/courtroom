import asyncio
import os
from langchain_openai import ChatOpenAI

async def main():
    with open('.env', 'r') as f:
        for line in f:
            if line.startswith('GITHUB_MODELS_API_KEY='):
                os.environ['GITHUB_MODELS_API_KEY'] = line.split('=')[1].strip()
    
    try:
        print("Invoking LLM...")
        llm = ChatOpenAI(
            api_key=os.environ['GITHUB_MODELS_API_KEY'],
            base_url="https://models.inference.ai.azure.com",
            model="gpt-4o",
            temperature=0
        )
        response = await llm.ainvoke("Hi")
        print(f"Response: {response.content}")
    except Exception as e:
        print("ERROR:", e)

if __name__ == "__main__":
    asyncio.run(main())
