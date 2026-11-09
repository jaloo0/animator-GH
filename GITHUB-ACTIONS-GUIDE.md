# Ultimate walkthrough: Streamlit + OpenCode + GitHub Actions

This adds a dashboard to the existing faceless-videos skill without replacing its scripts or examples:

1. **You enter an idea or story in the dashboard.**
2. **GitHub Actions runs OpenCode** with OpenRouter Auto to adapt the matching style example. No terminal, local
   OpenCode session, project ZIP, or manual command sequence is part of the end-user flow.
3. **Fixed Actions commands** generate voice and word timings, mix audio, check shots, and render the video.
4. **The dashboard retrieves the MP4.** GoFile upload is optional.

OpenCode uses the `OPENROUTER_API_KEY` GitHub Actions secret. This must be configured once in the private render
repository; the workflow cannot read a key stored only in your local OpenCode setup or Streamlit secrets.

## What stays the same

- The original `faceless-videos/SKILL.md`, style guides, example projects, and manual scripts are retained.
- The new path uses the same Chrome/FFmpeg capture tools and local Kokoro/Whisper models.
- A GitHub Actions job does not open or crash your desktop browser. It renders in an isolated GitHub-hosted runner.
- The rendering pipeline uses fixed, allowlisted commands; it never accepts arbitrary shell commands from Streamlit.
- OpenCode's CI agent can read and edit the project files, but shell, web, subagent, and image-generation tools are
  denied. Rendering runs on a separate Actions runner that never receives the OpenRouter key.
- The idea/story is stored briefly on a temporary branch in the **private** render repository. The dashboard refuses
  to dispatch to a public repository.

## Requirements and cost notes

- A GitHub account/repository with Actions enabled.
- A Streamlit Community Cloud account, or another Streamlit host.
- A fine-grained GitHub token with access to the private render repository:
  - **Contents: Read and write** (create a temporary branch and upload the idea/story)
  - **Actions: Read and write** (dispatch the workflow and read its artifact)
  - Metadata read is normally granted automatically.
- An OpenRouter API key saved as the GitHub repository Actions secret `OPENROUTER_API_KEY`.
- OpenRouter Auto is the selected OpenCode model. Set a spending limit on the OpenRouter key; AI and Actions usage
  are billed/limited separately according to your providers' plans.
- GitHub Actions minutes/storage apply to private repositories according to your GitHub plan. The workflow can take
  several minutes to tens of minutes. The OpenRouter key is used only for the creative pass, not local voice or render.
- GoFile upload is optional per job and unchecked by default. It sends the rendered video to an external service and creates a temporary
  share link. Anyone with that link may be able to access the file. The MP4 also remains available as a GitHub
  artifact for seven days.

## 1. Put the workflow in a private GitHub repository

The app uploads each idea/story to a temporary branch. Use a private repository so source material is not published.
If this repository is public, create a private render repository and put this project there before configuring the
dashboard.

The private repository's default branch must contain the complete `faceless-videos/` directory,
`.github/workflows/render-video.yml`, and the `dashboard/` directory. Do not commit any token, access code, or
Streamlit secrets. The supplied `faceless-videos-skill-v2.zip` archive is not needed in GitHub; keep the extracted
`faceless-videos/` folder.

Enable GitHub Actions for the private repository. The default branch must contain the workflow before dashboard
dispatches can run. In repository **Settings → Actions → General**, allow the workflow to run on GitHub-hosted
Ubuntu runners.

### Add the OpenRouter key to GitHub Actions

In the private repository, open **Settings → Secrets and variables → Actions → New repository secret**:

- **Name:** `OPENROUTER_API_KEY`
- **Secret:** your OpenRouter API key

Save it as an Actions secret, not a workflow variable, Streamlit secret, source file, or chat message. The workflow
uses the key only in the OpenCode creative step. Configure OpenRouter spending limits on the key/account as a
separate safeguard.

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

Do not put the GitHub token in source code or the browser. The app requires the access code even
though Streamlit gives the app a public URL. This is a simple personal-use gate, not enterprise SSO or a replacement
for an authenticated reverse proxy. Keep the URL and access code private; use a long random code, and rotate it if
it is exposed.

Optional developer-only local dashboard testing (not needed to create videos):

```bash
python -m pip install -r requirements.txt
mkdir -p .streamlit
```

Save the TOML block above as `.streamlit/secrets.toml` (do not commit it), then run:

```bash
streamlit run dashboard/app.py
```

The dashboard accepts an idea/story up to 16 KB. It writes the request to a temporary branch in the private
repository; the Actions job seeds the selected style project from the included example.

## 3. Create a video from the dashboard

Open the Streamlit dashboard, unlock it with the configured access code, and choose **Raw idea** or **Story/script**.

1. Enter a short idea or paste the story/script.
2. Choose one of the five styles, a supported aspect ratio, and Draft or Full quality.
3. Optionally select GoFile delivery, then click **Create and render video** once.
4. OpenCode and the static render pipeline run on GitHub Actions. Refresh the dashboard to see progress.
5. When complete, download the MP4 in the dashboard or use the optional GoFile link.

There is no prompt-copying step, terminal command, project ZIP creation, or second submission. The source text is
stored in the temporary private repository branch until you delete that branch from the dashboard. Raw ideas and
stories are sent to OpenRouter for the creative pass. Verify factual claims before publishing.

Clay Atlas currently reuses the example still images. It does not generate custom stills; the creative pass updates
the story and still-prompt document only.

## 4. What the fixed workflow does

Once submitted, GitHub Actions:

1. Checks out the private repo, checks the OpenRouter secret, and installs OpenCode.
2. Copies the selected style's example and loads the idea/story from the temporary request branch.
3. Runs one restricted OpenCode creative pass using `openrouter/auto`, validates that the script and shots changed,
   then stores the project briefly as a one-day Actions artifact.
4. A separate runner downloads that project and installs the local voice/timing models and optional Clay Atlas depth model.
5. Regenerates narration and word timings, builds supported style assets, exports sound cues, mixes audio, and checks
   the shots.
6. Renders with **one Chrome worker** to limit browser memory pressure.
7. Saves the MP4 artifact and, if selected, uploads it to GoFile.

The workflow caches local voice/timing models between runs when GitHub's cache is available. If model downloads are
needed, the first job takes longer. It does not run `selftest.sh` for each video; the manual self-test remains
available for setup verification.
Clay Atlas additionally installs the optional local depth model. Its stock still images are reused by this workflow.

## 5. Follow the run and retrieve the video

The dashboard shows the Actions run link and status. Refresh the dashboard to update it. When successful:

- Click **Download MP4** to save the GitHub artifact.
- The dashboard download is limited to 256 MB to protect its memory. For larger videos, download the artifact from
  the linked GitHub Actions run or use the optional GoFile link.
- If GoFile was selected, the dashboard also shows the returned temporary share link.
- Click **Delete temporary request branch from GitHub** when finished. This removes the submitted idea/story;
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
| Dashboard says the repository must be private | Set the configured render repository to private. User-submitted ideas and stories are intentionally not uploaded to public branches. |
| GitHub returns 401/403 | Check the token expiration, repository selection, Contents read/write and Actions read/write permissions, and Actions enablement. |
| Workflow not found | Ensure `.github/workflows/render-video.yml` is present on the default branch and pushed to GitHub. |
| Workflow says `OPENROUTER_API_KEY` is missing | Add that exact name as a GitHub **Actions repository secret**, then rerun the job. A local OpenCode key and Streamlit secret are not visible to Actions. |
| OpenCode fails to find or use `openrouter/auto` | Check the Actions log and OpenRouter account/key limits. The selected model is `openrouter/auto`; the key needs available balance/usage. |
| Style/aspect rejected | Select an aspect supported by that style: Lamplit Ink is 9:16; Clay Atlas is 16:9. |
| Render fails at a shot | Open the Actions run; the fixed `check` stage reports scene errors before final capture. |
| No GoFile link | The MP4 remains available from the dashboard artifact; GoFile can fail independently or reject an upload. |
| App opens but asks for code | Configure `dashboard.access_code` in Streamlit Cloud Secrets and redeploy/restart the app. |

## Security and privacy

The Streamlit app is reachable at a public URL, so its access code is required. The GitHub token is stored only in
Streamlit Secrets and used by the dashboard API client; it is not passed to the Actions runner. The OpenRouter key is
stored as a GitHub Actions secret and is passed only to the OpenCode step. The workflow's `GITHUB_TOKEN` has
`contents: read` only. Keep the repository private. OpenRouter processes the submitted creative request; do not
submit confidential material unless you accept the provider's data terms. GoFile links are intended for sharing and
should not be used for confidential or sensitive videos.
