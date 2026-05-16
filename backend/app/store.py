"""In-process registry of opened parquet files."""
from __future__ import annotations

import os
import uuid
from dataclasses import dataclass
from threading import Lock
from typing import Optional

import pyarrow.parquet as pq


@dataclass
class OpenedFile:
    file_id: str
    path: str
    name: str
    size_bytes: int
    pq_file: pq.ParquetFile


class FileStore:
    def __init__(self) -> None:
        self._files: dict[str, OpenedFile] = {}
        self._lock = Lock()

    def open(self, path: str) -> OpenedFile:
        abspath = os.path.abspath(path)
        if not os.path.isfile(abspath):
            raise FileNotFoundError(f"No such file: {abspath}")
        # Reuse if already open
        with self._lock:
            for f in self._files.values():
                if f.path == abspath:
                    return f
            pf = pq.ParquetFile(abspath)
            entry = OpenedFile(
                file_id=uuid.uuid4().hex[:12],
                path=abspath,
                name=os.path.basename(abspath),
                size_bytes=os.path.getsize(abspath),
                pq_file=pf,
            )
            self._files[entry.file_id] = entry
            return entry

    def get(self, file_id: str) -> OpenedFile:
        f = self._files.get(file_id)
        if f is None:
            raise KeyError(file_id)
        return f

    def close(self, file_id: str) -> None:
        with self._lock:
            self._files.pop(file_id, None)


store = FileStore()
