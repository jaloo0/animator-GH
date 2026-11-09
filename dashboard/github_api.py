from __future__ import annotations

import base64
import io
import re
import zipfile
from urllib.parse import quote

import requests

API_ROOT = "https://api.github.com"
WORKFLOW_FILE = "render-video.yml"
BRANCH_PATTERN = re.compile(r"^video-[a-f0-9]{32}$")
STYLE_IDS = {"lamplit-ink", "red-ghost", "sunlit-explainer", "stickman", "clay-atlas"}


class GitHubAPIError(RuntimeError):
    pass


class GitHubClient:
    def __init__(self, owner: str, repo: str, token: str):
        self.owner = owner
        self.repo = repo
        self.token = token
        self.base = f"{API_ROOT}/repos/{quote(owner, safe='')}/{quote(repo, safe='')}"
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {token}",
                "X-GitHub-Api-Version": "2026-03-10",
                "User-Agent": "faceless-videos-dashboard",
            }
        )

    def _request(self, method: str, path: str, **kwargs) -> requests.Response:
        try:
            response = self.session.request(method, f"{self.base}{path}", timeout=60, **kwargs)
        except requests.RequestException as exc:
            raise GitHubAPIError(f"Could not reach GitHub: {exc}") from exc
        if not response.ok:
            try:
                detail = response.json().get("message", response.text)
            except ValueError:
                detail = response.text
            raise GitHubAPIError(f"GitHub returned HTTP {response.status_code}: {detail}")
        return response

    def repository(self) -> dict:
        return self._request("GET", "").json()

    def start_render(
        self,
        project_zip: bytes,
        job_id: str,
        style: str,
        aspect: str,
        quality: str,
        gofile: bool,
    ) -> str:
        if not re.fullmatch(r"[a-f0-9]{32}", job_id):
            raise GitHubAPIError("Invalid job identifier.")
        if style not in STYLE_IDS or aspect not in {"9:16", "16:9"} or quality not in {"draft", "full"}:
            raise GitHubAPIError("Invalid render options.")
        if len(project_zip) > 50 * 1024 * 1024:
            raise GitHubAPIError("Project ZIPs must be 50 MB or smaller.")
        branch = f"video-{job_id}"
        repository = self.repository()
        if repository.get("visibility") != "private":
            raise GitHubAPIError(
                "The render repository must be private. Uploaded project ZIPs contain your work."
            )
        default_branch = repository.get("default_branch")
        if not default_branch:
            raise GitHubAPIError("Could not determine the repository's default branch.")

        source_ref = self._request(
            "GET", f"/git/ref/heads/{quote(default_branch, safe='')}"
        ).json()
        self._request(
            "POST",
            "/git/refs",
            json={"ref": f"refs/heads/{branch}", "sha": source_ref["object"]["sha"]},
        )
        try:
            self._request(
                "PUT",
                f"/contents/video-jobs/{job_id}.zip",
                json={
                    "message": f"Upload video project {job_id}",
                    "content": base64.b64encode(project_zip).decode("ascii"),
                    "branch": branch,
                },
            )
            self._request(
                "POST",
                f"/actions/workflows/{WORKFLOW_FILE}/dispatches",
                json={
                    "ref": branch,
                    "inputs": {
                        "job_id": job_id,
                        "style": style,
                        "aspect": aspect,
                        "quality": quality,
                        "gofile": "true" if gofile else "false",
                    },
                },
            )
        except GitHubAPIError as exc:
            try:
                self.delete_branch(branch)
            except GitHubAPIError as cleanup_exc:
                raise GitHubAPIError(
                    f"{exc} The temporary branch {branch} could not be removed: {cleanup_exc}"
                ) from exc
            raise
        return branch

    def latest_run(self, branch: str) -> dict | None:
        self._validate_branch(branch)
        data = self._request(
            "GET",
            f"/actions/workflows/{WORKFLOW_FILE}/runs",
            params={"branch": branch, "event": "workflow_dispatch", "per_page": 5},
        ).json()
        for run in data.get("workflow_runs", []):
            if run.get("head_branch") == branch:
                return run
        return None

    def has_active_render(self) -> bool:
        for status in ("queued", "in_progress"):
            data = self._request(
                "GET",
                f"/actions/workflows/{WORKFLOW_FILE}/runs",
                params={"status": status, "per_page": 1},
            ).json()
            if data.get("workflow_runs"):
                return True
        return False

    def artifacts(self, run_id: int) -> list[dict]:
        data = self._request("GET", f"/actions/runs/{run_id}/artifacts").json()
        return data.get("artifacts", [])

    def download_video_artifact(
        self, run_id: int, max_bytes: int = 256 * 1024**2
    ) -> tuple[str, bytes, str]:
        artifacts = self.artifacts(run_id)
        video_artifacts = [
            item for item in artifacts if item.get("name") == "rendered-video" and not item.get("expired")
        ]
        if not video_artifacts:
            raise GitHubAPIError("The completed run has no available rendered-video artifact.")
        artifact = video_artifacts[0]
        response = self._request(
            "GET", f"/actions/artifacts/{artifact['id']}/zip", stream=True
        )
        buffer = io.BytesIO()
        size = 0
        try:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                size += len(chunk)
                if size > max_bytes:
                    raise GitHubAPIError(
                        "The render artifact exceeds the dashboard's 256 MB download limit. "
                        "Download it from the linked GitHub Actions run instead."
                    )
                buffer.write(chunk)
        finally:
            response.close()

        try:
            with zipfile.ZipFile(buffer) as archive:
                candidates = [
                    name
                    for name in archive.namelist()
                    if name.lower().endswith(".mp4") and "/" not in name
                ]
                if len(candidates) != 1:
                    raise GitHubAPIError("The render artifact must contain exactly one MP4.")
                link = ""
                if "gofile-link.txt" in archive.namelist():
                    link = archive.read("gofile-link.txt").decode("utf-8", errors="replace").strip()
                    if not link.startswith("https://gofile.io/"):
                        link = ""
                return candidates[0], archive.read(candidates[0]), link
        except zipfile.BadZipFile as exc:
            raise GitHubAPIError("GitHub returned an invalid video artifact.") from exc

    def delete_branch(self, branch: str) -> None:
        self._validate_branch(branch)
        self._request("DELETE", f"/git/refs/heads/{quote(branch, safe='')}")

    @staticmethod
    def _validate_branch(branch: str) -> None:
        if not BRANCH_PATTERN.fullmatch(branch):
            raise GitHubAPIError("Invalid render branch identifier.")
