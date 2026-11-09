import io
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest.mock import Mock, patch

from dashboard.github_api import GitHubAPIError, GitHubClient
from dashboard.zip_validation import ProjectArchiveError, extract_project_zip, validate_project_zip


def make_zip(entries):
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as archive:
        for name, data in entries.items():
            archive.writestr(name, data)
    return output.getvalue()


class ZipValidationTests(unittest.TestCase):
    def test_accepts_project_files_at_archive_root(self):
        project = make_zip({"index.html": "<html/>", "tools/capture.mjs": "ok"})
        validate_project_zip(project)

    def test_accepts_one_wrapping_project_folder(self):
        project = make_zip(
            {
                "my-video/index.html": "<html/>",
                "my-video/tools/capture.mjs": "ok",
            }
        )
        with tempfile.TemporaryDirectory() as temporary:
            target = extract_project_zip(project, temporary)
            self.assertTrue((Path(target) / "index.html").exists())
            self.assertTrue((Path(target) / "tools/capture.mjs").exists())

    def test_accepts_zip_paths_with_current_directory_prefix(self):
        project = make_zip(
            {
                "./index.html": "<html/>",
                "./tools/capture.mjs": "ok",
                "./": "",
            }
        )
        validate_project_zip(project)

    def test_rejects_path_traversal(self):
        project = make_zip(
            {
                "index.html": "<html/>",
                "tools/capture.mjs": "ok",
                "../outside.txt": "bad",
            }
        )
        with self.assertRaises(ProjectArchiveError):
            validate_project_zip(project)

    def test_rejects_non_project_archives(self):
        with self.assertRaises(ProjectArchiveError):
            validate_project_zip(make_zip({"readme.txt": "no renderer"}))

    def test_rejects_duplicate_paths(self):
        output = io.BytesIO()
        with zipfile.ZipFile(output, "w") as archive:
            archive.writestr("index.html", "first")
            archive.writestr("index.html", "second")
            archive.writestr("tools/capture.mjs", "ok")
        with self.assertRaises(ProjectArchiveError):
            validate_project_zip(output.getvalue())


class GitHubDispatchTests(unittest.TestCase):
    def test_dispatches_only_allowlisted_workflow_inputs(self):
        client = GitHubClient("owner", "private-repo", "token")
        self.assertEqual(client.session.headers["Authorization"], "Bearer token")
        repository = Mock()
        repository.json.return_value = {"visibility": "private", "default_branch": "main"}
        reference = Mock()
        reference.json.return_value = {"object": {"sha": "abc123"}}
        with patch.object(
            client,
            "_request",
            side_effect=[repository, reference, Mock(), Mock(), Mock()],
        ) as request:
            branch = client.start_render(
                b"zip bytes", "a" * 32, "stickman", "9:16", "draft", True
            )
        self.assertEqual(branch, "video-" + "a" * 32)
        self.assertEqual(request.call_count, 5)
        dispatch = request.call_args_list[-1].kwargs["json"]
        self.assertEqual(dispatch["inputs"]["style"], "stickman")
        self.assertEqual(dispatch["inputs"]["gofile"], "true")
        self.assertEqual(dispatch["ref"], branch)

    def test_refuses_to_upload_project_to_public_repository(self):
        client = GitHubClient("owner", "public-repo", "token")
        repository = Mock()
        repository.json.return_value = {"visibility": "public", "default_branch": "main"}
        with patch.object(client, "_request", return_value=repository) as request:
            with self.assertRaises(GitHubAPIError):
                client.start_render(b"zip bytes", "a" * 32, "stickman", "9:16", "draft", False)
        request.assert_called_once()

    def test_removes_temporary_branch_if_upload_or_dispatch_fails(self):
        client = GitHubClient("owner", "private-repo", "token")
        repository = Mock()
        repository.json.return_value = {"visibility": "private", "default_branch": "main"}
        reference = Mock()
        reference.json.return_value = {"object": {"sha": "abc123"}}
        with patch.object(
            client,
            "_request",
            side_effect=[
                repository,
                reference,
                Mock(),
                Mock(),
                GitHubAPIError("dispatch failed"),
                Mock(),
            ],
        ) as request:
            with self.assertRaisesRegex(GitHubAPIError, "dispatch failed"):
                client.start_render(
                    b"zip bytes", "b" * 32, "stickman", "9:16", "draft", False
                )
        self.assertEqual(request.call_args_list[-1].args[:2], ("DELETE", "/git/refs/heads/video-" + "b" * 32))


if __name__ == "__main__":
    unittest.main()
