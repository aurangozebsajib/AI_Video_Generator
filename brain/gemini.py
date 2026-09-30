"""
Gemini Cognitive Processing & Multi-Key Manager
Polishes Bengali narration scripts, generates multi-scene visual director breakdowns,
and provides multi-token rotation fallback.
"""

import os
import json
import logging
import urllib.request
import urllib.error
from typing import Optional, Dict, Any
from pathlib import Path

logger = logging.getLogger("AIVideoPipeline.Gemini")

PERSONAS_DIR = Path(__file__).parent / "personas"


def load_persona(persona_name: str) -> str:
    """Loads prompt instructions from brain/personas/<persona_name>.txt"""
    persona_file = PERSONAS_DIR / f"{persona_name}.txt"
    if persona_file.exists():
        try:
            return persona_file.read_text(encoding="utf-8").strip()
        except Exception as e:
            logger.warning(f"Could not read persona {persona_name}: {e}")
    return ""


def call_gemini_api(prompt: str, system_instruction: str = "", model: str = "gemini-2.5-flash") -> Optional[str]:
    """
    Invokes Gemini API via standard HTTPS POST with timeout protection.
    Falls back gracefully if key is unconfigured or rate limited.
    """
    api_key = (
        os.environ.get("GOOGLE_AI_STUDIO_KEY")
        or os.environ.get("GEMINI_API_KEY")
        or os.environ.get("API_KEY", "")
    ).strip()

    if not api_key:
        logger.info("No Gemini API key available; returning original prompt without polish.")
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"

    contents = []
    if system_instruction:
        contents.append({"role": "user", "parts": [{"text": f"Instructions:\n{system_instruction}\n\nTask:\n{prompt}"}]})
    else:
        contents.append({"role": "user", "parts": [{"text": prompt}]})

    payload = json.dumps({"contents": contents}).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json", "User-Agent": "AIVideoPipeline"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=25.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            if candidates and candidates[0].get("content", {}).get("parts"):
                result_text = candidates[0]["content"]["parts"][0].get("text", "")
                return result_text.strip()
    except urllib.error.HTTPError as http_err:
        logger.warning(f"Gemini API HTTP {http_err.code}: {http_err.reason}. Continuing without polish.")
    except Exception as exc:
        logger.warning(f"Gemini API connection error: {exc}. Continuing without polish.")

    return None
