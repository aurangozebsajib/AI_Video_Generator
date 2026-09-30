#!/usr/bin/env python3
"""
AI Video & Audio Production Pipeline (Modular Architecture)
Repository: aurangozebsajib/AI_Video_Generator

Full 6-Stage Workflow:
1. Brain: Parses latest script & dialect from Google Doc, decomposes into visual scene prompts.
2. Audio: Synthesizes 4 regional Bengali voice editions simultaneously via Edge-TTS (with custom pacing).
3. Telegram (Audio): Dispatches all 4 audio editions sequentially with distinct HTML captions.
4. Video: Renders cinematic video scenes, analyzes narration tempo via Librosa, auto-syncs with FFmpeg.
5. Telegram (Video): Delivers all 4 synchronized video editions to the Telegram channel.
"""

import os
import sys
import json
import time
import socket
import signal
import asyncio
import logging
import argparse
from pathlib import Path

# Set global socket timeout to prevent indefinite network hangs in CI/CD
socket.setdefaulttimeout(30.0)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("AIVideoPipeline")


# Clean signal handling for GitHub Actions / CI cancellation
def handle_exit_signal(signum, frame):
    logger.warning(f"Process received shutdown signal ({signum}). Exiting cleanly.")
    sys.exit(0)


signal.signal(signal.SIGINT, handle_exit_signal)
signal.signal(signal.SIGTERM, handle_exit_signal)

# Modular imports
from brain import (
    get_latest_script_from_doc,
    parse_doc_entries,
    call_gemini_api,
    orchestrate_multi_agent_brain,
)
from audio import (
    generate_all_bengali_audio_versions,
    BENGALI_VOICE_CONFIGS,
)
from video import (
    run_full_video_pipeline,
)
from telegram import (
    check_api_health,
    send_all_audios_to_telegram,
    send_all_videos_to_telegram,
)

# Environment variables
STORY_DOC_ID = os.environ.get("STORY_STORAGE_DOC", "").strip()
GOOGLE_AI_STUDIO_KEY = (
    os.environ.get("GOOGLE_AI_STUDIO_KEY")
    or os.environ.get("GEMINI_API_KEY")
    or os.environ.get("API_KEY", "")
).strip()
ENV_DRY_RUN = os.environ.get("DRY_RUN", "false").lower() == "true"


async def main():
    parser = argparse.ArgumentParser(description="AI Video & Multi-Voice Generation Pipeline")
    parser.add_argument("--dry-run", action="store_true", help="Run in dry-run mode (simulate without external APIs)")
    parser.add_argument("--doc-id", type=str, default="", help="Override target Google Doc ID")
    parser.add_argument("--full-video", action="store_true", help="Execute full video generation and auto-sync pipeline")
    parser.add_argument("--audio-only", action="store_true", help="Run only script parsing, audio generation, and audio dispatch")
    parser.add_argument("--health-check", action="store_true", help="Perform preemptive health check of Gemini and Telegram APIs and exit")
    args = parser.parse_args()

    is_dry_run = args.dry_run or ENV_DRY_RUN

    # Preemptive non-blocking health check
    health_result = check_api_health(dry_run=is_dry_run)
    if args.health_check:
        print(json.dumps(health_result, indent=2))
        return

    target_doc_id = args.doc_id.strip() or STORY_DOC_ID

    logger.info("====================================================================")
    logger.info(" 🎬 MODULAR AI VIDEO & MULTI-VOICE GENERATION PIPELINE")
    logger.info(f" ⚙️ Mode: {'DRY RUN (Simulated)' if is_dry_run else 'AUTOMATED PRODUCTION'}")
    logger.info(f" 📄 Target Doc ID: {target_doc_id or '(Configured Secret / Default)'}")
    logger.info(
        f" 🩺 API Health: {health_result['status'].upper()} "
        f"(Gemini: {health_result['gemini']['details']}, Telegram: {health_result['telegram']['details']})"
    )
    logger.info("====================================================================")

    # -------------------------------------------------------------------------
    # Stage 1: Brain - Ingest & Parse Script from Google Doc
    # -------------------------------------------------------------------------
    logger.info("\n[Stage 1: Brain] Ingesting script from Google Doc...")
    raw_content = get_latest_script_from_doc(target_doc_id, dry_run=is_dry_run)
    video_header, dialect, script_text = parse_doc_entries(raw_content)

    logger.info(f"-> Parsed Video Header: {video_header}")
    logger.info(f"-> Detected Dialect: {dialect}")
    logger.info(f"-> Script Length: {len(script_text)} characters")

    if not script_text.strip():
        logger.info("-> Script text empty. Using default Bengali narration sample.")
        script_text = "আসসালামু আলাইকুম! প্রযুক্তির উৎকর্ষে আমাদের নতুন এআই ভিডিও জেনারেশন পাইপলাইনে আপনাকে স্বাগতম।"
        dialect = "none"

    # -------------------------------------------------------------------------
    # Stage 2: Brain - Heterogeneous Multi-Agent Brain Pipeline
    # Grok (Director) -> Gemini (Writer) -> OpenRouter (Designer) -> Cloudflare (Style)
    # -------------------------------------------------------------------------
    logger.info("\n[Stage 2: Brain] Orchestrating Heterogeneous Multi-Agent Brain Pipeline...")
    production_manifest = orchestrate_multi_agent_brain(
        script_text=script_text,
        dialect=dialect,
        dry_run=is_dry_run,
    )
    refined_script = production_manifest.get("combined_narration", "").strip() or script_text
    logger.info(f"-> Production Manifest ready with {len(production_manifest.get('scenes', []))} directed scenes.")

    # -------------------------------------------------------------------------
    # Stage 3: Audio - Simultaneous Multi-Voice Bengali Generation
    # -------------------------------------------------------------------------
    logger.info("\n[Stage 3: Audio] Generating 4 Regional Bengali Audio Editions simultaneously via Edge-TTS...")
    audio_results = await generate_all_bengali_audio_versions(
        refined_script,
        rate="+5%",
        pitch="-1Hz",
        dry_run=is_dry_run,
    )

    # -------------------------------------------------------------------------
    # Stage 4: Telegram - Sequential Dispatch of Audio Editions
    # -------------------------------------------------------------------------
    logger.info("\n[Stage 4: Telegram] Dispatching 4 Audio Editions to Telegram Channel...")
    send_all_audios_to_telegram(
        audio_results,
        video_header=video_header,
        dialect=dialect,
        dry_run=is_dry_run,
    )

    # -------------------------------------------------------------------------
    # Stage 5 & 6: Video - Librosa Sync, FFmpeg Multi-Edition Render & Telegram Dispatch
    # -------------------------------------------------------------------------
    run_video = (
        not args.audio_only
        and (args.full_video or os.environ.get("RUN_FULL_VIDEO_PIPELINE", "true").lower() == "true")
    )
    if run_video:
        logger.info("\n[Stage 5: Video] Rendering 4 Synchronized Video Editions using Multi-Agent Directed Scenes...")
        video_editions = await run_full_video_pipeline(
            video_header=video_header,
            script_text=refined_script,
            audio_results=audio_results,
            dialect=dialect,
            dry_run=is_dry_run,
            scenes=production_manifest.get("scenes"),
        )

        logger.info("\n[Stage 6: Telegram] Dispatching Video Editions to Telegram...")
        send_all_videos_to_telegram(
            video_editions=video_editions,
            video_header=video_header,
            dry_run=is_dry_run,
        )

    logger.info("\n✅ Modular AI Video & Audio Pipeline Finished Successfully.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Pipeline stopped by user. Exiting cleanly.")
        sys.exit(0)
    except Exception as exc:
        logger.error(f"Fatal error in pipeline: {exc}", exc_info=True)
        sys.exit(1)
