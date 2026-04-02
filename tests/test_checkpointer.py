from __future__ import annotations

import os
import sys
from importlib import util
from pathlib import Path


def _load_module(module_name: str, relative_path: str):
    module_path = Path(__file__).resolve().parent.parent / relative_path
    spec = util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module from {module_path}")

    module = util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _require_env(name: str) -> None:
    value = os.getenv(name)
    if value is None or not value.strip():
        raise SystemExit(f"{name} is not set")


def main() -> int:
    _require_env("ASTRA_DB_APPLICATION_TOKEN")

    checkpointer_module = _load_module("graph_checkpointer", "graph/checkpointer.py")
    saver = checkpointer_module.create_astra_checkpointer()

    class_name = type(saver).__name__
    print(f"Astra checkpointer instantiated successfully: {class_name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
