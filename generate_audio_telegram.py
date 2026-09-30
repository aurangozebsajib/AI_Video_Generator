#!/usr/bin/env python3
"""
Backward Compatibility Wrapper: Google Doc to Edge-TTS to Telegram Pipeline
Delegates to the restructured modular packages (brain, audio, telegram).
"""

import sys
import asyncio
from brain import get_latest_script_from_doc, parse_doc_entries
from audio import generate_all_bengali_audio_versions, generate_audio_with_edge_tts
from telegram import send_all_audios_to_telegram, send_audio_to_telegram


async def run_pipeline():
    import os
    doc_id = os.environ.get("STORY_STORAGE_DOC", "").strip()
    raw = get_latest_script_from_doc(doc_id)
    header, dialect, script = parse_doc_entries(raw)
    results = await generate_all_bengali_audio_versions(script, rate="+5%", pitch="-1Hz")
    send_all_audios_to_telegram(results, video_header=header, dialect=dialect)


if __name__ == "__main__":
    asyncio.run(run_pipeline())
