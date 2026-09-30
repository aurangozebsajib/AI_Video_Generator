"""
Bengali Regional TTS Synthesis Engine using Microsoft Edge-TTS
Supports 4 simultaneous regional Bengali voice editions with customized pacing.
"""

import os
import asyncio
import logging
from typing import Dict, Any, List

logger = logging.getLogger("AIVideoPipeline.Audio")

BENGALI_VOICE_CONFIGS = [
    {
        "id": "version_1_bd_female",
        "name": "Nabanita (Female, BD)",
        "voice": "bn-BD-NabanitaNeural",
        "region": "Bangladesh",
        "gender": "Female",
        "filename": "generated_audio_nabanita_female_bd.mp3",
        "description": "Natural, clear, articulate Bengali female news-anchor delivery.",
    },
    {
        "id": "version_2_bd_male",
        "name": "Pradeep (Male, BD)",
        "voice": "bn-BD-PradeepNeural",
        "region": "Bangladesh",
        "gender": "Male",
        "filename": "generated_audio_pradeep_male_bd.mp3",
        "description": "Deep baritone, authoritative, and cinematic dramatic Bengali narration.",
    },
    {
        "id": "version_3_in_female",
        "name": "Tanishaa (Female, IN)",
        "voice": "bn-IN-TanishaaNeural",
        "region": "India (Kolkata)",
        "gender": "Female",
        "filename": "generated_audio_tanishaa_female_in.mp3",
        "description": "Soft, melodious, gentle, and emotive Bengali storytelling voice.",
    },
    {
        "id": "version_4_in_male",
        "name": "Bashkar (Male, IN)",
        "voice": "bn-IN-BashkarNeural",
        "region": "India (Kolkata)",
        "gender": "Male",
        "filename": "generated_audio_bashkar_male_in.mp3",
        "description": "Energetic, dynamic, bright, and lively regional storytelling tone.",
    },
]

DIALECT_VOICE_MAP = {
    "rangpuri": "bn-BD-NabanitaNeural",
    "barishal": "bn-BD-NabanitaNeural",
    "old-dhaka": "bn-BD-PradeepNeural",
    "chittagong": "bn-BD-PradeepNeural",
    "sylheti": "bn-IN-BashkarNeural",
    "kolkata": "bn-IN-TanishaaNeural",
    "none": "bn-BD-NabanitaNeural",
    "auto": "bn-BD-NabanitaNeural",
}


def write_dummy_audio_file(filepath: str, duration_sec: float = 3.0):
    """
    Creates a valid minimal MP3 file with silent MPEG audio sync frames
    to ensure Librosa and FFmpeg never crash during simulation or fallback.
    """
    # Standard MPEG-1 Layer 3 sync header frame (silent frame: 0xFF, 0xFB, 0x90, 0x64...)
    silent_frame = b"\xff\xfb\x90\x64" + (b"\x00" * 414)
    frame_count = max(1, int(duration_sec * 38.28))
    with open(filepath, "wb") as f:
        f.write(silent_frame * frame_count)
    logger.info(f"Fallback audio placeholder generated: {filepath} (~{duration_sec}s)")


async def generate_single_voice(
    text: str,
    voice_cfg: Dict[str, Any],
    rate: str = "+5%",
    pitch: str = "-1Hz",
    dry_run: bool = False,
    timeout_sec: float = 45.0,
) -> Dict[str, Any]:
    """
    Synthesizes a single audio edition via edge-tts with timeout safeguards.
    """
    output_filename = voice_cfg["filename"]
    voice_name = voice_cfg["voice"]
    edition_label = voice_cfg["name"]

    if dry_run:
        logger.info(f"[DRY RUN] Simulating Edge-TTS synthesis for {edition_label} ({voice_name})")
        write_dummy_audio_file(output_filename, duration_sec=5.0)
        return {
            **voice_cfg,
            "success": True,
            "path": output_filename,
            "dry_run": True,
        }

    try:
        import edge_tts

        logger.info(f"Synthesizing [{edition_label}] via {voice_name} (rate={rate}, pitch={pitch})...")
        communicate = edge_tts.Communicate(text, voice_name, rate=rate, pitch=pitch)
        await asyncio.wait_for(communicate.save(output_filename), timeout=timeout_sec)

        file_size = os.path.getsize(output_filename) if os.path.exists(output_filename) else 0
        if file_size < 100:
            raise ValueError(f"Generated file is empty or corrupted ({file_size} bytes)")

        logger.info(f"Successfully synthesized: {output_filename} ({file_size} bytes)")
        return {
            **voice_cfg,
            "success": True,
            "path": output_filename,
            "dry_run": False,
            "size": file_size,
        }
    except Exception as exc:
        logger.warning(f"Edge-TTS synthesis error for {edition_label} ({voice_name}): {exc}. Creating fallback placeholder.")
        write_dummy_audio_file(output_filename, duration_sec=4.0)
        return {
            **voice_cfg,
            "success": False,
            "error": str(exc),
            "path": output_filename,
            "dry_run": False,
        }


async def generate_all_bengali_audio_versions(
    text: str,
    rate: str = "+5%",
    pitch: str = "-1Hz",
    dry_run: bool = False,
) -> List[Dict[str, Any]]:
    """
    Synthesizes all 4 regional Bengali editions concurrently using asyncio.gather.
    """
    tasks = [
        generate_single_voice(
            text=text,
            voice_cfg=cfg,
            rate=rate,
            pitch=pitch,
            dry_run=dry_run,
        )
        for cfg in BENGALI_VOICE_CONFIGS
    ]
    results = await asyncio.gather(*tasks, return_exceptions=False)
    return results


async def generate_audio_with_edge_tts(
    text: str,
    dialect: str = "none",
    output_filename: str = "generated_audio.mp3",
    rate: str = "+5%",
    pitch: str = "-1Hz",
    dry_run: bool = False,
) -> str:
    """
    Generates a single audio track selected based on the dialect tag.
    """
    chosen_voice = DIALECT_VOICE_MAP.get(dialect.lower(), "bn-BD-NabanitaNeural")
    cfg = {
        "id": "single_dialect",
        "name": f"Dialect Audio ({dialect})",
        "voice": chosen_voice,
        "filename": output_filename,
    }
    res = await generate_single_voice(text, cfg, rate=rate, pitch=pitch, dry_run=dry_run)
    return res["path"]
