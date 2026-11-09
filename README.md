# Faceless Video Studio

This repository keeps the existing [faceless-videos skill](./faceless-videos/) and adds an optional Streamlit
dashboard backed by GitHub Actions. OpenCode handles one creative pass; a fixed Actions pipeline handles local
voice generation, word timing, checks, rendering, and optional GoFile delivery.

- [Full setup and walkthrough](./GITHUB-ACTIONS-GUIDE.md)
- [Streamlit dashboard](./dashboard/app.py)
- [GitHub render workflow](./.github/workflows/render-video.yml)

The original skill scripts and examples remain available. The dashboard path is additive; running the skill manually
continues to work as before.

Important: the render repository must be **private**, and the public Streamlit URL is protected with an access code.
The optional GoFile step makes a temporary public share link for the finished MP4.
