from __future__ import annotations

import hashlib
import json
import shutil
import sys
from pathlib import Path

if __package__:
    from .constants import MAX_SOURCE_BYTES, SOURCE_TYPES, STYLE_ASPECTS
else:
    from constants import MAX_SOURCE_BYTES, SOURCE_TYPES, STYLE_ASPECTS


def prepare_project(
    request_path: str | Path,
    style: str,
    aspect: str,
    destination: str | Path,
    baseline_path: str | Path | None = None,
) -> Path:
    request_file = Path(request_path)
    target = Path(destination)
    if style not in STYLE_ASPECTS or aspect not in STYLE_ASPECTS[style]:
        raise ValueError("Unsupported style or aspect ratio.")
    if target.exists():
        raise ValueError("Project destination already exists.")

    try:
        request = json.loads(request_file.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError("The submitted video request is missing or invalid.") from exc

    if not isinstance(request, dict):
        raise ValueError("The submitted video request must be a JSON object.")
    source_type = request.get("source_type")
    source_text = request.get("source_text")
    if (
        not isinstance(source_type, str)
        or source_type not in SOURCE_TYPES
        or not isinstance(source_text, str)
        or not source_text.strip()
    ):
        raise ValueError("The submitted video request must contain an idea or story/script.")
    source_text = source_text.strip()
    if len(source_text.encode("utf-8")) > MAX_SOURCE_BYTES:
        raise ValueError("Ideas and stories must be 16 KB or smaller.")

    example = Path(__file__).resolve().parents[1] / "faceless-videos" / "styles" / style / "example"
    if not example.is_dir():
        raise ValueError(f"The starter project for {style} is missing.")
    shutil.copytree(example, target)
    if baseline_path:
        baseline = {}
        for relative_path in ("script.json", "script.txt", "src/shots.js"):
            source = target / relative_path
            if source.is_file():
                baseline[relative_path] = hashlib.sha256(source.read_bytes()).hexdigest()
        Path(baseline_path).write_text(json.dumps(baseline, indent=2) + "\n", encoding="utf-8")
        if not {"script.json", "script.txt"} & baseline.keys() or "src/shots.js" not in baseline:
            raise ValueError("The selected starter is missing its script or shot source.")

    (target / "video-request.json").write_text(
        json.dumps(
            {
                "source_type": source_type,
                "source_text": source_text,
                "style": style,
                "aspect": aspect,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    return target


def validate_generated_project(project_path: str | Path, baseline_path: str | Path) -> None:
    project = Path(project_path)
    try:
        baseline = json.loads(Path(baseline_path).read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise ValueError("The starter project baseline is missing or invalid.") from exc

    required = ("index.html", "tools/capture.mjs", "src/shots.js")
    if any(not (project / relative_path).is_file() for relative_path in required):
        raise ValueError("OpenCode removed a required project or renderer file.")
    if not any((project / script).is_file() for script in ("script.json", "script.txt")):
        raise ValueError("OpenCode removed the project's narration script.")

    changed = set()
    for relative_path, original_hash in baseline.items():
        candidate = project / relative_path
        if candidate.is_file() and hashlib.sha256(candidate.read_bytes()).hexdigest() != original_hash:
            changed.add(relative_path)
    if not any(path in changed for path in ("script.json", "script.txt")):
        raise ValueError("OpenCode did not update the narration script for this request.")
    if "src/shots.js" not in changed:
        raise ValueError("OpenCode did not adapt the shots for this request.")


def main() -> None:
    if len(sys.argv) == 4 and sys.argv[1] == "--validate":
        try:
            validate_generated_project(sys.argv[2], sys.argv[3])
        except ValueError as exc:
            raise SystemExit(str(exc)) from exc
        return
    if len(sys.argv) not in {5, 6}:
        raise SystemExit(
            "usage: prepare_project.py REQUEST_JSON STYLE ASPECT DESTINATION [BASELINE_JSON]\n"
            "       prepare_project.py --validate PROJECT_DIRECTORY BASELINE_JSON"
        )
    try:
        baseline = sys.argv[5] if len(sys.argv) == 6 else None
        prepare_project(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], baseline)
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc


if __name__ == "__main__":
    main()
