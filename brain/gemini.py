"""
Gemini 2.5 Flash LLM Integration & Token Rotation Manager
"""
import os
import time
import logging
from pathlib import Path
from typing import Optional, List

logger = logging.getLogger("AIVideoPipeline.Brain.Gemini")
TIMEOUT_GEMINI_API = float(os.environ.get("TIMEOUT_GEMINI_API", "20.0"))

PERSONAS_DIR = Path(__file__).parent / "personas"

_RAW_GEMINI_KEYS = (os.environ.get("GOOGLE_AI_STUDIO_KEY") or os.environ.get("GEMINI_API_KEY", "")).strip()
_GEMINI_KEYS: List[str] = [k.strip() for k in _RAW_GEMINI_KEYS.split(",") if k.strip()]
_gemini_key_index = 0

_RAW_HF_TOKENS = os.environ.get("HF_TOKENS", "").strip()
_HF_TOKENS: List[str] = [t.strip() for t in _RAW_HF_TOKENS.split(",") if t.strip()]
_hf_token_index = 0


def load_persona(persona_name: str) -> str:
    """Loads prompt instructions from brain/personas/<persona_name>.txt"""
    persona_file = PERSONAS_DIR / f"{persona_name}.txt"
    if persona_file.exists():
        try:
            return persona_file.read_text(encoding="utf-8").strip()
        except Exception as e:
            logger.warning(f"Could not read persona {persona_name}: {e}")
    return ""


def get_gemini_key_rotation() -> Optional[str]:
    global _gemini_key_index
    if not _GEMINI_KEYS:
        return None
    return _GEMINI_KEYS[_gemini_key_index % len(_GEMINI_KEYS)]


def rotate_gemini_key():
    global _gemini_key_index
    if len(_GEMINI_KEYS) > 1:
        _gemini_key_index = (_gemini_key_index + 1) % len(_GEMINI_KEYS)
        logger.info(f"Rotated Gemini API key slot to {_gemini_key_index + 1}/{len(_GEMINI_KEYS)}.")


def get_hf_token_rotation() -> Optional[str]:
    global _hf_token_index
    if not _HF_TOKENS:
        return None
    token = _HF_TOKENS[_hf_token_index % len(_HF_TOKENS)]
    _hf_token_index = (_hf_token_index + 1) % len(_HF_TOKENS)
    return token


def call_gemini_api(prompt_text: str, timeout_sec: float = TIMEOUT_GEMINI_API) -> Optional[str]:
    key = get_gemini_key_rotation()
    if not key:
        return None
    max_attempts = min(2, len(_GEMINI_KEYS) or 1)
    for attempt in range(max_attempts):
        current_key = get_gemini_key_rotation()
        try:
            import urllib.request
            import urllib.error
            import json

            models_to_try = ["gemini-2.5-flash", "gemini-1.5-flash"]
            for model_name in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={current_key}"
                payload = {
                    "contents": [{"parts": [{"text": prompt_text}]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 600}
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={"Content-Type": "application/json", "User-Agent": "AIVideoPipeline/2.0"},
                    method="POST"
                )
                try:
                    with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                        if resp.status == 200:
                            data = json.loads(resp.read().decode("utf-8"))
                            candidates = data.get("candidates", [])
                            if candidates and candidates[0].get("content", {}).get("parts"):
                                return candidates[0]["content"]["parts"][0].get("text", "").strip()
                except urllib.error.HTTPError as he:
                    if he.code == 404:
                        continue
                    raise he
        except urllib.error.HTTPError as e:
            logger.warning(f"Gemini API returned HTTP {e.code} on attempt {attempt + 1}")
            if e.code in (429, 403):
                rotate_gemini_key()
                continue
            return None
        except Exception as e:
            logger.warning(f"Gemini API error/timeout ({e}). Skipping enhancement.")
            return None
    return None
