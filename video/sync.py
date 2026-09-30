"""
Audio-Video Synchronization Engine
Analyzes speech narration tempo and onsets using Librosa,
and synchronizes multi-scene video clips with Edge-TTS audio using FFmpeg.
"""

import os
import subprocess
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple
from brain.parser import extract_scenes_for_video
from .generator import generate_scene_clips

logger = logging.getLogger("AIVideoPipeline.Video.Sync")

TIMEOUT_FFMPEG_SUBPROCESS = float(os.environ.get("TIMEOUT_FFMPEG_SUBPROCESS", "60.0"))


def analyze_audio_tempo_librosa(audio_path: str) -> Dict[str, Any]:
    """
    Performs tempo, beat-tracking, and duration analysis on the narration audio using Librosa.
    Falls back to ffprobe or file size estimation if Librosa is not available.
    """
    if not os.path.exists(audio_path) or os.path.getsize(audio_path) == 0:
        return {"duration": 5.0, "tempo": 120.0, "beat_count": 10}

    # 1. Attempt Librosa audio analysis
    try:
        import librosa
        y, sr = librosa.load(audio_path, sr=22050, duration=120)
        duration = float(librosa.get_duration(y=y, sr=sr))
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        tempo_val = float(tempo[0]) if hasattr(tempo, "__len__") else float(tempo)

        logger.info(f"Librosa analysis complete: duration={duration:.2f}s, tempo={tempo_val:.1f} BPM, beats={len(beat_frames)}")
        return {
            "duration": max(1.0, duration),
            "tempo": max(60.0, tempo_val),
            "beat_count": len(beat_frames),
        }
    except Exception as e:
        logger.debug(f"Librosa analysis skipped ({e}). Using ffprobe duration probe.")

    # 2. Fallback using ffprobe
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            audio_path
        ]
        res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=5.0, text=True)
        dur = float(res.stdout.strip())
        return {"duration": dur, "tempo": 115.0, "beat_count": int(dur * 2)}
    except Exception:
        # 3. Safe fallback approximation based on standard MP3 bitrate (128kbps = 16000 bytes/sec)
        size = os.path.getsize(audio_path)
        est_dur = max(3.0, min(120.0, size / 16000.0))
        return {"duration": est_dur, "tempo": 115.0, "beat_count": int(est_dur * 2)}


def auto_sync_video_audio_ffmpeg(
    clip_paths: List[str],
    audio_path: str,
    output_path: str,
    video_title: str = "AI Video",
    dry_run: bool = False
) -> str:
    """
    Concatenates visual scene clips and loops/synchronizes them to the exact narration duration,
    multiplexing audio and video with clean libx264/aac encoding.
    """
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)

    if dry_run:
        logger.info(f"[DRY RUN] Simulating FFmpeg auto-sync: {len(clip_paths)} clips + {audio_path} -> {output_path}")
        with open(output_path, "wb") as f:
            f.write(b"\x00" * 2048)
        return output_path

    # Extract exact audio duration for precise synchronization
    audio_meta = analyze_audio_tempo_librosa(audio_path)
    target_duration = audio_meta["duration"]

    # Write concat demuxer list
    work_dir = Path(output_path).parent
    concat_list_file = work_dir / f"concat_{Path(output_path).stem}.txt"
    with open(concat_list_file, "w") as f:
        # Loop clips enough times to cover audio duration
        repeat_count = max(2, int((target_duration / 4.0) + 1))
        for _ in range(repeat_count):
            for cp in clip_paths:
                f.write(f"file '{Path(cp).resolve()}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_list_file),
        "-i", audio_path,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-t", str(target_duration),
        "-max_muxing_queue_size", "1024",
        output_path
    ]

    try:
        subprocess.run(
            cmd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            timeout=TIMEOUT_FFMPEG_SUBPROCESS,
            check=True
        )
        logger.info(f"Successfully rendered synchronized video: {output_path} ({target_duration:.2f}s)")
    except Exception as e:
        logger.warning(f"FFmpeg concat render warning: {e}. Executing simplified direct mux.")
        simple_cmd = [
            "ffmpeg", "-y",
            "-i", clip_paths[0],
            "-i", audio_path,
            "-c:v", "copy",
            "-c:a", "aac",
            "-shortest",
            output_path
        ]
        subprocess.run(simple_cmd, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20.0)

    return output_path


async def run_full_video_pipeline(
    video_header: str,
    script_text: str,
    audio_results: List[Dict[str, Any]],
    dialect: str = "none",
    dry_run: bool = False
) -> List[Tuple[str, str]]:
    """
    Executes the complete video generation & sync pipeline:
    1. Breaks down Bengali script into scene prompts via brain.
    2. Renders scene visual video clips via video generator.
    3. Auto-syncs clips with each of the 4 Bengali voice editions.
    Returns list of (video_filepath, edition_label) tuples.
    """
    logger.info("Executing Full Video Generation & Synchronization Pipeline...")

    work_dir = Path("pipeline_workspace")
    work_dir.mkdir(parents=True, exist_ok=True)
    output_dir = work_dir / "final_outputs"
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Segment script into structured scenes
    scenes = extract_scenes_for_video(script_text, dialect=dialect)

    # 2. Render visual scene clips
    clip_paths = generate_scene_clips(scenes, work_dir, dry_run=dry_run)

    # 3. Synchronize with all 4 Bengali voice editions
    rendered_editions: List[Tuple[str, str]] = []

    for audio_info in audio_results:
        voice_id = audio_info.get("id", "v1")
        voice_label = audio_info.get("label", "Bengali Voice")
        audio_file = audio_info.get("filepath", "generated_audio.mp3")

        output_video_path = str(output_dir / f"final_video_{voice_id}.mp4")

        logger.info(f"Synchronizing visual timeline with audio edition: {voice_label}...")
        auto_sync_video_audio_ffmpeg(
            clip_paths=clip_paths,
            audio_path=audio_file,
            output_path=output_video_path,
            video_title=f"{video_header} - {voice_label}",
            dry_run=dry_run
        )

        rendered_editions.append((output_video_path, voice_label))

    logger.info(f"Rendered {len(rendered_editions)} synchronized video editions.")
    return rendered_editions
