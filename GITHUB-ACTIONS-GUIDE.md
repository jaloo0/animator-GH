# Ultimate walkthrough: OpenCode + Streamlit + GitHub Actions

This adds a dashboard to the existing faceless-videos skill without replacing its scripts or examples:

1. **OpenCode does the creative work once.** For a raw idea, it develops a script and adapts a style example. For a
   supplied story, it adapts that story. It does not install dependencies, run the checks, or render the film.
2. **Streamlit collects the prepared project ZIP** and dispatches a named GitHub Actions workflow.
3. **GitHub Actions runs fixed commands** for local voice, timing, sound, validation, and video capture. It uses one
   Chrome worker and allows only one active render, so rendering does not start several browsers on the same machine.
4. **The dashboard retrieves the MP4 artifact.** Optionally, the workflow uploads it to GoFile and returns the
   temporary link.

The dashboard does not call an AI API. A GitHub access token can operate GitHub's repository and Actions APIs, but
cannot generate scripts: GitHub Models' inference API was retired in July 2026. OpenCode remains the only AI stage,
so no additional model API key is needed.

## What stays the same

- The original `faceless-videos/SKILL.md`, style guides, example projects, and manual scripts are retained.
- The new path uses the same Chrome/FFmpeg capture tools and local Kokoro/Whisper models.
- A GitHub Actions job does not open or crash your desktop browser. It renders in an isolated GitHub-hosted runner.
- The rendering pipeline uses fixed, allowlisted commands; it never accepts arbitrary shell commands from Streamlit.
- The dashboard accepts project scripts and browser code that Actions will execute. Upload only projects you trust.
- Project ZIPs are uploaded to a **private** GitHub repository branch. The dashboard refuses to dispatch from a public
  render repository.

## Requirements and cost notes

- A GitHub account/repository with Actions enabled.
- A Streamlit Community Cloud account, or another Streamlit host.
- OpenCode installed locally and able to access this repository.
- A fine-grained GitHub token with access to the private render repository:
  - **Contents: Read and write** (create a temporary branch and upload the project ZIP)
  - **Actions: Read and write** (dispatch the workflow and read its artifact)
  - Metadata read is normally granted automatically.
- GitHub Actions minutes/storage apply to private repositories according to your GitHub plan. The workflow can take
  several minutes to tens of minutes; the dashboard itself does not spend model tokens while rendering.
- GoFile upload is optional per job and unchecked by default. It sends the rendered video to an external service and creates a temporary
  share link. Anyone with that link may be able to access the file. The MP4 also remains available as a GitHub
  artifact for seven days.

## 1. Put the workflow in a private GitHub repository

The app uploads each project ZIP to a temporary branch. Use a private repository so that scripts, images, and source
material are not published. If this repository is public, create a private render repository and put this project
there before configuring the dashboard.

From a local clone, commit and push the source files, including the complete `faceless-videos/` directory, the
`.github/workflows/render-video.yml` workflow, and the `dashboard/` directory. Do not commit any token, access code,
or Streamlit secrets. The supplied `faceless-videos-skill-v2.zip` archive is not needed in GitHub; keep the extracted
`faceless-videos/` folder.

Enable GitHub Actions for the private repository. The default branch must contain the workflow before dashboard
dispatches can run. In repository **Settings → Actions → General**, allow the workflow to run on GitHub-hosted
Ubuntu runners.

## 2. Create and configure the Streamlit app

Create a Streamlit Community Cloud app from the private repository:

- **Main file path:** `dashboard/app.py`
- The root `requirements.txt` includes `dashboard/requirements.txt`.

In the app's **Settings → Secrets**, add:

```toml
[github]
owner = "YOUR_GITHUB_OWNER"
repo = "YOUR_PRIVATE_RENDER_REPO"
token = "YOUR_FINE_GRAINED_GITHUB_TOKEN"

[dashboard]
access_code = "use-a-long-random-secret-at-least-16-characters"
```

Do not put the token in source code, the project ZIP, or the user's browser. The app requires the access code even
though Streamlit gives the app a public URL. This is a simple personal-use gate, not enterprise SSO or a replacement
for an authenticated reverse proxy. Keep the URL and access code private; use a long random code, and rotate it if
it is exposed.

To run the dashboard locally instead:

```bash
python -m pip install -r requirements.txt
mkdir -p .streamlit
```

Save the TOML block above as `.streamlit/secrets.toml` (do not commit it), then run:

```bash
streamlit run dashboard/app.py
```

The ZIP is limited to 50 MB and must contain `index.html` and `tools/capture.mjs` in its project root. Uploads are
path-checked and extracted into a temporary directory on the Actions runner.

## 3. Start with a raw idea or an existing story

Open the Streamlit dashboard, unlock it with the configured access code, and choose **Raw idea** or **Story/script**.

1. Enter a short idea or paste the story.
2. Choose one of the five included styles and a supported aspect ratio.
3. Submit to display the OpenCode prompt.
4. In your local OpenCode session, use that prompt with this repository open. OpenCode should adapt the matching
   style's example and produce a complete project folder/ZIP. It should not run setup, self-tests, contact sheets, or
   a final render.
5. Upload the finished ZIP in the dashboard and submit again to dispatch the static workflow.

The dashboard uses the source text only to build the prompt shown to you. It does not send the text to a model or
save it in the GitHub repository separately. The project ZIP is sent to the configured private GitHub repository.

For manual preparation, the static starter command is:

```bash
bash faceless-videos/scripts/new_video.sh stickman my-video
```

Replace `stickman` with `lamplit-ink`, `red-ghost`, `sunlit-explainer`, or `clay-atlas`; use
`bash faceless-videos/scripts/new_video.sh --list` to see examples. OpenCode then adapts that project. The project
ZIP can be made from its root with:

```bash
zip -r /tmp/my-video.zip . \
  -x 'renders/*' 'review/*' 'node_modules/*' '.git/*' '__pycache__/*' '.env' '.env.*' '*.pem'
```

Upload that ZIP in Streamlit. The ZIP should contain the project files themselves, not only an enclosing directory;
the dashboard also accepts one enclosing project folder.

## 4. What the fixed workflow does

Once submitted, GitHub Actions:

1. Checks out the private repo and installs Node.js, FFmpeg, Kokoro, and Whisper.
2. Extracts and validates the uploaded project archive.
3. Regenerates narration and word timings using the bundled local models.
4. Builds Sunlit character assets where needed.
5. Exports sound cues, mixes sound, and checks the shots.
6. Renders with **one Chrome worker** to limit browser memory pressure.
7. Saves the MP4 artifact and, if selected, uploads it to GoFile.

The workflow caches local voice/timing models between runs when GitHub's cache is available. If model downloads are
needed, the first job takes longer. It does not run `selftest.sh` for each video; the manual self-test remains
available for setup verification.
Clay Atlas additionally installs the optional local depth model and creates depth maps for new stills when needed.

## 5. Follow the run and retrieve the video

The dashboard shows the Actions run link and status. Refresh the dashboard to update it. When successful:

- Click **Download MP4** to save the GitHub artifact.
- The dashboard download is limited to 256 MB to protect its memory. For larger videos, download the artifact from
  the linked GitHub Actions run or use the optional GoFile link.
- If GoFile was selected, the dashboard also shows the returned temporary share link.
- Click **Delete uploaded project branch from GitHub** when finished. This removes the temporary project ZIP branch;
  the video artifact expires after seven days.

If a job fails, open the Actions link and inspect the first failed step. The output artifact is still saved when a
video was produced, even if the optional GoFile upload fails.

## Render profiles and performance

- **Draft** uses the renderer's `--draft` mode, which outputs half-size frames and a faster encode. It is intended for
  a quick review; the audio is retained. The renderer still evaluates each frame at the project's native timeline
  rate, so draft mode does not promise a proportional reduction in browser rendering time.
- **Full** uses native project resolution and creates a share-friendly H.264 encode (CRF 20).
- The workflow uses exactly one capture worker and serializes renders for this repository to reduce memory spikes
  and avoid launching several Chrome processes at once. That may take longer than parallel rendering, but it is
  safer and does not touch your local browser.
- The project frame rate is kept unchanged to preserve word timing and motion. Stickman examples use 24 fps; most
  other examples use 30 fps. Changing FPS safely requires updating frame sampling and audio timing together.

## Troubleshooting

| Problem | What to check |
|---|---|
| Dashboard says the repository must be private | Set the configured render repository to private. Project ZIPs are intentionally not uploaded to public branches. |
| GitHub returns 401/403 | Check the token expiration, repository selection, Contents read/write and Actions read/write permissions, and Actions enablement. |
| Workflow not found | Ensure `.github/workflows/render-video.yml` is present on the default branch and pushed to GitHub. |
| ZIP rejected | Confirm it is under 50 MB and includes `index.html` and `tools/capture.mjs` at its root. Exclude render outputs and caches. |
| Style/aspect rejected | Select an aspect supported by that style: Lamplit Ink is 9:16; Clay Atlas is 16:9. |
| Render fails at a shot | Open the Actions run; the fixed `check` stage reports scene errors before final capture. |
| No GoFile link | The MP4 remains available from the dashboard artifact; GoFile can fail independently or reject an upload. |
| App opens but asks for code | Configure `dashboard.access_code` in Streamlit Cloud Secrets and redeploy/restart the app. |

## Security and privacy

The Streamlit app is reachable at a public URL, so its access code is required. The GitHub token is stored only in
Streamlit Secrets and used by the dashboard API client; it is not passed to the Actions runner. The workflow token
has `contents: read` only. Keep the repository private. GoFile links are intended for sharing and should not be used
for confidential or sensitive videos.
