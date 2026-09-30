"""
Brain Script & Scene Parser
Parses Google Doc markdown/text headers, extracts dialect flags,
and decomposes Bengali narration into structured scene prompts for video generation.
"""

import re
import logging
from typing import Tuple, List, Dict, Any

logger = logging.getLogger("AIVideoPipeline.Brain.Parser")


def parse_doc_entries(content: str) -> Tuple[str, str, str]:
    """
    Parses Google Doc content to extract:
    1. Video Header: 'Video N | YYYY-MM-DD'
    2. Dialect: 'old-dhaka', 'sylheti', 'chittagong', 'barishal', 'rangpuri', 'kolkata', 'none'
    3. Script Body: Spoken Bengali narration
    """
    if not content or not content.strip():
        return "Video 1 | Default", "none", ""

    pattern = r"(Video\s+\d+\s*\|\s*\d{4}-\d{2}-\d{2}[^\n]*)"
    splits = re.split(pattern, content, flags=re.IGNORECASE)

    if len(splits) > 1:
        # The latest entry is located at the last block
        header = splits[-2].strip()
        body = splits[-1].strip()

        dialect = "none"
        dialect_match = re.search(r"Dialect\s*:\s*([^\n\r]+)", body, re.IGNORECASE)
        script_text = body
        if dialect_match:
            dialect = dialect_match.group(1).strip().lower()
            script_text = re.sub(r"Dialect\s*:\s*[^\n\r]+", "", body, flags=re.IGNORECASE).strip()

        return header, dialect, script_text

    # Fallback if specific Video header is absent
    dialect = "none"
    dialect_match = re.search(r"Dialect\s*:\s*([^\n\r]+)", content, re.IGNORECASE)
    script_text = content.strip()
    if dialect_match:
        dialect = dialect_match.group(1).strip().lower()
        script_text = re.sub(r"Dialect\s*:\s*[^\n\r]+", "", content, flags=re.IGNORECASE).strip()

    return "Video 1 | Auto", dialect, script_text


def extract_scenes_for_video(script_text: str, dialect: str = "none") -> List[Dict[str, Any]]:
    """
    Segments a Bengali script into visual scenes with generated prompts,
    mood, and estimated duration weights for video rendering.
    """
    sentences = [s.strip() for s in re.split(r"[।!?\n]+", script_text) if s.strip()]
    if not sentences:
        sentences = [
            "বাংলাদেশে সূর্যোদয়ের মনোরম দৃশ্য এবং নদীর বুক চিরে নৌকা চলাচল।",
            "সবুজ শ্যামল গ্রাম এবং ঐতিহ্যবাহী বাঙালি সংস্কৃতির আবহ।",
            "আধুনিক ঢাকার কর্মচাঞ্চল্য এবং ঐতিহ্যের নান্দনিক মেলবন্ধন।",
            "ভবিষ্যতের সম্ভাবনাময় সমৃদ্ধ বাংলাদেশের স্বপ্ন ও অগ্রগতি।"
        ]

    # Group into 3 to 5 scenes
    num_scenes = max(3, min(5, len(sentences)))
    scenes = []

    # Dialect aesthetic hints
    dialect_visual_notes = {
        "old-dhaka": "Historic Old Dhaka architectural alleys, heritage terracotta, bustling warm lighting, Lalbagh Fort aura",
        "chittagong": "Coastal port scenery, green hills of Chittagong, Karnaphuli river breeze, maritime sunrise",
        "sylheti": "Lush green tea gardens of Sylhet, morning mist over rolling slopes, peaceful crystal streams",
        "rangpuri": "Golden rural fields of North Bengal, calm riverbanks, majestic sunset over the Teesta",
        "barishal": "Floating guava markets, emerald rivers, lush water canals, traditional riverine boats",
        "kolkata": "Classic colonial architecture, Howrah bridge reflections, vibrant cultural streets",
        "none": "Cinematic visual panorama of Bangladesh landscape, modern cultural aesthetic, 8k ultra-detailed"
    }
    visual_note = dialect_visual_notes.get(dialect.lower(), dialect_visual_notes["none"])

    for i in range(num_scenes):
        chunk_idx = min(i, len(sentences) - 1)
        bengali_sentence = sentences[chunk_idx]

        prompt = (
            f"Cinematic masterpiece, scene {i+1}: {visual_note}. "
            f"Atmospheric golden hour lighting, 35mm film lens, photorealistic 8k, ultra-smooth motion. "
            f"Theme: {bengali_sentence[:80]}"
        )

        scenes.append({
            "scene_number": i + 1,
            "bengali_caption": bengali_sentence,
            "prompt": prompt,
            "duration_ratio": 1.0 / num_scenes,
        })

    logger.info(f"Decomposed script into {len(scenes)} visual scene prompts.")
    return scenes
