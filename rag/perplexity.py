from __future__ import annotations

import os

import httpx
from langchain_core.tools import tool


PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"
PERPLEXITY_MODEL = "sonar-small-online"


@tool
def search_indian_legal_precedents(query: str) -> str:
    """Use this to search the internet for Indian legal precedents, Supreme Court rulings, and general law fact-checking. Provide a specific search query."""

    cleaned_query = query.strip()
    if not cleaned_query:
        return "No query provided. Please provide a specific legal search query."

    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        raise RuntimeError("PERPLEXITY_API_KEY is not set.")

    payload = {
        "model": PERPLEXITY_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are a legal internet search assistant focused on Indian law. "
                    "Return concise factual results about case precedents, rulings, and statutes."
                ),
            },
            {"role": "user", "content": cleaned_query},
        ],
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(PERPLEXITY_API_URL, json=payload, headers=headers)
        response.raise_for_status()

    body = response.json()
    choices = body.get("choices") or []
    if not choices:
        return "Perplexity returned no result for the query."

    message = choices[0].get("message") or {}
    content = message.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        text_chunks: list[str] = []
        for item in content:
            if isinstance(item, dict) and isinstance(item.get("text"), str):
                text_chunks.append(item["text"])
        if text_chunks:
            return "\n".join(text_chunks)

    return (
        str(content)
        if content is not None
        else "Perplexity returned an empty response."
    )
