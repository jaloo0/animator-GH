from __future__ import annotations

import hmac
import uuid

import streamlit as st

from github_api import GitHubAPIError, GitHubClient
from zip_validation import ProjectArchiveError, validate_project_zip

st.set_page_config(page_title="Faceless Video Studio", page_icon="🎬", layout="wide")

STYLES = {
    "lamplit-ink": ("Lamplit Ink", ["9:16"]),
    "red-ghost": ("Red Ghost", ["9:16", "16:9"]),
    "sunlit-explainer": ("Sunlit Explainer", ["16:9", "9:16"]),
    "stickman": ("Stickman", ["16:9", "9:16"]),
    "clay-atlas": ("Clay Atlas", ["16:9"]),
}


def require_login() -> None:
    try:
        expected = str(st.secrets["dashboard"]["access_code"])
    except (KeyError, FileNotFoundError):
        st.error("Configure dashboard.access_code in Streamlit secrets before publishing this app.")
        st.stop()
    if len(expected) < 16:
        st.error("dashboard.access_code must be at least 16 characters.")
        st.stop()

    if st.session_state.get("authenticated"):
        return

    st.title("Faceless Video Studio")
    st.caption("Private access required.")
    entered = st.text_input("Access code", type="password")
    if st.button("Unlock dashboard", type="primary"):
        attempts = st.session_state.get("login_attempts", 0)
        if attempts >= 5:
            st.error("Too many attempts in this session. Reload the page to try again.")
        elif hmac.compare_digest(entered, expected):
            st.session_state["authenticated"] = True
            st.rerun()
        else:
            st.session_state["login_attempts"] = attempts + 1
            st.error("Incorrect access code.")
    st.stop()


def github_client() -> GitHubClient:
    try:
        settings = st.secrets["github"]
        return GitHubClient(
            owner=str(settings["owner"]),
            repo=str(settings["repo"]),
            token=str(settings["token"]),
        )
    except (KeyError, FileNotFoundError) as exc:
        st.error("Configure github.owner, github.repo, and github.token in Streamlit secrets.")
        st.stop()
        raise exc


def creative_prompt(style: str, aspect: str, mode: str, source: str) -> str:
    label = STYLES[style][0]
    request_type = "raw idea" if mode == "Raw idea" else "story/script"
    return f"""Use the faceless-videos skill in this repository to make a complete project for the request below.

Style: {label} ({style})
Aspect ratio: {aspect}
Input type: {request_type}

User input:
{source}

Creative workflow:
1. If this is a raw idea, develop one original, fact-checked concept and narration. If it is a story/script,
   preserve its core events and improve only what is needed for narration and timing.
2. Follow faceless-videos/SKILL.md and faceless-videos/styles/{style}/STYLE.md. Build from the matching example.
3. Keep the existing renderer and its known command interface. Do not add external AI image/video API calls.
   For Clay Atlas, reuse the supplied example stills unless I provide replacement images.
4. Create all needed project files in a single folder and ensure the project is ready for the static render
   pipeline: index.html, tools/capture.mjs, script file, shots, assets, and style-specific files.
5. Do not run setup, self-tests, contact-sheet generation, or a full render. Those run later in GitHub Actions.
6. Put the final project folder in a ZIP archive. Exclude node_modules, renders, review output, caches, and secrets.
7. Before finishing, list the ZIP path and summarize the script, duration, and style-specific assets.

Use the supplied story as user-owned input; do not copy another creator's script or shot list."""


def cleanup_job_branch(client: GitHubClient, branch: str) -> None:
    try:
        client.delete_branch(branch)
    except GitHubAPIError as exc:
        st.error(f"Could not remove the temporary project branch: {exc}")
        return
    st.session_state.pop("render_job", None)
    st.session_state.pop("video_run_id", None)
    st.session_state.pop("video_bytes", None)
    st.session_state.pop("gofile_link", None)
    st.success("Temporary project branch deleted.")
    st.rerun()


def show_job(client: GitHubClient) -> None:
    job = st.session_state.get("render_job")
    if not job:
        return

    st.divider()
    st.subheader("Render job")
    try:
        run = client.latest_run(job["branch"])
    except GitHubAPIError as exc:
        st.error(str(exc))
        return

    if run is None:
        st.info("Workflow queued. Refresh this page in a few seconds to see its status.")
        return

    st.markdown(f"[Open run in GitHub Actions]({run['html_url']})")
    status = run.get("status", "unknown")
    conclusion = run.get("conclusion")
    st.write(f"**Status:** {status}" + (f" — {conclusion}" if conclusion else ""))

    if status != "completed":
        st.info("The render runs on GitHub Actions. Refresh this page to update progress.")
        return
    if st.button("Delete uploaded project branch from GitHub", key="delete-project-branch"):
        cleanup_job_branch(client, job["branch"])

    if conclusion != "success":
        st.error("The render did not complete successfully. Open the Actions run for the failing step and logs.")

    run_id = int(run["id"])
    if st.session_state.get("video_run_id") != run_id:
        try:
            name, video, gofile_link = client.download_video_artifact(run_id)
        except GitHubAPIError as exc:
            st.error(str(exc))
            return
        st.session_state["video_run_id"] = run_id
        st.session_state["video_name"] = name
        st.session_state["video_bytes"] = video
        st.session_state["gofile_link"] = gofile_link

    video = st.session_state["video_bytes"]
    st.success(f"Video ready: {len(video) / (1024 * 1024):.1f} MB")
    st.download_button(
        "Download MP4",
        data=video,
        file_name=st.session_state["video_name"],
        mime="video/mp4",
        type="primary",
    )

    link = st.session_state.get("gofile_link", "")
    if link:
        st.success(f"GoFile share link: {link}")
        st.warning("Anyone with this temporary link may be able to access the video.")
    elif job.get("gofile"):
        st.warning("The render succeeded, but no GoFile link was returned. The MP4 is still downloadable above.")

require_login()
st.title("Faceless Video Studio")
st.caption("One OpenCode creative pass. A fixed GitHub Actions pipeline handles voice, timing, checks, render, and delivery.")

client = github_client()
with st.expander("How it works", expanded=False):
    st.markdown(
        """
1. Use OpenCode for the creative work: write the script and adapt the chosen style's example project.
2. Upload that complete project ZIP here. This dashboard does not send prompts to an AI model.
3. GitHub Actions runs the fixed local pipeline with one Chrome worker, then stores the MP4 as an artifact.
4. If enabled for the job, the action uploads a copy to GoFile and returns its temporary share link.
"""
    )

with st.form("video_request"):
    mode = st.radio("Starting point", ["Raw idea", "Story/script"], horizontal=True)
    source = st.text_area(
        "Idea or story",
        height=140,
        placeholder="Describe the video idea or paste the story/script you want OpenCode to adapt.",
    )
    style = st.selectbox(
        "Visual style",
        list(STYLES),
        format_func=lambda key: STYLES[key][0],
    )
    aspect = st.selectbox("Aspect ratio", STYLES[style][1])
    quality = st.radio(
        "Render size",
        ["draft", "full"],
        format_func=lambda value: (
            "Draft — half resolution, lighter output" if value == "draft" else "Full — native project resolution"
        ),
        index=1,
        horizontal=True,
    )
    project_zip = st.file_uploader(
        "OpenCode project ZIP (max 50 MB)",
        type=["zip"],
        accept_multiple_files=False,
    )
    gofile = st.checkbox(
        "Also upload the finished MP4 to GoFile and return a temporary share link",
        value=False,
        help="This explicitly sends the finished video to GoFile. Anyone with its link may access it.",
    )
    submitted = st.form_submit_button("Start fixed render workflow", type="primary")

if submitted:
    if source.strip():
        prompt = creative_prompt(style, aspect, mode, source.strip())
        st.subheader("OpenCode creative prompt")
        st.caption("Run this prompt in OpenCode, create the project ZIP, then upload it above and start the workflow.")
        st.code(prompt, language="text")
    elif project_zip is None:
        st.error("Enter an idea or story/script to create the OpenCode prompt.")

    if project_zip is not None:
        started = False
        try:
            archive_data = project_zip.getvalue()
            validate_project_zip(archive_data)
            if client.has_active_render():
                st.warning("A render is already queued or running in this repository. Wait for it to finish first.")
            else:
                job_id = uuid.uuid4().hex
                branch = client.start_render(
                    project_zip=archive_data,
                    job_id=job_id,
                    style=style,
                    aspect=aspect,
                    quality=quality,
                    gofile=gofile,
                )
                started = True
        except ProjectArchiveError as exc:
            st.error(str(exc))
        except GitHubAPIError as exc:
            st.error(str(exc))
        else:
            if started:
                st.session_state["render_job"] = {
                    "job_id": job_id,
                    "branch": branch,
                    "style": style,
                    "aspect": aspect,
                    "gofile": gofile,
                }
                st.session_state.pop("video_run_id", None)
                st.session_state.pop("video_bytes", None)
                st.session_state.pop("gofile_link", None)
                st.success("Workflow dispatched. This page does not run the render or open your local browser.")
    elif source.strip():
        st.info("After OpenCode creates the project ZIP, upload it here and submit again to start rendering.")

if st.button("Refresh render status"):
    st.rerun()
show_job(client)
