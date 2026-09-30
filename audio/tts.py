"""
Edge-TTS Multi-Voice Bengali Speech Synthesis
Supports 4 distinct regional Bengali voices with ID3 metadata embedding.
"""
import os
import time
import shutil
import subprocess
import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional

logger = logging.getLogger("AIVideoPipeline.Audio")
TIMEOUT_EDGE_TTS = float(os.environ.get("TIMEOUT_EDGE_TTS", "45.0"))

BENGALI_VOICE_CONFIGS: List[Dict[str, Any]] = [
    {
        "id": "v1_nabanita",
        "voice": "bn-BD-NabanitaNeural",
        "name": "Nabanita",
        "label": "Bangladesh Female (Nabanita)",
        "region": "Bangladesh",
        "gender": "Female",
        "filename": "generated_audio_nabanita_female_bd.mp3",
        "speaker_filename": "speaker_1.mp3",
    },
    {
        "id": "v2_pradeep",
        "voice": "bn-BD-PradeepNeural",
        "name": "Pradeep",
        "label": "Bangladesh Male (Pradeep)",
        "region": "Bangladesh",
        "gender": "Male",
        "filename": "generated_audio_pradeep_male_bd.mp3",
        "speaker_filename": "speaker_2.mp3",
    },
    {
        "id": "v3_tanishaa",
        "voice": "bn-IN-TanishaaNeural",
        "name": "Tanishaa",
        "label": "India Bengali Female (Tanishaa)",
        "region": "India",
        "gender": "Female",
        "filename": "generated_audio_tanishaa_female_in.mp3",
        "speaker_filename": "speaker_3.mp3",
    },
    {
        "id": "v4_bashkar",
        "voice": "bn-IN-BashkarNeural",
        "name": "Bashkar",
        "label": "India Bengali Male (Bashkar)",
        "region": "India",
        "gender": "Male",
        "filename": "generated_audio_bashkar_male_in.mp3",
        "speaker_filename": "speaker_4.mp3",
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


def write_dummy_audio_file(filepath: str, duration_sec: int = 4):
    """Creates a valid minimal MP3 file with silent MPEG audio sync frames."""
    Path(filepath).parent.mkdir(parents=True, exist_ok=True)
    mp3_frame = b'\xff\xfb\x90\x64' + (b'\x00' * 413)
    with open(filepath, 'wb') as f:
        for _ in range(max(1, duration_sec * 38)):
            f.write(mp3_frame)


def embed_mp3_id3_metadata(filepath: str, title: str, artist: str, album: str, comment: str, date_str: str):
    """Embeds ID3 metadata tags into MP3 files via FFmpeg."""
    if not os.path.exists(filepath) or os.path.getsize(filepath) < 100:
        return
    temp_path = filepath + ".tagged.mp3"
    cmd = [
        "ffmpeg", "-y", "-i", filepath,
        "-metadata", f"title={title}",
        "-metadata", f"artist={artist}",
        "-metadata", f"album={album}",
        "-metadata", f"comment={comment}",
        "-metadata", f"date={date_str}",
        "-c", "copy", temp_path
    ]
    try:
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=5.0)
        if res.returncode == 0 and os.path.exists(temp_path) and os.path.getsize(temp_path) > 0:
            os.replace(temp_path, filepath)
    except Exception as e:
        logger.debug(f"ID3 metadata tagger skipped ({e}).")
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception:
                pass


async def generate_single_audio_edition(
    text: str,
    voice_config: Dict[str, Any],
    rate: str = "+5%",
    pitch: str = "-1Hz",
    dry_run: bool = False,
    save_speaker_alias: bool = True,
) -> Dict[str, Any]:
    voice = voice_config["voice"]
    voice_id = voice_config.get("id", voice)
    label = voice_config.get("label", voice_config.get("name", "Bengali Edition"))
    filename = voice_config.get("filename", "generated_audio.mp3")
    speaker_filename = voice_config.get("speaker_filename", "")

    now_utc = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
    iso_timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    date_stamp = time.strftime("%Y-%m-%d", time.gmtime())

    clean_text = " ".join(text.strip().split())
    script_snippet = clean_text[:100] + "..." if len(clean_text) > 105 else clean_text

    result_meta = {
        **voice_config,
        "voice_id": voice_id,
        "voice_model": voice,
        "filepath": filename,
        "path": filename,
        "speaker_path": speaker_filename,
        "rate": rate,
        "pitch": pitch,
        "timestamp": now_utc,
        "iso_timestamp": iso_timestamp,
        "date_stamp": date_stamp,
        "script_snippet": script_snippet,
        "script_length": len(text),
        "success": False
    }

    if dry_run:
        write_dummy_audio_file(filename)
        if save_speaker_alias and speaker_filename and speaker_filename != filename:
            try:
                shutil.copyfile(filename, speaker_filename)
            except Exception:
                pass
        result_meta["success"] = True
        return result_meta

    Path(filename).parent.mkdir(parents=True, exist_ok=True)
    try:
        import edge_tts
        communicator = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        logger.info(f"Synthesizing {label} ({voice})...")
        await asyncio.wait_for(communicator.save(filename), timeout=TIMEOUT_EDGE_TTS)

        if os.path.exists(filename) and os.path.getsize(filename) > 0:
            embed_mp3_id3_metadata(
                filepath=filename,
                title=f"AI Voiceover: {voice_config.get('name', 'Bengali')}",
                artist=f"{label} ({voice})",
                album="Bengali AI Video Generator Edition",
                comment=f"ID: {voice_id} | Time: {now_utc} | Snippet: {script_snippet}",
                date_str=date_stamp
            )
            if save_speaker_alias and speaker_filename and speaker_filename != filename:
                try:
                    shutil.copyfile(filename, speaker_filename)
                except Exception:
                    pass
            result_meta["success"] = True
            result_meta["file_size_bytes"] = os.path.getsize(filename)
            return result_meta
        else:
            write_dummy_audio_file(filename)
            return result_meta
    except Exception as e:
        logger.error(f"[Edge-TTS Error] {label} ({voice}): {e}. Fallback triggered.")
        write_dummy_audio_file(filename)
        if save_speaker_alias and speaker_filename and speaker_filename != filename:
            try:
                shutil.copyfile(filename, speaker_filename)
            except Exception:
                pass
        return result_meta


# Backward-compatible alias
generate_single_voice = generate_single_audio_edition


async def generate_all_bengali_audio_versions(
    text: str, rate: str = "+5%", pitch: str = "-1Hz", dry_run: bool = False, concatenate_output: bool = False
) -> List[Dict[str, Any]]:
    tasks = [
        generate_single_audio_edition(text, v_conf, rate=rate, pitch=pitch, dry_run=dry_run)
        for v_conf in BENGALI_VOICE_CONFIGS
    ]
    results = await asyncio.gather(*tasks, return_exceptions=False)
    if results and os.path.exists(results[0]["filepath"]):
        try:
            shutil.copyfile(results[0]["filepath"], "generated_audio.mp3")
        except Exception:
            pass

    if concatenate_output:
        try:
            from pydub import AudioSegment
            combined = AudioSegment.empty()
            for r in results:
                fpath = r.get("filepath")
                if fpath and os.path.exists(fpath):
                    combined += AudioSegment.from_file(fpath, format="mp3")
            combined.export("combined_all_speakers.mp3", format="mp3")
        except Exception as e:
            logger.error(f"Concatenation error: {e}")

    return results


async def generate_audio_with_edge_tts(
    text: str, dialect: str = "none", output_filename: str = "generated_audio.mp3", dry_run: bool = False
) -> str:
    chosen_voice = DIALECT_VOICE_MAP.get(dialect.lower(), "bn-BD-NabanitaNeural")
    cfg = {
        "id": "single_dialect",
        "name": f"Dialect Audio ({dialect})",
        "voice": chosen_voice,
        "filename": output_filename,
        "label": f"Dialect Voice ({dialect})",
    }
    res = await generate_single_audio_edition(text, cfg, rate="+5%", pitch="-1Hz", dry_run=dry_run)
    return res["filepath"] if res else output_filename


async def generate_speaker_segments(
    segments: List[Dict[str, Any]], output_dir: str = "audio_segments", dry_run: bool = False
) -> List[Dict[str, Any]]:
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
            "label": f"Speaker {speaker_idx}",
        }
        res = await generate_single_audio_edition(
            text=text, voice_config=cfg, rate=seg.get("rate", "+5%"), pitch=seg.get("pitch", "-1Hz"), dry_run=dry_run
        )
        generated.append(res)
    return generated
