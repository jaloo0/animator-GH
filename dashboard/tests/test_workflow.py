import base64
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from dashboard.github_api import GitHubAPIError, GitHubClient
from dashboard.prepare_project import prepare_project, validate_generated_project


class PrepareProjectTests(unittest.TestCase):
    def test_copies_style_starter_and_request_into_project(self):
        with tempfile.TemporaryDirectory() as temporary:
            request = Path(temporary) / "request.json"
            request.write_text(
                json.dumps({"source_type": "Raw idea", "source_text": "A story from an idea."}),
                encoding="utf-8",
            )
            target = Path(temporary) / "project"
            baseline = Path(temporary) / "baseline.json"
            prepare_project(request, "stickman", "9:16", target, baseline)
            self.assertTrue((target / "index.html").is_file())
            self.assertTrue((target / "tools/capture.mjs").is_file())
            project_request = json.loads((target / "video-request.json").read_text(encoding="utf-8"))
            self.assertEqual(project_request["source_text"], "A story from an idea.")
            self.assertEqual(project_request["aspect"], "9:16")
            with self.assertRaisesRegex(ValueError, "did not update the narration script"):
                validate_generated_project(target, baseline)
            (target / "script.txt").write_text("A new video script.\n", encoding="utf-8")
            (target / "src/shots.js").write_text("// adapted shot list\n", encoding="utf-8")
            validate_generated_project(target, baseline)

    def test_rejects_unsupported_style_aspect(self):
        with tempfile.TemporaryDirectory() as temporary:
            request = Path(temporary) / "request.json"
            request.write_text(
                json.dumps({"source_type": "Raw idea", "source_text": "A story."}),
                encoding="utf-8",
            )
            with self.assertRaisesRegex(ValueError, "Unsupported style or aspect"):
                prepare_project(request, "lamplit-ink", "16:9", Path(temporary) / "project")


class OpenCodeConfigTests(unittest.TestCase):
    def test_agent_has_no_shell_or_network_tools(self):
        config_path = Path(__file__).resolve().parents[1] / "opencode_config.json"
        config = json.loads(config_path.read_text(encoding="utf-8"))
        self.assertEqual(config["default_agent"], "video-creator")
        for rule_set in (
            config["permissions"],
            config["agents"]["video-creator"]["permissions"],
        ):
            self.assertIn(
                {"action": "*", "resource": "*", "effect": "deny"},
                rule_set,
            )
            allowed = {
                rule["action"]
                for rule in rule_set
                if rule["effect"] == "allow"
            }
            self.assertTrue(allowed.isdisjoint({"shell", "webfetch", "websearch", "subagent"}))


class GitHubDispatchTests(unittest.TestCase):
    def test_dispatches_allowlisted_options_and_stores_request(self):
        client = GitHubClient("owner", "private-repo", "token")
        self.assertEqual(client.session.headers["Authorization"], "Bearer token")
        repository = Mock()
        repository.json.return_value = {"visibility": "private", "default_branch": "main"}
        workflow = Mock()
        workflow.json.return_value = {"state": "active"}
        reference = Mock()
        reference.json.return_value = {"object": {"sha": "abc123"}}
        with patch.object(
            client,
            "_request",
            side_effect=[repository, workflow, reference, Mock(), Mock(), Mock()],
        ) as request:
            branch = client.start_render(
                "A short story", "Story/script", "a" * 32, "stickman", "9:16", "draft", True
            )
        self.assertEqual(branch, "video-" + "a" * 32)
        self.assertEqual(request.call_count, 6)
        dispatch = request.call_args_list[-1].kwargs["json"]
        self.assertEqual(dispatch["inputs"]["style"], "stickman")
        self.assertEqual(dispatch["inputs"]["gofile"], "true")
        self.assertEqual(dispatch["ref"], branch)
        uploaded = json.loads(
            base64.b64decode(request.call_args_list[4].kwargs["json"]["content"])
        )
        self.assertEqual(uploaded, {"source_type": "Story/script", "source_text": "A short story"})

    def test_requires_acknowledgement_for_public_repository(self):
        client = GitHubClient("owner", "public-repo", "token")
        repository = Mock()
        repository.json.return_value = {"visibility": "public", "default_branch": "main"}
        with patch.object(client, "_request", return_value=repository) as request:
            with self.assertRaisesRegex(GitHubAPIError, "This render repository is public"):
                client.start_render(
                    "A story", "Story/script", "a" * 32, "stickman", "9:16", "draft", False
                )
        request.assert_called_once()

    def test_dispatches_to_public_repository_after_acknowledgement(self):
        client = GitHubClient("owner", "public-repo", "token")
        repository = Mock()
        repository.json.return_value = {"visibility": "public", "default_branch": "main"}
        workflow = Mock()
        workflow.json.return_value = {"state": "active"}
        reference = Mock()
        reference.json.return_value = {"object": {"sha": "abc123"}}
        with patch.object(
            client,
            "_request",
            side_effect=[repository, workflow, reference, Mock(), Mock(), Mock()],
        ) as request:
            branch = client.start_render(
                "A short story",
                "Story/script",
                "e" * 32,
                "stickman",
                "9:16",
                "draft",
                False,
                public_content_acknowledged=True,
            )
        self.assertEqual(branch, "video-" + "e" * 32)
        self.assertEqual(request.call_count, 6)
        self.assertEqual(request.call_args_list[-1].args[0], "POST")
        self.assertTrue(request.call_args_list[-1].args[1].endswith("/dispatches"))

    def test_removes_temporary_branch_if_upload_or_dispatch_fails(self):
        client = GitHubClient("owner", "private-repo", "token")
        repository = Mock()
        repository.json.return_value = {"visibility": "private", "default_branch": "main"}
        workflow = Mock()
        workflow.json.return_value = {"state": "active"}
        reference = Mock()
        reference.json.return_value = {"object": {"sha": "abc123"}}
        with patch.object(
            client,
            "_request",
            side_effect=[
                repository,
                workflow,
                reference,
                Mock(),
                Mock(),
                GitHubAPIError("dispatch failed"),
                Mock(),
            ],
        ) as request:
            with self.assertRaisesRegex(GitHubAPIError, "dispatch failed"):
                client.start_render(
                    "A story", "Story/script", "b" * 32, "stickman", "9:16", "draft", False
                )
        self.assertEqual(
            request.call_args_list[-1].args[:2],
            ("DELETE", "/git/refs/heads/video-" + "b" * 32),
        )

    def test_reports_missing_workflow_before_creating_temporary_branch(self):
        client = GitHubClient("owner", "private-repo", "token")
        repository = Mock()
        repository.json.return_value = {"visibility": "private", "default_branch": "main"}
        not_found = Mock()
        not_found.ok = False
        not_found.status_code = 404
        not_found.json.return_value = {"message": "Not Found"}
        with patch.object(client.session, "request", side_effect=[repository, not_found]) as request:
            with self.assertRaisesRegex(GitHubAPIError, "default branch"):
                client.start_render(
                    "A story", "Story/script", "d" * 32, "stickman", "9:16", "draft", False
                )
        self.assertEqual(request.call_count, 2)

    def test_rejects_unsupported_aspect_and_oversized_source(self):
        client = GitHubClient("owner", "private-repo", "token")
        for source_text, style, aspect in (
            ("A story", "lamplit-ink", "16:9"),
            ("x" * (16 * 1024 + 1), "stickman", "9:16"),
        ):
            with self.subTest(style=style, aspect=aspect):
                with self.assertRaises(GitHubAPIError):
                    client.start_render(
                        source_text,
                        "Story/script",
                        "c" * 32,
                        style,
                        aspect,
                        "draft",
                        False,
                    )


if __name__ == "__main__":
    unittest.main()
