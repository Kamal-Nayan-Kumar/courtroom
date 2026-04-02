from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Mapping

from astrapy import DataAPIClient, Database


ENV_TOKEN = "ASTRA_DB_APPLICATION_TOKEN"
ENV_ENDPOINT = "ASTRA_DB_API_ENDPOINT"
ENV_NAMESPACE = "ASTRA_DB_NAMESPACE"
ENV_CHECKPOINTER_COLLECTION = "ASTRA_DB_CHECKPOINTER_COLLECTION"


class AstraConfigurationError(RuntimeError):
    pass


class AstraConnectionError(RuntimeError):
    pass


@dataclass(frozen=True)
class AstraConfig:
    application_token: str
    api_endpoint: str
    namespace: str | None


def load_astra_config(env: Mapping[str, str] | None = None) -> AstraConfig:
    source = env or os.environ
    missing = [name for name in (ENV_TOKEN, ENV_ENDPOINT) if not source.get(name)]
    if missing:
        names = ", ".join(missing)
        raise AstraConfigurationError(
            f"Missing required environment variable(s): {names}. "
            "Set them in your shell or run with an env file, e.g. "
            "`uv run --env-file .env python test_db.py`."
        )

    raw_namespace = source.get(ENV_NAMESPACE)
    namespace = (
        raw_namespace.strip() if raw_namespace and raw_namespace.strip() else None
    )

    return AstraConfig(
        application_token=source[ENV_TOKEN].strip(),
        api_endpoint=source[ENV_ENDPOINT].strip(),
        namespace=namespace,
    )


def _require_namespace(cfg: AstraConfig) -> str:
    if cfg.namespace:
        return cfg.namespace
    raise AstraConfigurationError(
        "Missing ASTRA_DB_NAMESPACE. Astra DB is likely trying the default keyspace "
        "(often default_keyspace), which may not exist in your database. Add the "
        "correct namespace to your .env, for example: ASTRA_DB_NAMESPACE=your_keyspace."
    )


def create_vector_store_database(config: AstraConfig | None = None) -> Database:
    cfg = config or load_astra_config()
    client = DataAPIClient(
        token=cfg.application_token,
        callers=[("ai-courtroom-vector-store", "0.1.0")],
    )
    return client.get_database(
        api_endpoint=cfg.api_endpoint, keyspace=_require_namespace(cfg)
    )


def create_checkpointer_database(config: AstraConfig | None = None) -> Database:
    cfg = config or load_astra_config()
    client = DataAPIClient(
        token=cfg.application_token,
        callers=[("ai-courtroom-checkpointer", "0.1.0")],
    )
    return client.get_database(
        api_endpoint=cfg.api_endpoint, keyspace=_require_namespace(cfg)
    )


def get_checkpointer_collection_name(env: Mapping[str, str] | None = None) -> str:
    source = env or os.environ
    raw = source.get(ENV_CHECKPOINTER_COLLECTION)
    if raw and raw.strip():
        return raw.strip()
    return "langgraph_checkpoints"


def ping_database(database: Database) -> None:
    try:
        database.list_collection_names()
    except Exception as exc:
        raise AstraConnectionError(
            "Astra DB connectivity check failed while listing collections. "
            "Verify ASTRA_DB_API_ENDPOINT is correct, token is valid, and the token "
            "has Data API access to this database."
        ) from exc
