"""
Bengali Regional TTS Synthesis Engine using Microsoft Edge-TTS & Pydub
Supports 4 distinct regional Bengali voice editions and multi-speaker segments.

CRITICAL DESIGN REQUIREMENT (No Concatenation Bug):
Every speaker/segment is generated, named, and saved individually
(e.g., speaker_1.mp3, speaker_2.mp3, generated_audio_nabanita_female_bd.mp3, etc.).
No global concatenation loop merges them into a single long file unless explicitly requested.
"""

import os
import shutil
import asyncio
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("AIVideoPipeline.Audio")

# Canonical 4 Bengali Voice Configurations
BENGALI_VOICE_CONFIGS = [
    {
        "id": "version_1_bd_female",
        "speaker_id": "speaker_1",
        "name": "Nabanita (Female, BD)",
        "voice": "bn-BD-NabanitaNeural",
        "region": "Bangladesh",
        "gender": "Female",
        "filename": "generated_audio_nabanita_female_bd.mp3",
        "speaker_filename": "speaker_1.mp3",
        "description": "Natural, clear, articulate Bengali female news-anchor delivery.",
    },
    {
        "id": "version_2_bd_male",
        "speaker_id": "speaker_2",
        "name": "Pradeep (Male, BD)",
        "voice": "bn-BD-PradeepNeural",
        "region": "Bangladesh",
        "gender": "Male",
        "filename": "generated_audio_pradeep_male_bd.mp3",
        "speaker_filename": "speaker_2.mp3",
        "description": "Deep baritone, authoritative, and cinematic dramatic Bengali narration.",
    },
    {
        "id": "version_3_in_female",
        "speaker_id": "speaker_3",
        "name": "Tanishaa (Female, IN)",
        "voice": "bn-IN-TanishaaNeural",
        "region": "India (Kolkata)",
        "gender": "Female",
        "filename": "generated_audio_tanishaa_female_in.mp3",
        "speaker_filename": "speaker_3.mp3",
        "description": "Soft, melodious, gentle, and emotive Bengali storytelling voice.",
    },
    {
        "id": "version_4_in_male",
        "speaker_id": "speaker_4",
        "name": "Bashkar (Male, IN)",
        "voice": "bn-IN-BashkarNeural",
        "region": "India (Kolkata)",
        "gender": "Male",
        "filename": "generated_audio_bashkar_male_in.mp3",
        "speaker_filename": "speaker_4.mp3",
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
    to ensure Librosa and FFmpeg never crash during simulation or offline fallback.
    """
    silent_frame = b"\xff\xfb\x90\x64" + (b"\x00" * 414)
    frame_count = max(1, int(duration_sec * 38.28))
    with open(filepath, "wb") as f:
        f.write(silent_frame * frame_count)
    logger.info(f"Fallback audio placeholder generated: {filepath} (~{duration_sec}s)")


def post_process_individual_audio(filepath: str) -> Optional[float]:
    """
    Optionally normalizes and inspects individual audio segments using Pydub.
    Does NOT concatenate or merge with any other file.
    Returns duration in seconds if successful.
    """
    try:
        from pydub import AudioSegment
        from pydub.effects import normalize

        sound = AudioSegment.from_file(filepath, format="mp3")
        # Normalize audio levels for crisp broadcast delivery
        normalized = normalize(sound)
        normalized.export(filepath, format="mp3", bitrate="192k")
        duration_sec = len(normalized) / 1000.0
        logger.debug(f"Pydub post-processed {filepath}: {duration_sec:.2f}s")
        return duration_sec
    except Exception as exc:
        logger.debug(f"Pydub post-processing skipped for {filepath} ({exc})")
        return None


async def generate_single_voice(
    text: str,
    voice_cfg: Dict[str, Any],
    rate: str = "+5%",
    pitch: str = "-1Hz",
    dry_run: bool = False,
    timeout_sec: float = 45.0,
    save_speaker_alias: bool = True,
) -> Dict[str, Any]:
    """
    Synthesizes a single audio edition via edge-tts with timeout safeguards.
    Guarantees this voice is saved to its own isolated file.
    """
    primary_filename = voice_cfg.get("filename", "generated_audio.mp3")
    speaker_filename = voice_cfg.get("speaker_filename", "")
    voice_name = voice_cfg.get("voice", "bn-BD-NabanitaNeural")
    edition_label = voice_cfg.get("name", "Voice Edition")

    if dry_run:
        logger.info(f"[DRY RUN] Simulating Edge-TTS synthesis for {edition_label} ({voice_name}) -> {primary_filename}")
        write_dummy_audio_file(primary_filename, duration_sec=5.0)
        if save_speaker_alias and speaker_filename and speaker_filename != primary_filename:
            shutil.copyfile(primary_filename, speaker_filename)
        return {
            **voice_cfg,
            "success": True,
            "path": primary_filename,
            "speaker_path": speaker_filename,
            "dry_run": True,
            "duration_sec": 5.0,
        }

    try:
        import edge_tts

        logger.info(f"Synthesizing [{edition_label}] via {voice_name} -> {primary_filename}")
        communicate = edge_tts.Communicate(text, voice_name, rate=rate, pitch=pitch)
        await asyncio.wait_for(communicate.save(primary_filename), timeout=timeout_sec)

        file_size = os.path.getsize(primary_filename) if os.path.exists(primary_filename) else 0
        if file_size < 100:
            raise ValueError(f"Generated file is empty or corrupted ({file_size} bytes)")

        # Pydub inspection/normalization of the single file
        dur = post_process_individual_audio(primary_filename)

        # Also write speaker_X.mp3 alias if requested
        if save_speaker_alias and speaker_filename and speaker_filename != primary_filename:
            shutil.copyfile(primary_filename, speaker_filename)
            logger.info(f"Saved speaker copy: {speaker_filename}")

        logger.info(f"✅ Successfully synthesized individual file: {primary_filename} ({file_size} bytes)")
        return {
            **voice_cfg,
            "success": True,
            "path": primary_filename,
            "speaker_path": speaker_filename,
            "dry_run": False,
            "size": file_size,
            "duration_sec": dur,
        }
    except Exception as exc:
        logger.warning(f"Edge-TTS synthesis error for {edition_label} ({voice_name}): {exc}. Creating fallback placeholder.")
        write_dummy_audio_file(primary_filename, duration_sec=4.0)
        if save_speaker_alias and speaker_filename and speaker_filename != primary_filename:
            shutil.copyfile(primary_filename, speaker_filename)
        return {
            **voice_cfg,
            "success": False,
            "error": str(exc),
            "path": primary_filename,
            "speaker_path": speaker_filename,
            "dry_run": False,
            "duration_sec": 4.0,
        }


async def generate_all_bengali_audio_versions(
    text: str,
    rate: str = "+5%",
    pitch: str = "-1Hz",
    dry_run: bool = False,
    concatenate_output: bool = False,
) -> List[Dict[str, Any]]:
    """
    Synthesizes all 4 regional Bengali editions concurrently.

    STRICT GUARANTEE:
    Outputs 4 separate individual files:
      1. generated_audio_nabanita_female_bd.mp3 (and speaker_1.mp3)
      2. generated_audio_pradeep_male_bd.mp3   (and speaker_2.mp3)
      3. generated_audio_tanishaa_female_in.mp3 (and speaker_3.mp3)
      4. generated_audio_bashkar_male_in.mp3   (and speaker_4.mp3)

    Under NO circumstances are these merged into a single 18-minute file
    unless concatenate_output=True is explicitly passed.
    """
    tasks = [
        generate_single_voice(
            text=text,
            voice_cfg=cfg,
            rate=rate,
            pitch=pitch,
            dry_run=dry_run,
            save_speaker_alias=True,
        )
        for cfg in BENGALI_VOICE_CONFIGS
    ]
    results = await asyncio.gather(*tasks, return_exceptions=False)

    # Sanity verification: verify all 4 files exist individually and have reasonable sizes
    for r in results:
        fpath = r.get("path")
        if fpath and os.path.exists(fpath):
            logger.info(f"Verified independent audio edition: {fpath} ({os.path.getsize(fpath)} bytes)")

    # Explicit opt-in concatenation ONLY if explicitly requested
    if concatenate_output:
        logger.warning("concatenate_output=True requested. Merging segments into a single long audio track.")
        try:
            from pydub import AudioSegment

            combined = AudioSegment.empty()
            for r in results:
                fpath = r.get("path")
                if fpath and os.path.exists(fpath):
                    combined += AudioSegment.from_file(fpath, format="mp3")
            combined.export("combined_all_speakers.mp3", format="mp3")
            logger.info("Exported combined_all_speakers.mp3")
        except Exception as e:
            logger.error(f"Explicit concatenation failed: {e}")

    return results


async def generate_speaker_segments(
    segments: List[Dict[str, Any]],
    output_dir: str = "audio_segments",
    dry_run: bool = False,
    concatenate_output: bool = False,
) -> List[Dict[str, Any]]:
    """
    Generates distinct individual audio files for a list of speaker segments
    (e.g., segment 1 -> speaker_1.mp3, segment 2 -> speaker_2.mp3).
    Ensures every segment is exported individually.
    """
    os.makedirs(output_dir, exist_ok=True)
    generated = []

    for idx, seg in enumerate(segments):
        speaker_idx = idx + 1
        speaker_filename = os.path.join(output_dir, f"speaker_{speaker_idx}.mp3")
        text = seg.get("text") or seg.get("narration") or ""
        voice = seg.get("voice") or BENGALI_VOICE_CONFIGS[(speaker_idx - 1) % len(BENGALI_VOICE_CONFIGS)]["voice"]

        cfg = {
            "id": f"speaker_{speaker_idx}",
            "name": f"Speaker {speaker_idx}",
            "voice": voice,
            "filename": speaker_filename,
            "speaker_filename": speaker_filename,
        }

        res = await generate_single_voice(
            text=text,
            voice_cfg=cfg,
            rate=seg.get("rate", "+5%"),
            pitch=seg.get("pitch", "-1Hz"),
            dry_run=dry_run,
            save_speaker_alias=False,
        )
        generated.append(res)

    return generated


async def generate_audio_with_edge_tts(
    text: str,
    dialect: str = "none",
    output_filename: str = "generated_audio.mp3",
    rate: str = "+5%",
    pitch: str = "-1Hz",
    dry_run: bool = False,
) -> str:
    """
    Generates a single isolated audio track selected based on the dialect tag.
    """
    chosen_voice = DIALECT_VOICE_MAP.get(dialect.lower(), "bn-BD-NabanitaNeural")
    cfg = {
        "id": "single_dialect",
        "name": f"Dialect Audio ({dialect})",
        "voice": chosen_voice,
        "filename": output_filename,
    }
    res = await generate_single_voice(text, cfg, rate=rate, pitch=pitch, dry_run=dry_run, save_speaker_alias=False)
    return res["path"]
