from __future__ import annotations

import hashlib
import math
import os

from langchain_astradb import AstraDBVectorStore
from langchain_core.embeddings import Embeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_openai import OpenAIEmbeddings
from pydantic import SecretStr

from astra_connection import load_astra_config


VECTOR_COLLECTION_ENV = "ASTRA_DB_COLLECTION_NAME"
GITHUB_MODELS_API_KEY_ENV = "GITHUB_MODELS_API_KEY"
GITHUB_MODELS_BASE_URL_ENV = "GITHUB_MODELS_BASE_URL"
OPENAI_EMBEDDING_MODEL_ENV = "OPENAI_EMBEDDING_MODEL"
OPENAI_EMBEDDING_DIMENSIONS_ENV = "OPENAI_EMBEDDING_DIMENSIONS"
GOOGLE_EMBEDDING_MODEL_ENV = "GOOGLE_EMBEDDING_MODEL"
DEFAULT_OPENAI_EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_OPENAI_EMBEDDING_DIMENSIONS = 768
DEFAULT_GITHUB_MODELS_BASE_URL = "https://models.inference.ai.azure.com"
DEFAULT_GOOGLE_EMBEDDING_MODEL = "models/embedding-001"
DEFAULT_VECTOR_COLLECTION = "case_evidence_chunks"


class _DeterministicFallbackEmbeddings(Embeddings):
    def __init__(self, dimensions: int = DEFAULT_OPENAI_EMBEDDING_DIMENSIONS) -> None:
        self._dimensions = dimensions

    def _embed_text(self, text: str) -> list[float]:
        normalized = text.strip().lower()
        if not normalized:
            return [0.0] * self._dimensions

        vector = [0.0] * self._dimensions
        for token in normalized.split():
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            index = int.from_bytes(digest[:2], "big") % self._dimensions
            sign = 1.0 if digest[2] % 2 == 0 else -1.0
            vector[index] += sign

        magnitude = math.sqrt(sum(value * value for value in vector))
        if magnitude == 0:
            return vector
        return [value / magnitude for value in vector]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_text(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed_text(text)


class _ResilientEmbeddings(Embeddings):
    def __init__(self, primary: Embeddings | None, fallback: Embeddings) -> None:
        self._primary = primary
        self._fallback = fallback

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if self._primary is None:
            return self._fallback.embed_documents(texts)

        try:
            return self._primary.embed_documents(texts)
        except Exception:
            self._primary = None
            return self._fallback.embed_documents(texts)

    def embed_query(self, text: str) -> list[float]:
        if self._primary is None:
            return self._fallback.embed_query(text)

        try:
            return self._primary.embed_query(text)
        except Exception:
            self._primary = None
            return self._fallback.embed_query(text)


def _read_positive_int_env(name: str, default: int) -> int:
    raw_value = os.getenv(name, "").strip()
    if not raw_value:
        return default
    try:
        parsed = int(raw_value)
    except ValueError:
        return default
    if parsed <= 0:
        return default
    return parsed


def _get_github_models_embeddings(model: str | None = None) -> Embeddings | None:
    api_key = os.getenv(GITHUB_MODELS_API_KEY_ENV, "").strip()
    if not api_key:
        return None

    selected_model = model or os.getenv(
        OPENAI_EMBEDDING_MODEL_ENV,
        DEFAULT_OPENAI_EMBEDDING_MODEL,
    )
    selected_base_url = (
        os.getenv(
            GITHUB_MODELS_BASE_URL_ENV,
            DEFAULT_GITHUB_MODELS_BASE_URL,
        ).strip()
        or DEFAULT_GITHUB_MODELS_BASE_URL
    )
    dimensions = _read_positive_int_env(
        OPENAI_EMBEDDING_DIMENSIONS_ENV,
        DEFAULT_OPENAI_EMBEDDING_DIMENSIONS,
    )

    return OpenAIEmbeddings(
        api_key=SecretStr(api_key),
        base_url=selected_base_url,
        model=selected_model,
        dimensions=dimensions,
    )


def _get_google_embeddings(model: str | None = None) -> Embeddings | None:
    google_api_key = (
        os.getenv("GOOGLE_API_KEY", "").strip()
        or os.getenv(
            "GEMINI_API_KEY",
            "",
        ).strip()
    )
    if not google_api_key:
        return None

    selected_model = model or os.getenv(
        GOOGLE_EMBEDDING_MODEL_ENV,
        DEFAULT_GOOGLE_EMBEDDING_MODEL,
    )
    return GoogleGenerativeAIEmbeddings(
        model=selected_model,
        api_key=SecretStr(google_api_key),
    )


def get_embeddings(model: str | None = None) -> Embeddings:
    dimensions = _read_positive_int_env(
        OPENAI_EMBEDDING_DIMENSIONS_ENV,
        DEFAULT_OPENAI_EMBEDDING_DIMENSIONS,
    )
    fallback = _DeterministicFallbackEmbeddings(dimensions=dimensions)
    primary = _get_github_models_embeddings(model)
    if primary is None:
        primary = _get_google_embeddings(model)
    return _ResilientEmbeddings(primary=primary, fallback=fallback)


def get_vector_store(
    collection_name: str | None = None,
    embedding_model: str | None = None,
) -> AstraDBVectorStore:
    config = load_astra_config()
    selected_collection = collection_name or os.getenv(
        VECTOR_COLLECTION_ENV,
        DEFAULT_VECTOR_COLLECTION,
    )

    return AstraDBVectorStore(
        collection_name=selected_collection,
        embedding=get_embeddings(embedding_model),
        token=config.application_token,
        api_endpoint=config.api_endpoint,
    )
