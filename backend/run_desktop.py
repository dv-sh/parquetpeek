"""Launch ParquetPeek as a desktop app via pywebview."""
from __future__ import annotations

import socket
import sys
import threading
import time

import uvicorn
import webview

from app.main import app


def _free_port() -> int:
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def _run_server(port: int) -> None:
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="warning")


def main() -> None:
    port = _free_port()
    t = threading.Thread(target=_run_server, args=(port,), daemon=True)
    t.start()

    # Wait briefly for server to come up
    deadline = time.time() + 5
    while time.time() < deadline:
        try:
            s = socket.create_connection(("127.0.0.1", port), timeout=0.2)
            s.close()
            break
        except OSError:
            time.sleep(0.05)

    url = f"http://127.0.0.1:{port}/"
    # If a dev frontend URL was passed, use it instead (for hot reload)
    if len(sys.argv) > 1 and sys.argv[1].startswith("http"):
        url = sys.argv[1]
    webview.create_window("ParquetPeek", url, width=1280, height=820, min_size=(900, 600))
    webview.start()


if __name__ == "__main__":
    main()
