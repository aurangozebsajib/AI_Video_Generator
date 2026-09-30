"""
Edge-TTS Multi-Voice Bengali Speech Synthesis
Supports 4 regional Bengali voices generated simultaneously with custom pacing.
"""

import os
import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Any

logger = logging.getLogger("AIVideoPipeline.Audio")

TIMEOUT_EDGE_TTS = float(os.environ.get("TIMEOUT_EDGE_TTS", "45.0"))

# Regional Bengali voice configurations
BENGALI_VOICE_CONFIGS: List[Dict[str, Any]] = [
    {
        "id": "v1_nabanita",
        "voice": "bn-BD-NabanitaNeural",
        "name": "Nabanita",
        "label": "Bangladesh Female (Nabanita)",
        "region": "Bangladesh",
        "gender": "Female",
        "filename": "generated_audio_nabanita_female_bd.mp3",
    },
    {
        "id": "v2_pradeep",
        "voice": "bn-BD-PradeepNeural",
        "name": "Pradeep",
        "label": "Bangladesh Male (Pradeep)",
        "region": "Bangladesh",
        "gender": "Male",
        "filename": "generated_audio_pradeep_male_bd.mp3",
    },
    {
        "id": "v3_tanishaa",
        "voice": "bn-IN-TanishaaNeural",
        "name": "Tanishaa",
        "label": "India Bengali Female (Tanishaa)",
        "region": "India",
        "gender": "Female",
        "filename": "generated_audio_tanishaa_female_in.mp3",
    },
    {
        "id": "v4_bashkar",
        "voice": "bn-IN-BashkarNeural",
        "name": "Bashkar",
        "label": "India Bengali Male (Bashkar)",
        "region": "India",
        "gender": "Male",
        "filename": "generated_audio_bashkar_male_in.mp3",
    },
]


def write_dummy_audio_file(filepath: str, duration_sec: int = 4):
    """
    Creates a minimal valid MPEG audio frame (silent MP3) so downstream steps
    never crash on missing files during dry-run, offline, or fallback scenarios.
    """
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    # Valid MPEG-1 Audio Layer III frame header: syncword 0xFFFB (128kbps, 44.1kHz, stereo)
    mp3_frame = b'\xff\xfb\x90\x64' + (b'\x00' * 413)
    with open(filepath, 'wb') as f:
        for _ in range(max(1, duration_sec * 38)):
            f.write(mp3_frame)


async def generate_single_audio_edition(
    text: str,
    voice_config: Dict[str, Any],
    rate: str = "+5%",
    pitch: str = "-1Hz",
    dry_run: bool = False
) -> Dict[str, Any]:
    """Generates a single Bengali audio file using edge-tts with timeouts and fallbacks."""
    voice = voice_config["voice"]
    label = voice_config["label"]
    filename = voice_config["filename"]

    if dry_run:
        logger.info(f"[DRY RUN] Simulating Edge-TTS generation for {label} ({voice})...")
        logger.info(f"[DRY RUN] Pacing: rate='{rate}', pitch='{pitch}' -> {filename}")
        write_dummy_audio_file(filename)
        return {**voice_config, "filepath": filename, "success": True}

    Path(filename).parent.mkdir(parents=True, exist_ok=True)

    try:
        import edge_tts
        communicator = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        logger.info(f"Synthesizing {label} with voice: {voice} (rate={rate}, pitch={pitch})...")
        await asyncio.wait_for(communicator.save(filename), timeout=TIMEOUT_EDGE_TTS)

        if os.path.exists(filename) and os.path.getsize(filename) > 0:
            logger.info(f"✅ Audio generated: {filename} ({os.path.getsize(filename)} bytes) for {label}")
            return {**voice_config, "filepath": filename, "success": True}
        else:
            logger.warning(f"Edge-TTS produced empty file for {label}. Using safe placeholder.")
            write_dummy_audio_file(filename)
            return {**voice_config, "filepath": filename, "success": False}
    except asyncio.TimeoutError:
        logger.error(f"[Edge-TTS Timeout] Speech generation timed out for {label} ({voice}). Using fallback.")
        write_dummy_audio_file(filename)
        return {**voice_config, "filepath": filename, "success": False}
    except Exception as e:
        logger.error(f"[Edge-TTS Error] {label} ({voice}): {e}. Using fallback placeholder.")
        write_dummy_audio_file(filename)
        return {**voice_config, "filepath": filename, "success": False}


async def generate_all_bengali_audio_versions(
    text: str,
    rate: str = "+5%",
    pitch: str = "-1Hz",
    dry_run: bool = False
) -> List[Dict[str, Any]]:
    """
    Simultaneously generates 4 distinct regional Bengali voice audio files using edge-tts:
    1. bn-BD-NabanitaNeural (Bangladesh Female)
    2. bn-BD-PradeepNeural (Bangladesh Male)
    3. bn-IN-TanishaaNeural (India Bengali Female)
    4. bn-IN-BashkarNeural (India Bengali Male)
    """
    logger.info("Executing simultaneous audio generation across all 4 regional Bengali voices...")
    tasks = [
        generate_single_audio_edition(text, v_conf, rate=rate, pitch=pitch, dry_run=dry_run)
        for v_conf in BENGALI_VOICE_CONFIGS
    ]
    results = await asyncio.gather(*tasks, return_exceptions=False)

    # Maintain generated_audio.mp3 as a default alias for backwards compatibility
    if results and os.path.exists(results[0]["filepath"]):
        try:
            import shutil
            shutil.copyfile(results[0]["filepath"], "generated_audio.mp3")
        except Exception:
            pass

    return results


async def generate_audio_with_edge_tts(
    text: str,
    dialect: str = "none",
    output_filename: str = "generated_audio.mp3",
    dry_run: bool = False
) -> str:
    """Single audio generation wrapper for backwards compatibility."""
    results = await generate_all_bengali_audio_versions(text, rate="+5%", pitch="-1Hz", dry_run=dry_run)
    return results[0]["filepath"] if results else output_filename
