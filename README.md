# Faceless Video Studio

This repository keeps the existing [faceless-videos skill](./faceless-videos/) and adds an end-user Streamlit
dashboard backed by GitHub Actions. Submit an idea or story in the dashboard; OpenCode runs with OpenRouter Auto
remotely to create the project, then a fixed Actions pipeline handles voice generation, timing, checks, rendering,
and optional GoFile delivery. No local terminal or project ZIP is required for the dashboard workflow.

- [Full setup and walkthrough](./GITHUB-ACTIONS-GUIDE.md)
- [Streamlit dashboard](./dashboard/app.py)
- [GitHub render workflow](./.github/workflows/render-video.yml)

The original skill scripts and examples remain available. The dashboard path is additive; running the skill manually
continues to work as before.

Setup requires the private repository to store an `OPENROUTER_API_KEY` GitHub Actions secret and Streamlit secrets
for dashboard access and the GitHub API. The optional GoFile step makes a temporary public share link for the finished MP4.
