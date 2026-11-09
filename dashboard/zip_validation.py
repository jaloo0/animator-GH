from __future__ import annotations

import io
import os
import shutil
import stat
import zipfile
from pathlib import Path, PurePosixPath

MAX_ARCHIVE_BYTES = 50 * 1024 * 1024
MAX_UNPACKED_BYTES = 2 * 1024 * 1024 * 1024
MAX_FILES = 2500


class ProjectArchiveError(ValueError):
    pass


def _validated_entries(data: bytes) -> tuple[zipfile.ZipFile, list[tuple[zipfile.ZipInfo, str]]]:
    if not data:
        raise ProjectArchiveError("The uploaded ZIP is empty.")
    if len(data) > MAX_ARCHIVE_BYTES:
        raise ProjectArchiveError("Project ZIPs must be 50 MB or smaller.")

    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
        entries = archive.infolist()
    except (OSError, zipfile.BadZipFile) as exc:
        raise ProjectArchiveError("The uploaded file is not a valid ZIP archive.") from exc

    if len(entries) > MAX_FILES:
        archive.close()
        raise ProjectArchiveError(f"The ZIP contains too many entries (maximum {MAX_FILES}).")

    total_size = 0
    files: list[tuple[zipfile.ZipInfo, str]] = []
    seen_names: set[str] = set()
    for entry in entries:
        name = entry.filename
        parts = name.split("/")
        clean_parts = [part for part in parts if part not in ("", ".")]
        mode = entry.external_attr >> 16
        if (
            not name
            or "\x00" in name
            or "\\" in name
            or name.startswith("/")
            or any(part == ".." for part in parts)
            or (clean_parts and ":" in clean_parts[0])
            or stat.S_ISLNK(mode)
            or entry.flag_bits & 0x1
        ):
            archive.close()
            raise ProjectArchiveError("The ZIP contains an unsafe, encrypted, or unsupported path.")
        if entry.is_dir():
            continue
        normalized_name = "/".join(clean_parts)
        if not normalized_name:
            archive.close()
            raise ProjectArchiveError("The ZIP contains a file with an invalid path.")
        if normalized_name in seen_names:
            archive.close()
            raise ProjectArchiveError("The ZIP contains duplicate file paths.")
        seen_names.add(normalized_name)
        total_size += entry.file_size
        if total_size > MAX_UNPACKED_BYTES:
            archive.close()
            raise ProjectArchiveError("The ZIP expands beyond the 2 GB limit.")
        if entry.file_size > 1024 * 1024 and entry.compress_size == 0:
            archive.close()
            raise ProjectArchiveError("The ZIP contains an invalid compressed entry.")
        if entry.compress_size and entry.file_size / entry.compress_size > 1000:
            archive.close()
            raise ProjectArchiveError("The ZIP contains an unusually compressed entry.")
        files.append((entry, normalized_name))

    names = {name for _, name in files}
    root = ""
    first_parts = {PurePosixPath(name).parts[0] for name in names}
    if len(first_parts) == 1:
        candidate = next(iter(first_parts))
        if f"{candidate}/tools/capture.mjs" in names and f"{candidate}/index.html" in names:
            root = candidate + "/"

    normalized = [(entry, name[len(root) :] if root else name) for entry, name in files]
    normalized_names = {name for _, name in normalized}
    if "tools/capture.mjs" not in normalized_names or "index.html" not in normalized_names:
        archive.close()
        raise ProjectArchiveError(
            "The ZIP must contain a project root with index.html and tools/capture.mjs."
        )
    return archive, normalized


def validate_project_zip(data: bytes) -> None:
    archive, _ = _validated_entries(data)
    archive.close()


def extract_project_zip(data: bytes, destination: str | Path) -> Path:
    archive, entries = _validated_entries(data)
    destination_path = Path(destination).resolve()
    destination_path.mkdir(parents=True, exist_ok=True)
    try:
        for entry, relative_name in entries:
            output = (destination_path / relative_name).resolve()
            if not output.is_relative_to(destination_path):
                raise ProjectArchiveError("A ZIP entry resolves outside the project directory.")
            output.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(entry) as source, output.open("wb") as target:
                shutil.copyfileobj(source, target)
            os.chmod(output, 0o644)
    finally:
        archive.close()
    return destination_path
