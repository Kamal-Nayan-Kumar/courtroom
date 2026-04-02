from __future__ import annotations

import base64
import json
import random
import zlib
from collections.abc import AsyncIterator, Iterator, Sequence
from typing import Any, Final

from langchain_core.runnables import RunnableConfig
from langgraph.checkpoint.base import (
    WRITES_IDX_MAP,
    BaseCheckpointSaver,
    ChannelVersions,
    Checkpoint,
    CheckpointMetadata,
    CheckpointTuple,
    get_checkpoint_id,
    get_checkpoint_metadata,
)

from astra_connection import (
    create_checkpointer_database,
    get_checkpointer_collection_name,
)

DEFAULT_CHECKPOINT_COLLECTION: Final[str] = "langgraph_checkpoints"
SERDE_PAYLOAD_CHUNK_SIZE: Final[int] = 3900


def _encode_typed_json(value: tuple[str, bytes]) -> dict[str, Any]:
    value_type, payload = value

    compressed_payload = zlib.compress(payload)
    if len(compressed_payload) < len(payload):
        codec = "zlib"
        serialized_payload = compressed_payload
    else:
        codec = "raw"
        serialized_payload = payload

    payload_b64 = base64.b64encode(serialized_payload).decode("ascii")
    if payload_b64:
        payload_chunks = [
            payload_b64[index : index + SERDE_PAYLOAD_CHUNK_SIZE]
            for index in range(0, len(payload_b64), SERDE_PAYLOAD_CHUNK_SIZE)
        ]
    else:
        payload_chunks = [""]

    return {
        "value_type": value_type,
        "codec": codec,
        "payload_chunks": payload_chunks,
    }


def _decode_typed_json(raw: str) -> tuple[str, bytes]:
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        raise ValueError("Serialized payload must be a JSON object")

    value_type = parsed.get("value_type")
    payload_b64 = parsed.get("payload_b64")
    if not isinstance(value_type, str) or not isinstance(payload_b64, str):
        raise ValueError(
            "Serialized payload missing required keys: value_type, payload_b64"
        )

    return value_type, base64.b64decode(payload_b64.encode("ascii"))


def _decode_typed_legacy(value: dict[str, str]) -> tuple[str, bytes]:
    value_type = value.get("value_type")
    payload_b64 = value.get("payload_b64")
    if not isinstance(value_type, str) or not isinstance(payload_b64, str):
        raise ValueError("Legacy payload missing required keys")
    return value_type, base64.b64decode(payload_b64.encode("ascii"))


def _decode_typed_chunked(value: dict[str, Any]) -> tuple[str, bytes]:
    value_type = value.get("value_type")
    codec = value.get("codec", "raw")
    payload_chunks = value.get("payload_chunks")
    if not isinstance(value_type, str):
        raise ValueError("Chunked payload missing value_type")
    if not isinstance(codec, str):
        raise ValueError("Chunked payload has invalid codec")
    if not isinstance(payload_chunks, list) or not payload_chunks:
        raise ValueError("Chunked payload missing payload_chunks")
    if any(not isinstance(chunk, str) for chunk in payload_chunks):
        raise ValueError("Chunked payload contains non-string chunk")

    payload = base64.b64decode("".join(payload_chunks).encode("ascii"))
    if codec == "zlib":
        return value_type, zlib.decompress(payload)
    if codec == "raw":
        return value_type, payload
    raise ValueError(f"Unsupported payload codec: {codec}")


def _safe_int(value: Any, default: int = 0) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _metadata_index(
    metadata: CheckpointMetadata,
) -> dict[str, str | int | float | bool | None]:
    indexed: dict[str, str | int | float | bool | None] = {}
    for key, value in metadata.items():
        if value is None or isinstance(value, (str, int, float, bool)):
            indexed[key] = value
    return indexed


class AstraSaver(BaseCheckpointSaver[str]):
    def __init__(self, *, collection_name: str = DEFAULT_CHECKPOINT_COLLECTION) -> None:
        super().__init__()
        self.database = create_checkpointer_database()
        self.collection_name = collection_name
        self.collection = self.database.get_collection(collection_name)
        self._ensure_collection_exists()

    def _ensure_collection_exists(self) -> None:
        names = self.database.list_collection_names()
        if self.collection_name in names:
            return

        try:
            self.database.create_collection(self.collection_name)
        except Exception:
            names = self.database.list_collection_names()
            if self.collection_name not in names:
                raise

    @staticmethod
    def _checkpoint_doc_id(
        thread_id: str, checkpoint_ns: str, checkpoint_id: str
    ) -> str:
        return f"cp::{thread_id}::{checkpoint_ns}::{checkpoint_id}"

    @staticmethod
    def _write_doc_id(
        thread_id: str,
        checkpoint_ns: str,
        checkpoint_id: str,
        task_id: str,
        idx: int,
    ) -> str:
        return f"wr::{thread_id}::{checkpoint_ns}::{checkpoint_id}::{task_id}::{idx}"

    @staticmethod
    def _thread_and_ns(config: RunnableConfig) -> tuple[str, str]:
        configurable = config.get("configurable", {})
        thread_id = configurable.get("thread_id")
        if thread_id is None or not str(thread_id).strip():
            raise ValueError(
                "Missing config['configurable']['thread_id'] for checkpointer"
            )

        return str(thread_id), str(configurable.get("checkpoint_ns", ""))

    def _serialize_value(self, value: Any) -> dict[str, Any]:
        return _encode_typed_json(self.serde.dumps_typed(value))

    def _deserialize_value(self, value: Any) -> Any:
        if isinstance(value, str):
            return self.serde.loads_typed(_decode_typed_json(value))
        if isinstance(value, dict):
            if isinstance(value.get("payload_chunks"), list):
                return self.serde.loads_typed(_decode_typed_chunked(value))
            return self.serde.loads_typed(_decode_typed_legacy(value))
        raise ValueError("Unexpected payload format for serialized checkpoint value")

    def _delete_checkpoint_and_writes(
        self,
        *,
        thread_id: str,
        checkpoint_ns: str,
        checkpoint_id: str,
    ) -> None:
        self.collection.delete_many(
            filter={
                "doc_type": "write",
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint_id,
            }
        )
        self.collection.delete_many(
            filter={
                "doc_type": "checkpoint",
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint_id,
            }
        )

    def _load_pending_writes(
        self,
        *,
        thread_id: str,
        checkpoint_ns: str,
        checkpoint_id: str,
    ) -> list[tuple[str, str, Any]]:
        docs = list(
            self.collection.find(
                filter={
                    "doc_type": "write",
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": checkpoint_id,
                },
                projection={
                    "task_id": True,
                    "channel": True,
                    "value_json": True,
                    "value": True,
                    "idx": True,
                },
            )
        )
        docs.sort(
            key=lambda item: (str(item.get("task_id", "")), _safe_int(item.get("idx")))
        )

        pending: list[tuple[str, str, Any]] = []
        for item in docs:
            serialized = item.get("value_json", item.get("value"))
            pending.append(
                (
                    str(item.get("task_id", "")),
                    str(item.get("channel", "")),
                    self._deserialize_value(serialized),
                )
            )
        return pending

    def _checkpoint_tuple_from_doc(self, *, doc: dict[str, Any]) -> CheckpointTuple:
        thread_id = str(doc["thread_id"])
        checkpoint_ns = str(doc.get("checkpoint_ns", ""))
        checkpoint_id = str(doc["checkpoint_id"])

        serialized_checkpoint = doc.get("checkpoint_json", doc.get("checkpoint"))
        serialized_metadata = doc.get("metadata_json", doc.get("metadata"))
        if serialized_checkpoint is None or serialized_metadata is None:
            raise ValueError(
                "Malformed checkpoint document: missing checkpoint_json/metadata_json"
            )

        checkpoint = self._deserialize_value(serialized_checkpoint)
        metadata = self._deserialize_value(serialized_metadata)

        parent_checkpoint_id = doc.get("parent_checkpoint_id")
        parent_config: RunnableConfig | None = None
        if parent_checkpoint_id is not None and str(parent_checkpoint_id):
            parent_config = {
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": str(parent_checkpoint_id),
                }
            }

        return CheckpointTuple(
            config={
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": checkpoint_id,
                }
            },
            checkpoint=checkpoint,
            metadata=metadata,
            parent_config=parent_config,
            pending_writes=self._load_pending_writes(
                thread_id=thread_id,
                checkpoint_ns=checkpoint_ns,
                checkpoint_id=checkpoint_id,
            ),
        )

    def get_tuple(self, config: RunnableConfig) -> CheckpointTuple | None:
        thread_id, checkpoint_ns = self._thread_and_ns(config)
        checkpoint_id = get_checkpoint_id(config)

        if checkpoint_id:
            doc = self.collection.find_one(
                filter={
                    "doc_type": "checkpoint",
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": str(checkpoint_id),
                }
            )
            if doc is None:
                return None
            return self._checkpoint_tuple_from_doc(doc=doc)

        docs = list(
            self.collection.find(
                filter={
                    "doc_type": "checkpoint",
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                }
            )
        )
        if not docs:
            return None

        latest = max(docs, key=lambda item: str(item["checkpoint_id"]))
        return self._checkpoint_tuple_from_doc(doc=latest)

    def list(
        self,
        config: RunnableConfig | None,
        *,
        filter: dict[str, Any] | None = None,
        before: RunnableConfig | None = None,
        limit: int | None = None,
    ) -> Iterator[CheckpointTuple]:
        query: dict[str, Any] = {"doc_type": "checkpoint"}
        if config is not None:
            thread_id, checkpoint_ns = self._thread_and_ns(config)
            query["thread_id"] = thread_id
            query["checkpoint_ns"] = checkpoint_ns

            config_checkpoint_id = get_checkpoint_id(config)
            if config_checkpoint_id:
                query["checkpoint_id"] = str(config_checkpoint_id)

        docs = list(self.collection.find(filter=query))
        docs.sort(key=lambda item: str(item["checkpoint_id"]), reverse=True)

        before_checkpoint_id = get_checkpoint_id(before) if before else None
        emitted = 0
        for doc in docs:
            checkpoint_id = str(doc["checkpoint_id"])
            if before_checkpoint_id and checkpoint_id >= str(before_checkpoint_id):
                continue

            if filter:
                metadata_values = doc.get("metadata_index")
                if not isinstance(metadata_values, dict):
                    serialized_metadata = doc.get("metadata_json", doc.get("metadata"))
                    metadata_values = self._deserialize_value(serialized_metadata)
                if not all(
                    metadata_values.get(key) == value for key, value in filter.items()
                ):
                    continue

            yield self._checkpoint_tuple_from_doc(doc=doc)

            emitted += 1
            if limit is not None and emitted >= limit:
                break

    def search(
        self,
        config: RunnableConfig | None,
        *,
        filter: dict[str, Any] | None = None,
        before: RunnableConfig | None = None,
        limit: int | None = None,
    ) -> Iterator[CheckpointTuple]:
        yield from self.list(config, filter=filter, before=before, limit=limit)

    def put(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        del new_versions

        thread_id, checkpoint_ns = self._thread_and_ns(config)
        checkpoint_id = str(checkpoint["id"])
        merged_metadata = get_checkpoint_metadata(config, metadata)

        doc = {
            "_id": self._checkpoint_doc_id(thread_id, checkpoint_ns, checkpoint_id),
            "doc_type": "checkpoint",
            "thread_id": thread_id,
            "checkpoint_ns": checkpoint_ns,
            "checkpoint_id": checkpoint_id,
            "parent_checkpoint_id": config.get("configurable", {}).get("checkpoint_id"),
            "checkpoint_json": self._serialize_value(checkpoint),
            "metadata_json": self._serialize_value(merged_metadata),
            "metadata_index": _metadata_index(merged_metadata),
            "run_id": merged_metadata.get("run_id"),
            "created_at": checkpoint.get("ts"),
        }
        self.collection.find_one_and_replace({"_id": doc["_id"]}, doc, upsert=True)

        return {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint_id,
            }
        }

    def put_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        thread_id, checkpoint_ns = self._thread_and_ns(config)
        checkpoint_id = str(config.get("configurable", {}).get("checkpoint_id", ""))
        if not checkpoint_id:
            raise ValueError(
                "Missing config['configurable']['checkpoint_id'] while writing checkpoint writes"
            )

        for idx, (channel, value) in enumerate(writes):
            write_idx = WRITES_IDX_MAP.get(channel, idx)
            write_id = self._write_doc_id(
                thread_id,
                checkpoint_ns,
                checkpoint_id,
                task_id,
                write_idx,
            )

            if write_idx >= 0:
                existing = self.collection.find_one(filter={"_id": write_id})
                if existing is not None:
                    continue

            doc = {
                "_id": write_id,
                "doc_type": "write",
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint_id,
                "task_id": task_id,
                "idx": write_idx,
                "channel": channel,
                "value_json": self._serialize_value(value),
                "task_path": task_path,
            }
            self.collection.find_one_and_replace({"_id": write_id}, doc, upsert=True)

    def delete_thread(self, thread_id: str) -> None:
        self.collection.delete_many(filter={"thread_id": str(thread_id)})

    def delete_for_runs(self, run_ids: Sequence[str]) -> None:
        selected_run_ids = [str(run_id) for run_id in run_ids if str(run_id).strip()]
        if not selected_run_ids:
            return

        docs = list(
            self.collection.find(
                filter={
                    "doc_type": "checkpoint",
                    "run_id": {"$in": selected_run_ids},
                },
                projection={
                    "thread_id": True,
                    "checkpoint_ns": True,
                    "checkpoint_id": True,
                },
            )
        )
        for doc in docs:
            thread_id = doc.get("thread_id")
            checkpoint_id = doc.get("checkpoint_id")
            if thread_id is None or checkpoint_id is None:
                continue
            self._delete_checkpoint_and_writes(
                thread_id=str(thread_id),
                checkpoint_ns=str(doc.get("checkpoint_ns", "")),
                checkpoint_id=str(checkpoint_id),
            )

    def copy_thread(self, source_thread_id: str, target_thread_id: str) -> None:
        source = str(source_thread_id)
        target = str(target_thread_id)
        if not source.strip() or not target.strip():
            raise ValueError("source_thread_id and target_thread_id are required")

        if source == target:
            return

        docs = list(self.collection.find(filter={"thread_id": source}))
        for doc in docs:
            doc_type = str(doc.get("doc_type", ""))
            checkpoint_id = doc.get("checkpoint_id")
            if checkpoint_id is None:
                continue

            checkpoint_ns = str(doc.get("checkpoint_ns", ""))
            new_doc = {
                key: value
                for key, value in doc.items()
                if isinstance(key, str) and not key.startswith("$")
            }
            new_doc["thread_id"] = target

            if doc_type == "checkpoint":
                new_doc["_id"] = self._checkpoint_doc_id(
                    target,
                    checkpoint_ns,
                    str(checkpoint_id),
                )
            elif doc_type == "write":
                new_doc["_id"] = self._write_doc_id(
                    target,
                    checkpoint_ns,
                    str(checkpoint_id),
                    str(doc.get("task_id", "")),
                    _safe_int(doc.get("idx")),
                )
            else:
                continue

            self.collection.find_one_and_replace(
                {"_id": new_doc["_id"]}, new_doc, upsert=True
            )

    def prune(
        self,
        thread_ids: Sequence[str],
        *,
        strategy: str = "keep_latest",
    ) -> None:
        if strategy not in {"keep_latest", "delete"}:
            raise ValueError("strategy must be 'keep_latest' or 'delete'")

        for thread_id in thread_ids:
            selected_thread_id = str(thread_id)
            if not selected_thread_id.strip():
                continue

            if strategy == "delete":
                self.delete_thread(selected_thread_id)
                continue

            docs = list(
                self.collection.find(
                    filter={
                        "doc_type": "checkpoint",
                        "thread_id": selected_thread_id,
                    },
                    projection={
                        "thread_id": True,
                        "checkpoint_ns": True,
                        "checkpoint_id": True,
                    },
                )
            )

            latest_by_ns: dict[str, str] = {}
            for doc in docs:
                checkpoint_id = doc.get("checkpoint_id")
                if checkpoint_id is None:
                    continue
                checkpoint_ns = str(doc.get("checkpoint_ns", ""))
                checkpoint_id_str = str(checkpoint_id)
                current_latest = latest_by_ns.get(checkpoint_ns)
                if current_latest is None or checkpoint_id_str > current_latest:
                    latest_by_ns[checkpoint_ns] = checkpoint_id_str

            for doc in docs:
                checkpoint_id = doc.get("checkpoint_id")
                if checkpoint_id is None:
                    continue
                checkpoint_ns = str(doc.get("checkpoint_ns", ""))
                checkpoint_id_str = str(checkpoint_id)
                if checkpoint_id_str == latest_by_ns.get(checkpoint_ns):
                    continue
                self._delete_checkpoint_and_writes(
                    thread_id=selected_thread_id,
                    checkpoint_ns=checkpoint_ns,
                    checkpoint_id=checkpoint_id_str,
                )

    async def aget_tuple(self, config: RunnableConfig) -> CheckpointTuple | None:
        return self.get_tuple(config)

    async def alist(
        self,
        config: RunnableConfig | None,
        *,
        filter: dict[str, Any] | None = None,
        before: RunnableConfig | None = None,
        limit: int | None = None,
    ) -> AsyncIterator[CheckpointTuple]:
        for item in self.list(config, filter=filter, before=before, limit=limit):
            yield item

    async def aput(
        self,
        config: RunnableConfig,
        checkpoint: Checkpoint,
        metadata: CheckpointMetadata,
        new_versions: ChannelVersions,
    ) -> RunnableConfig:
        return self.put(config, checkpoint, metadata, new_versions)

    async def aput_writes(
        self,
        config: RunnableConfig,
        writes: Sequence[tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        self.put_writes(config, writes, task_id, task_path)

    async def adelete_thread(self, thread_id: str) -> None:
        self.delete_thread(thread_id)

    async def adelete_for_runs(self, run_ids: Sequence[str]) -> None:
        self.delete_for_runs(run_ids)

    async def acopy_thread(self, source_thread_id: str, target_thread_id: str) -> None:
        self.copy_thread(source_thread_id, target_thread_id)

    async def aprune(
        self,
        thread_ids: Sequence[str],
        *,
        strategy: str = "keep_latest",
    ) -> None:
        self.prune(thread_ids, strategy=strategy)

    def get_next_version(self, current: str | None, channel: None) -> str:
        del channel
        if current is None:
            current_v = 0
        elif isinstance(current, int):
            current_v = current
        else:
            current_v = int(str(current).split(".")[0])
        next_v = current_v + 1
        next_h = random.random()
        return f"{next_v:032}.{next_h:016}"


AstraDataAPISaver = AstraSaver


def create_astra_checkpointer(*, collection_name: str | None = None) -> AstraSaver:
    selected_collection = collection_name or get_checkpointer_collection_name()
    return AstraSaver(collection_name=selected_collection)
