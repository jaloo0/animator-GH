from __future__ import annotations

import hmac
import uuid

import streamlit as st

from constants import STYLE_OPTIONS
from github_api import GitHubAPIError, GitHubClient

st.set_page_config(page_title="Faceless Video Studio", page_icon="🎬", layout="wide")

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
    st.success("Temporary request branch deleted.")
    st.rerun()


def show_job(client: GitHubClient) -> None:
    job = st.session_state.get("render_job")
    if not job:
        return

    st.divider()
    st.subheader("Video job")
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
        st.info("OpenCode and the fixed render pipeline are running on GitHub Actions. Refresh to update progress.")
        return
    if st.button("Delete temporary request branch from GitHub", key="delete-project-branch"):
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
st.caption("OpenCode with OpenRouter Auto creates the story and visuals; GitHub Actions handles voice, checks, rendering, and delivery.")

client = github_client()
with st.expander("How it works", expanded=False):
    st.markdown(
        """
1. Enter a raw idea or paste a story/script, then choose the style and render quality.
2. GitHub Actions runs OpenCode with OpenRouter Auto to create the project from the included style example.
3. A fixed local pipeline generates narration, timing, sound, checks the shots, and renders the video.
4. Download the MP4 here. GoFile delivery is optional.

OpenCode runs remotely; you do not need a terminal or a project ZIP. Factual AI-generated details may still need
verification before publishing.
"""
    )

with st.form("video_request"):
    mode = st.radio("Starting point", ["Raw idea", "Story/script"], horizontal=True)
    source = st.text_area(
        "Idea or story",
        height=140,
        placeholder="Describe the video idea or paste the story/script you want OpenCode to adapt.",
        max_chars=16_384,
    )
    style = st.selectbox(
        "Visual style",
        list(STYLE_OPTIONS),
        format_func=lambda key: STYLE_OPTIONS[key][0],
    )
    aspect = st.selectbox("Aspect ratio", STYLE_OPTIONS[style][1])
    quality = st.radio(
        "Render size",
        ["draft", "full"],
        format_func=lambda value: (
            "Draft — half resolution, lighter output" if value == "draft" else "Full — native project resolution"
        ),
        index=1,
        horizontal=True,
    )
    gofile = st.checkbox(
        "Also upload the finished MP4 to GoFile and return a temporary share link",
        value=False,
        help="This explicitly sends the finished video to GoFile. Anyone with its link may access it.",
    )
    submitted = st.form_submit_button("Create and render video", type="primary")

if submitted:
    if not source.strip():
        st.error("Enter an idea or story/script to start the video.")
    else:
        started = False
        try:
            if client.has_active_render():
                st.warning("A render is already queued or running in this repository. Wait for it to finish first.")
            else:
                job_id = uuid.uuid4().hex
                branch = client.start_render(
                    source_text=source,
                    source_type=mode,
                    job_id=job_id,
                    style=style,
                    aspect=aspect,
                    quality=quality,
                    gofile=gofile,
                )
                started = True
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
                st.success("OpenCode and the video workflow have been dispatched to GitHub Actions.")

if st.button("Refresh render status"):
    st.rerun()
show_job(client)
