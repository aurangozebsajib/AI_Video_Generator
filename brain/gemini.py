"""
Gemini 2.5 Flash LLM Integration & Token Rotation Manager
Handles intelligent prompt polishing, dialect enhancement, and API token rotation.
"""

import os
import time
import logging
from typing import Optional, List

logger = logging.getLogger("AIVideoPipeline.Brain.Gemini")

TIMEOUT_GEMINI_API = float(os.environ.get("TIMEOUT_GEMINI_API", "20.0"))

# Parse multiple keys if provided as comma-separated values for rotation
_RAW_GEMINI_KEYS = (os.environ.get("GOOGLE_AI_STUDIO_KEY") or os.environ.get("GEMINI_API_KEY", "")).strip()
_GEMINI_KEYS: List[str] = [k.strip() for k in _RAW_GEMINI_KEYS.split(",") if k.strip()]
_gemini_key_index = 0

_RAW_HF_TOKENS = os.environ.get("HF_TOKENS", "").strip()
_HF_TOKENS: List[str] = [t.strip() for t in _RAW_HF_TOKENS.split(",") if t.strip()]
_hf_token_index = 0


def get_gemini_key_rotation() -> Optional[str]:
    """Retrieves the current active Gemini API key from rotation pool."""
    global _gemini_key_index
    if not _GEMINI_KEYS:
        return None
    key = _GEMINI_KEYS[_gemini_key_index % len(_GEMINI_KEYS)]
    return key


def rotate_gemini_key():
    """Rotates to next Gemini key in the pool upon rate-limit or error."""
    global _gemini_key_index
    if len(_GEMINI_KEYS) > 1:
        _gemini_key_index = (_gemini_key_index + 1) % len(_GEMINI_KEYS)
        logger.info(f"Rotated Gemini API key to slot {_gemini_key_index + 1}/{len(_GEMINI_KEYS)}.")


def get_hf_token_rotation() -> Optional[str]:
    """Retrieves the current active Hugging Face token from rotation pool."""
    global _hf_token_index
    if not _HF_TOKENS:
        return None
    token = _HF_TOKENS[_hf_token_index % len(_HF_TOKENS)]
    _hf_token_index = (_hf_token_index + 1) % len(_HF_TOKENS)
    return token


def call_gemini_api(prompt_text: str, timeout_sec: float = TIMEOUT_GEMINI_API) -> Optional[str]:
    """
    Calls Gemini 2.5 Flash API with strict timeouts, token rotation,
    and graceful error fallback so network stalls never hang the pipeline.
    """
    key = get_gemini_key_rotation()
    if not key:
        return None

    # Try up to 2 rotation attempts if multiple keys are available
    max_attempts = min(2, len(_GEMINI_KEYS) or 1)

    for attempt in range(max_attempts):
        current_key = get_gemini_key_rotation()
        try:
            # Using urllib to ensure zero external dependency failure
            import urllib.request
            import urllib.error
            import json

            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={current_key}"
            payload = {
                "contents": [{"parts": [{"text": prompt_text}]}],
                "generationConfig": {
                    "temperature": 0.3,
                    "maxOutputTokens": 600,
                }
            }

            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", "User-Agent": "AIVideoPipeline/2.0"},
                method="POST"
            )

            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    candidates = data.get("candidates", [])
                    if candidates and candidates[0].get("content", {}).get("parts"):
                        return candidates[0]["content"]["parts"][0].get("text", "").strip()

        except urllib.error.HTTPError as e:
            logger.warning(f"Gemini API returned HTTP {e.code} on attempt {attempt + 1}")
            if e.code in (429, 403):
                rotate_gemini_key()
                continue
            return None
        except Exception as e:
            logger.warning(f"Gemini API call timed out or encountered an error ({e}). Proceeding without enhancement.")
            return None

    return None
