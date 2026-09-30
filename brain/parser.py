"""
Script & Document Parser Module
Parses headers (Video N | YYYY-MM-DD), extracts dialect tags (rangpuri, barishal, old-dhaka),
and segments narrative text into clean spoken Bengali scripts.
"""

import re
import logging
from typing import Tuple, List, Dict, Any

logger = logging.getLogger("AIVideoPipeline.Parser")


def parse_doc_entries(raw_content: str) -> Tuple[str, str, str]:
    """
    Parses Google Doc content formatted as:
    Video N | YYYY-MM-DD
    Dialect: <dialect_name>
    <Bengali Script Content...>

    Returns:
        (video_header, dialect, clean_script_text)
    """
    lines = [line.strip() for line in raw_content.splitlines() if line.strip()]

    video_header = "Video 1 | Production"
    dialect = "none"
    script_lines: List[str] = []

    for line in lines:
        # Match header line e.g., Video 1 | 2026-10-05
        if re.match(r"^Video\s+\d+\s*\|", line, re.IGNORECASE):
            video_header = line
            continue

        # Match Dialect tag e.g., Dialect: rangpuri or Dialect: old-dhaka
        dialect_match = re.match(r"^Dialect\s*:\s*([a-zA-Z0-9_\-]+)", line, re.IGNORECASE)
        if dialect_match:
            dialect = dialect_match.group(1).lower().strip()
            continue

        # Remaining lines form the narrative script text
        script_lines.append(line)

    clean_script = "\n".join(script_lines).strip()
    if not clean_script:
        clean_script = raw_content.strip()

    logger.info(f"Parsed Header: '{video_header}', Dialect: '{dialect}', Script Length: {len(clean_script)} chars")
    return video_header, dialect, clean_script


def segment_script_into_scenes(script_text: str, scene_count: int = 3) -> List[Dict[str, Any]]:
    """
    Breaks a script into discrete narrative visual scenes for video generation.
    """
    sentences = [s.strip() for s in re.split(r"[।\n\.!\?]", script_text) if s.strip()]

    if not sentences:
        sentences = [script_text]

    scenes = []
    chunk_size = max(1, len(sentences) // scene_count)

    for i in range(scene_count):
        start_idx = i * chunk_size
        end_idx = (i + 1) * chunk_size if i < scene_count - 1 else len(sentences)
        scene_sentences = sentences[start_idx:end_idx]
        narration = " । ".join(scene_sentences)
        if not narration.endswith("।"):
            narration += " ।"

        scenes.append({
            "scene_number": i + 1,
            "duration_sec": 4.0,
            "narration": narration,
            "shot_type": "Wide establishing cinematic shot" if i == 0 else "Medium tracking shot" if i == 1 else "Close-up dramatic shot",
            "camera_movement": "Drone push-in" if i == 0 else "Slow pan-left" if i == 1 else "Gentle slow zoom-in",
        })

    return scenes


# Alias matching master repository specification
extract_scenes_for_video = segment_script_into_scenes
