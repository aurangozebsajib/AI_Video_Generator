# AI Video Generator (VeoGen Studio & Automation Pipeline)

An end-to-end AI Video Generation suite combining an interactive generative web studio (React, Express, Google Veo 3.1 & Gemini) and a fully autonomous video generation pipeline (`main.py`) powered by GitHub Actions.

---

## 🚀 Autonomous Pipeline Architecture (`main.py`)

The automated pipeline executes unattended via GitHub Actions or CLI to transform raw scripts into 4 distinct, regional Bengali video productions:

```
[Google Doc (STORY_STORAGE_DOC)] 
               │
               ▼ (Service Account Auth)
[Gemini 2.5 Brain Processing with Multi-Key Rotation] ──> [Google Sheet Tracking]
               │
       ┌───────┴────────────────────────┐
       ▼                                ▼
[Bengali Audio Generation (edge-tts)]   [Hugging Face Video Generation]
 • bn-BD-NabanitaNeural (BD Female)       • Multi-Token Rotation (6-7 tokens)
 • bn-BD-PradeepNeural (BD Male)          • Text-to-Video Spaces / SVD
 • bn-IN-TanishaaNeural (IN Female)       • Camera Motion Ken-Burns Engine
 • bn-IN-BashkarNeural (IN Male)
       │                                │
       └───────┬────────────────────────┘
               ▼
 [Auto-Sync Engine: Librosa + FFmpeg Cross-Correlation & Tempo Adjustment]
               │
               ▼
 [4 Final Synced Video Editions (.mp4)]
               │
               ▼
 [Telegram Distribution: Character Assets & Videos sent to TELEGRAM_CHANNEL_ID]
```

### Pipeline Key Features

1. **Google Doc & Sheet Integration**:
   - Authenticates using `GOOGLE_SERVICE_JSON` (Google Service Account).
   - Reads the story script from `STORY_STORAGE_DOC`.
   - Logs run metadata, scene breakdowns, voice models, and generation statuses into `MODEL_STORAGE_SHEET`.

2. **Brain Processing & Multi-API Rotation**:
   - Employs Gemini API (`GOOGLE_AI_STUDIO_KEY` / `GEMINI_API_KEY`) to parse Bengali scripts into sequential cinematic scenes (narration, visual prompt, camera motion, duration).
   - Rotates Gemini API tokens automatically on HTTP 429 / ResourceExhausted / QuotaExceeded errors.
   - Automatically falls back to Hugging Face LLMs (`Qwen/Qwen2.5-72B-Instruct` or `Llama-3.1`) if all Gemini keys are exhausted.

3. **Audio Generation (edge-tts)**:
   - Synthesizes 4 distinct Bengali regional voices:
     - `bn-BD-NabanitaNeural` (Bangladesh Female)
     - `bn-BD-PradeepNeural` (Bangladesh Male)
     - `bn-IN-TanishaaNeural` (India Bengali Female)
     - `bn-IN-BashkarNeural` (India Bengali Male)

4. **Hugging Face Video Generation**:
   - Manages a pool of 6-7 Hugging Face tokens (`HF_TOKENS`) with automatic token rotation.
   - Multi-tier generation strategy:
     - Tier 1: Text-to-Video via HF Spaces / Inference API.
     - Tier 2: Image-to-Video / FLUX.1-schnell frame generation.
     - Tier 3: Motion-stabilized camera engine (Zoom In/Out, Pan, Drone Flyover, Orbit) via FFmpeg filtergraphs.

5. **Multi-Voice Output & Auto-Sync**:
   - Analyzes audio onsets and durations using `librosa`.
   - Applies FFmpeg `atempo` tempo correction to lock speech timing to video cuts.
   - Produces 4 separate production-ready MP4 video editions.

6. **Telegram Integration**:
   - Uploads visual character assets and reference frames to your Telegram channel.
   - Delivers the 4 final video editions to `TELEGRAM_CHANNEL_ID` via `TELEGRAM_BOT_TOKEN`.

---

## 🛠️ GitHub Actions Automation (`.github/workflows/pipeline.yml`)

The repository includes a ready-to-run GitHub Actions workflow that automates execution:

### Required GitHub Secrets

Configure these in **Settings > Secrets and variables > Actions**:

| Secret Name | Description |
|---|---|
| `GOOGLE_SERVICE_JSON` | Full raw JSON content of your Google Service Account key |
| `STORY_STORAGE_DOC` | Google Doc ID or URL containing the story/script |
| `MODEL_STORAGE_SHEET` | Google Sheet ID or Name used for tracking runs |
| `GOOGLE_AI_STUDIO_KEY` | Gemini API Key (or comma-separated keys for rotation) |
| `HF_TOKENS` | Comma-separated list of 6-7 Hugging Face tokens |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `TELEGRAM_CHANNEL_ID` | Telegram Channel or Chat ID (e.g. `@mychannel` or `-100...`) |

### Manual Triggering
1. Go to the **Actions** tab in GitHub.
2. Select **Automated AI Video Generation Pipeline**.
3. Click **Run workflow** (optionally supply a custom Google Doc ID).

---

## 💻 Running the Pipeline Locally

1. Install system prerequisites (FFmpeg):
   ```bash
   sudo apt-get install -y ffmpeg libsndfile1
   # Or on macOS: brew install ffmpeg libsndfile
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Populate your `.env` file from `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Execute the pipeline:
   ```bash
   python main.py
   ```

---

## 🌐 Interactive Web Studio (React + Express)

For manual prompting and visual directing:
1. Install Node dependencies: `npm install`
2. Start development server: `npm run dev`
3. Access studio at `http://localhost:3000`.
