from __future__ import annotations

import os
from typing import Any
from urllib.parse import quote_plus

import httpx
from langchain_core.tools import tool


EXA_API_URL = "https://api.exa.ai/search"
SERPER_API_URL = "https://google.serper.dev/search"


def _format_cited_web_results(items: list[dict[str, str]]) -> str:
    if not items:
        return "No web results found for the provided query.\n\nCitations:\n(none)"

    lines: list[str] = []
    for index, item in enumerate(items, start=1):
        title = item.get("title", "Untitled source")
        url = item.get("url", "")
        snippet = item.get("snippet", "").strip() or "No snippet available."
        lines.append(
            "\n".join(
                [
                    f"Result {index} [web:{index}]",
                    f"Title: {title}",
                    f"URL: {url}",
                    f"Snippet: {snippet}",
                ]
            )
        )

    citation_lines = [
        f"[web:{idx}] {entry.get('url', '')}"
        for idx, entry in enumerate(items, start=1)
    ]
    return (
        "Web search results with citations:\n\n"
        + "\n\n".join(lines)
        + "\n\nCitations:\n"
        + "\n".join(citation_lines)
    )


def _exa_search(query: str, api_key: str) -> str:
    headers = {
        "x-api-key": api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "query": query,
        "numResults": 5,
        "type": "neural",
        "useAutoprompt": True,
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(EXA_API_URL, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    raw_results = data.get("results") if isinstance(data, dict) else None
    if not isinstance(raw_results, list):
        return "Exa search returned no results list."

    parsed: list[dict[str, str]] = []
    for item in raw_results:
        if not isinstance(item, dict):
            continue
        url = str(item.get("url", "")).strip()
        if not url:
            continue
        parsed.append(
            {
                "title": str(item.get("title", "Untitled source")).strip(),
                "url": url,
                "snippet": str(item.get("text", "")).strip(),
            }
        )

    return _format_cited_web_results(parsed)


def _serper_search(query: str, api_key: str) -> str:
    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json",
    }
    payload = {
        "q": query,
        "num": 5,
        "gl": "in",
        "hl": "en",
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(SERPER_API_URL, json=payload, headers=headers)
        response.raise_for_status()

    data = response.json()
    raw_organic = data.get("organic") if isinstance(data, dict) else None
    if not isinstance(raw_organic, list):
        return "Serper search returned no results list."

    parsed: list[dict[str, str]] = []
    for item in raw_organic:
        if not isinstance(item, dict):
            continue
        url = str(item.get("link", "")).strip()
        if not url:
            continue
        parsed.append(
            {
                "title": str(item.get("title", "Untitled source")).strip(),
                "url": url,
                "snippet": str(item.get("snippet", "")).strip(),
            }
        )

    return _format_cited_web_results(parsed)


def _duckduckgo_fallback(query: str) -> str:
    api_url = f"https://api.duckduckgo.com/?q={quote_plus(query)}&format=json&no_html=1&no_redirect=1"
    with httpx.Client(timeout=30.0) as client:
        response = client.get(api_url)
        response.raise_for_status()

    data: Any = response.json()
    related = data.get("RelatedTopics") if isinstance(data, dict) else None

    parsed: list[dict[str, str]] = []
    if isinstance(related, list):
        for item in related:
            if not isinstance(item, dict):
                continue

            if isinstance(item.get("Topics"), list):
                for nested in item["Topics"]:
                    if not isinstance(nested, dict):
                        continue
                    first_url = str(nested.get("FirstURL", "")).strip()
                    if first_url:
                        parsed.append(
                            {
                                "title": str(nested.get("Text", "")).strip()[:140]
                                or "DuckDuckGo result",
                                "url": first_url,
                                "snippet": str(nested.get("Text", "")).strip(),
                            }
                        )
                    if len(parsed) >= 5:
                        break
            else:
                first_url = str(item.get("FirstURL", "")).strip()
                if first_url:
                    parsed.append(
                        {
                            "title": str(item.get("Text", "")).strip()[:140]
                            or "DuckDuckGo result",
                            "url": first_url,
                            "snippet": str(item.get("Text", "")).strip(),
                        }
                    )
            if len(parsed) >= 5:
                break

    return _format_cited_web_results(parsed)


@tool
def search_indian_legal_precedents(query: str) -> str:
    """Use this to search the internet for Indian legal precedents, Supreme Court rulings, and general law fact-checking. Provide a specific search query."""

    cleaned_query = query.strip()
    if not cleaned_query:
        return "No query provided. Please provide a specific legal search query."

    exa_api_key = os.getenv("EXA_API_KEY", "").strip()
    if exa_api_key:
        return _exa_search(cleaned_query, exa_api_key)

    serper_api_key = os.getenv("SERPER_API_KEY", "").strip()
    if serper_api_key:
        return _serper_search(cleaned_query, serper_api_key)

    return _duckduckgo_fallback(cleaned_query)
