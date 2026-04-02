from __future__ import annotations

import os

from langchain_astradb import AstraDBVectorStore
from langchain_google_genai import GoogleGenerativeAIEmbeddings

from astra_connection import load_astra_config


EMBEDDING_MODEL_ENV = "GOOGLE_EMBEDDING_MODEL"
VECTOR_COLLECTION_ENV = "ASTRA_DB_COLLECTION_NAME"
DEFAULT_EMBEDDING_MODEL = "models/embedding-001"
DEFAULT_VECTOR_COLLECTION = "case_evidence_chunks"


def get_embeddings(model: str | None = None) -> GoogleGenerativeAIEmbeddings:
    selected_model = model or os.getenv(EMBEDDING_MODEL_ENV, DEFAULT_EMBEDDING_MODEL)
    return GoogleGenerativeAIEmbeddings(model=selected_model)


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
