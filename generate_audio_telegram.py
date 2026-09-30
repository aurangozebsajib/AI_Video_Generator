#!/usr/bin/env python3
"""
Standalone Audio-to-Telegram Script
Provides quick execution of: Google Doc Ingestion -> Edge-TTS Multi-Voice Synthesis -> Telegram Dispatch.
"""

import sys
import asyncio
import logging
from brain import get_latest_script_from_doc, parse_doc_entries
from audio import generate_all_bengali_audio_versions
from telegram import send_all_audios_to_telegram

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AudioTelegramStandalone")


async def run(doc_id: str = "", dry_run: bool = False):
    logger.info("Executing Standalone Bengali Audio -> Telegram Pipeline...")
    content = get_latest_script_from_doc(doc_id, dry_run=dry_run)
    header, dialect, script_text = parse_doc_entries(content)

    logger.info(f"Header: {header} | Dialect: {dialect}")
    audio_results = await generate_all_bengali_audio_versions(script_text, dry_run=dry_run)

    send_all_audios_to_telegram(audio_results, video_header=header, dialect=dialect, dry_run=dry_run)
    logger.info("Standalone execution completed.")


if __name__ == "__main__":
    dry = "--dry-run" in sys.argv
    asyncio.run(run(dry_run=dry))
