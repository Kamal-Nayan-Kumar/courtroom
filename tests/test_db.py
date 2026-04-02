from __future__ import annotations

from importlib import util
from pathlib import Path
import sys


def _load_astra_connection_module():
    module_path = Path(__file__).resolve().parent.parent / "astra_connection.py"
    spec = util.spec_from_file_location("astra_connection", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module from {module_path}")
    module = util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


astra_connection = _load_astra_connection_module()


def main() -> int:
    try:
        vector_db = astra_connection.create_vector_store_database()
        checkpointer_db = astra_connection.create_checkpointer_database()

        astra_connection.ping_database(vector_db)
        astra_connection.ping_database(checkpointer_db)
    except astra_connection.AstraConfigurationError as exc:
        print(f"Configuration error: {exc}")
        return 1
    except astra_connection.AstraConnectionError as exc:
        print(f"Connection error: {exc}")
        return 1
    except Exception as exc:
        print(
            "Unexpected Astra DB failure: "
            f"{exc.__class__.__name__}: {exc}. "
            "Verify endpoint reachability and token permissions."
        )
        return 1

    print("Astra DB connection check passed for vector store and checkpointer clients.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
