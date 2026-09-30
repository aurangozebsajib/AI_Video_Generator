"""
Telegram Bot Dispatcher & API Health Diagnostics
Dispatches regional audio tracks and final synchronized videos to the Telegram channel.
"""

import os
import time
import json
import logging
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional

logger = logging.getLogger("AIVideoPipeline.Telegram")


def check_api_health(dry_run: bool = False, timeout_sec: float = 4.0) -> Dict[str, Any]:
    """
    Performs lightweight, non-blocking health pings to Gemini and Telegram APIs
    to detect invalid tokens or timeouts before heavy execution begins.
    """
    gemini_key = (
        os.environ.get("GOOGLE_AI_STUDIO_KEY")
        or os.environ.get("GEMINI_API_KEY")
        or os.environ.get("API_KEY", "")
    ).strip()
    telegram_token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()

    result = {
        "status": "healthy",
        "gemini": {
            "name": "Gemini 2.5 Flash",
            "configured": bool(gemini_key),
            "accessible": False,
            "details": "Unchecked",
        },
        "telegram": {
            "name": "Telegram Bot Dispatch",
            "configured": bool(telegram_token),
            "accessible": False,
            "details": "Unchecked",
        },
        "checked_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    if dry_run:
        result["gemini"]["accessible"] = True
        result["gemini"]["details"] = "Operational (Simulated)"
        result["telegram"]["accessible"] = True
        result["telegram"]["details"] = "Operational (Simulated)"
        return result

    # 1. Ping Gemini
    if gemini_key:
        t0 = time.time()
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key={gemini_key}"
            req = urllib.request.Request(url, headers={"User-Agent": "AIVideoPipeline"})
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                if resp.status == 200:
                    ms = int((time.time() - t0) * 1000)
                    result["gemini"]["accessible"] = True
                    result["gemini"]["details"] = f"Operational ({ms}ms)"
        except Exception as e:
            result["gemini"]["details"] = f"Unreachable: {e}"
    else:
        result["gemini"]["details"] = "Not configured"

    # 2. Ping Telegram
    if telegram_token:
        t0 = time.time()
        try:
            url = f"https://api.telegram.org/bot{telegram_token}/getMe"
            req = urllib.request.Request(url, headers={"User-Agent": "AIVideoPipeline"})
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if data.get("ok"):
                    ms = int((time.time() - t0) * 1000)
                    bot_username = data.get("result", {}).get("username", "bot")
                    result["telegram"]["accessible"] = True
                    result["telegram"]["details"] = f"@{bot_username} ({ms}ms)"
        except Exception as e:
            result["telegram"]["details"] = f"Invalid/Unreachable: {e}"
    else:
        result["telegram"]["details"] = "Not configured"

    if result["gemini"]["accessible"] and (result["telegram"]["accessible"] or not telegram_token):
        result["status"] = "healthy"
    elif result["gemini"]["accessible"] or result["telegram"]["accessible"]:
        result["status"] = "degraded"
    else:
        result["status"] = "error"

    return result


def send_multipart_file(
    endpoint: str,
    file_param: str,
    file_path: str,
    data_params: Dict[str, str],
    timeout_sec: float = 60.0,
) -> bool:
    """Sends a file with multipart/form-data to the Telegram Bot API."""
    import requests

    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    url = f"https://api.telegram.org/bot{token}/{endpoint}"

    if not os.path.exists(file_path):
        logger.warning(f"File not found for Telegram upload: {file_path}")
        return False

    try:
        with open(file_path, "rb") as f:
            files = {file_param: f}
            resp = requests.post(url, data=data_params, files=files, timeout=timeout_sec)

        if resp.status_code == 200:
            logger.info(f"Successfully posted {file_path} to Telegram ({endpoint})")
            return True
        else:
            logger.warning(f"Telegram upload failed (HTTP {resp.status_code}): {resp.text}")
            return False
    except Exception as exc:
        logger.warning(f"Telegram connection exception ({file_path}): {exc}")
        return False


def send_all_audios_to_telegram(
    audio_results: List[Dict[str, Any]],
    video_header: str = "Video Production",
    dialect: str = "none",
    dry_run: bool = False,
):
    """
    Sends all 4 regional Bengali voice audio files sequentially to the Telegram channel.
    """
    channel_id = os.environ.get("TELEGRAM_CHANNEL_ID", "").strip()
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()

    total = len(audio_results)
    for idx, audio in enumerate(audio_results, 1):
        voice_name = audio.get("name", "Bengali Voice")
        filepath = audio.get("path") or audio.get("filename")

        caption = (
            f"🎙️ <b>{video_header}</b>\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"🔊 <b>Edition {idx}/{total}:</b> {voice_name}\n"
            f"🗺️ <b>Dialect / Region:</b> {audio.get('region', 'Standard')}\n"
            f"⚡ <b>Engine:</b> Edge-TTS (Pacing: rate=+5%, pitch=-1Hz)\n"
            f"✨ <i>AI Video Audio Brain System</i>"
        )

        if dry_run or not token or not channel_id:
            logger.info(f"[DRY RUN] Simulating Telegram audio dispatch: {filepath} -> {channel_id or '(no channel)'}")
            continue

        logger.info(f"Sending audio edition {idx}/{total} ({filepath}) to Telegram...")
        send_multipart_file(
            endpoint="sendAudio",
            file_param="audio",
            file_path=filepath,
            data_params={"chat_id": channel_id, "caption": caption, "parse_mode": "HTML"},
            timeout_sec=40.0,
        )
        time.sleep(1.5)  # Rate limiting between uploads


def send_all_videos_to_telegram(
    video_editions: List[Dict[str, Any]],
    video_header: str = "Video Production",
    dry_run: bool = False,
):
    """
    Sends the 4 synchronized final video editions to the Telegram channel.
    """
    channel_id = os.environ.get("TELEGRAM_CHANNEL_ID", "").strip()
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()

    total = len(video_editions)
    for idx, vid in enumerate(video_editions, 1):
        title = vid.get("title", f"Edition {idx}")
        filepath = vid.get("path") or vid.get("filename")

        caption = (
            f"🎬 <b>{video_header}</b>\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"📽️ <b>Video Edition {idx}/{total}:</b> {title}\n"
            f"🎙️ <b>Narration:</b> {vid.get('voice', 'Bengali Edition')}\n"
            f"🎞️ <b>Auto-Sync:</b> Librosa Onset Alignment & FFmpeg Concat\n"
            f"🚀 <i>AI Video Generator Production</i>"
        )

        if dry_run or not token or not channel_id:
            logger.info(f"[DRY RUN] Simulating Telegram video dispatch: {filepath} -> {channel_id or '(no channel)'}")
            continue

        logger.info(f"Sending video edition {idx}/{total} ({filepath}) to Telegram...")
        send_multipart_file(
            endpoint="sendVideo",
            file_param="video",
            file_path=filepath,
            data_params={"chat_id": channel_id, "caption": caption, "parse_mode": "HTML"},
            timeout_sec=90.0,
        )
        time.sleep(2.0)
