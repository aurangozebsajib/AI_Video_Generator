"""
Telegram Dispatcher & Preemptive API Health Monitor
Handles sequential dispatch of multi-voice audio editions and video editions,
HTML formatted captions, and connection health diagnostics.
"""

import os
import time
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional

logger = logging.getLogger("AIVideoPipeline.Telegram")

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_CHANNEL_ID = os.environ.get("TELEGRAM_CHANNEL_ID", "").strip()
GOOGLE_AI_STUDIO_KEY = (os.environ.get("GOOGLE_AI_STUDIO_KEY") or os.environ.get("GEMINI_API_KEY", "")).strip()

TIMEOUT_TELEGRAM = float(os.environ.get("TIMEOUT_TELEGRAM", "45.0"))


# ==============================================================================
# Preemptive API Health Diagnostics
# ==============================================================================

def check_api_health(dry_run: bool = False, timeout_sec: float = 4.0) -> Dict[str, Any]:
    """
    Performs lightweight, non-blocking pings to Gemini and Telegram APIs
    to preemptively detect connection timeouts or invalid tokens before execution.
    """
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    health = {
        "status": "healthy",
        "gemini": {
            "name": "Gemini 2.5 Flash",
            "configured": bool(GOOGLE_AI_STUDIO_KEY),
            "accessible": False,
            "latency_ms": 0,
            "details": "Unchecked",
            "error": None
        },
        "telegram": {
            "name": "Telegram Bot Dispatch",
            "configured": bool(TELEGRAM_BOT_TOKEN),
            "accessible": False,
            "latency_ms": 0,
            "details": "Unchecked",
            "error": None
        },
        "checked_at": timestamp
    }

    if dry_run:
        health["gemini"]["accessible"] = True
        health["gemini"]["latency_ms"] = 35
        health["gemini"]["details"] = "Simulated healthy (dry-run mode)"
        health["telegram"]["accessible"] = True
        health["telegram"]["latency_ms"] = 28
        health["telegram"]["details"] = "Simulated healthy @mock_bot (dry-run mode)"
        health["status"] = "healthy"
        logger.info("[Health Check] Dry-run mode: Gemini and Telegram simulated healthy.")
        return health

    # 1. Lightweight ping to Gemini API
    if GOOGLE_AI_STUDIO_KEY:
        import urllib.request
        import urllib.error
        start_t = time.time()
        # Use primary key if comma-separated
        primary_gemini_key = GOOGLE_AI_STUDIO_KEY.split(",")[0].strip()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash?key={primary_gemini_key}"
        req = urllib.request.Request(url, headers={"User-Agent": "AIVideoPipelineHealthCheck/2.0"})

        try:
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                latency = int((time.time() - start_t) * 1000)
                health["gemini"]["latency_ms"] = latency
                if resp.status == 200:
                    health["gemini"]["accessible"] = True
                    health["gemini"]["details"] = f"Connected ({latency}ms)"
                else:
                    health["gemini"]["error"] = f"HTTP {resp.status}"
                    health["gemini"]["details"] = f"Status {resp.status}"
        except urllib.error.HTTPError as e:
            latency = int((time.time() - start_t) * 1000)
            health["gemini"]["latency_ms"] = latency
            if e.code in (400, 403):
                health["gemini"]["error"] = f"Invalid API Key or unauthorized (HTTP {e.code})"
                health["gemini"]["details"] = "Auth Failed"
            else:
                health["gemini"]["error"] = f"HTTP {e.code}"
                health["gemini"]["details"] = f"HTTP {e.code}"
        except Exception as e:
            latency = int((time.time() - start_t) * 1000)
            health["gemini"]["latency_ms"] = latency
            health["gemini"]["error"] = str(e)
            health["gemini"]["details"] = "Timeout / Unreachable"
    else:
        health["gemini"]["error"] = "GOOGLE_AI_STUDIO_KEY not set"
        health["gemini"]["details"] = "Unconfigured"

    # 2. Lightweight ping to Telegram API
    if TELEGRAM_BOT_TOKEN:
        import urllib.request
        import urllib.error
        start_t = time.time()
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe"
        req = urllib.request.Request(url, headers={"User-Agent": "AIVideoPipelineHealthCheck/2.0"})

        try:
            with urllib.request.urlopen(req, timeout=timeout_sec) as resp:
                latency = int((time.time() - start_t) * 1000)
                health["telegram"]["latency_ms"] = latency
                raw_data = resp.read().decode("utf-8")
                data = json.loads(raw_data) if raw_data else {}

                if data.get("ok"):
                    bot_user = data.get("result", {}).get("username", "bot")
                    health["telegram"]["accessible"] = True
                    health["telegram"]["details"] = f"@{bot_user} ({latency}ms)"
                else:
                    health["telegram"]["error"] = data.get("description", "Invalid Telegram token")
                    health["telegram"]["details"] = "Token Invalid"
        except urllib.error.HTTPError as e:
            latency = int((time.time() - start_t) * 1000)
            health["telegram"]["latency_ms"] = latency
            if e.code in (401, 404):
                health["telegram"]["error"] = "Unauthorized: Invalid Telegram bot token"
                health["telegram"]["details"] = "Token Invalid"
            else:
                health["telegram"]["error"] = f"HTTP {e.code}"
                health["telegram"]["details"] = f"HTTP {e.code}"
        except Exception as e:
            latency = int((time.time() - start_t) * 1000)
            health["telegram"]["latency_ms"] = latency
            health["telegram"]["error"] = str(e)
            health["telegram"]["details"] = "Timeout / Unreachable"
    else:
        health["telegram"]["error"] = "TELEGRAM_BOT_TOKEN not set"
        health["telegram"]["details"] = "Unconfigured"

    # Overall Status Classification
    if health["gemini"]["accessible"] and (health["telegram"]["accessible"] or not health["telegram"]["configured"]):
        health["status"] = "healthy"
    elif health["gemini"]["accessible"] or health["telegram"]["accessible"]:
        health["status"] = "degraded"
    else:
        health["status"] = "error"

    logger.info(
        f"[Preemptive Health Check] Status: {health['status'].upper()} | "
        f"Gemini: {'OK' if health['gemini']['accessible'] else 'FAIL'} ({health['gemini']['details']}) | "
        f"Telegram: {'OK' if health['telegram']['accessible'] else 'FAIL'} ({health['telegram']['details']})"
    )

    return health


# ==============================================================================
# Telegram Audio & Video Delivery
# ==============================================================================

def send_audio_to_telegram(
    audio_path: str,
    caption: str = "AI Generated Audio Script",
    title: Optional[str] = None,
    performer: Optional[str] = None,
    dry_run: bool = False
):
    """Sends an audio file directly to the Telegram channel with timeout & error handling."""
    if dry_run:
        logger.info(f"[DRY RUN] Simulating Telegram sendAudio call to: '{TELEGRAM_CHANNEL_ID or '@mock_channel'}'")
        logger.info(f"[DRY RUN] Audio: {audio_path}")
        logger.info(f"[DRY RUN] Caption: {caption.replace(chr(10), ' ')}")
        logger.info("[DRY RUN] Telegram delivery simulated successfully!")
        return

    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        logger.warning(f"TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set. Audio preserved locally: {audio_path}")
        return

    if not os.path.exists(audio_path):
        logger.error(f"Cannot send audio to Telegram: file not found at '{audio_path}'")
        return

    # Method 1: Requests
    try:
        import requests
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendAudio"

        with open(audio_path, "rb") as audio_file:
            files = {"audio": audio_file}
            data = {
                "chat_id": TELEGRAM_CHANNEL_ID,
                "caption": caption[:1024],
                "parse_mode": "HTML"
            }
            if title:
                data["title"] = title[:64]
            if performer:
                data["performer"] = performer[:64]

            logger.info(f"Uploading {os.path.basename(audio_path)} to Telegram channel...")
            response = requests.post(url, files=files, data=data, timeout=(8.0, TIMEOUT_TELEGRAM))

        if response.status_code == 200:
            logger.info(f"✅ Audio delivered to Telegram ({os.path.basename(audio_path)})!")
        else:
            logger.warning(f"Telegram API response ({response.status_code}): {response.text[:200]}")
        return
    except ImportError:
        pass
    except Exception as e:
        logger.warning(f"Requests error during Telegram upload: {e}. Trying fallback standard library transport...")

    # Method 2: Standard Library Fallback
    try:
        import urllib.request
        import uuid

        boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendAudio"

        data_fields = {
            "chat_id": TELEGRAM_CHANNEL_ID,
            "caption": caption[:1024],
            "parse_mode": "HTML"
        }
        if title:
            data_fields["title"] = title[:64]
        if performer:
            data_fields["performer"] = performer[:64]

        body = bytearray()
        for k, v in data_fields.items():
            body.extend(f"--{boundary}\r\n".encode("utf-8"))
            body.extend(f'Content-Disposition: form-data; name="{k}"\r\n\r\n'.encode("utf-8"))
            body.extend(f"{v}\r\n".encode("utf-8"))

        with open(audio_path, "rb") as f:
            file_bytes = f.read()

        filename = os.path.basename(audio_path)
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="audio"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(b"Content-Type: audio/mpeg\r\n\r\n")
        body.extend(file_bytes)
        body.extend(b"\r\n")
        body.extend(f"--{boundary}--\r\n".encode("utf-8"))

        req = urllib.request.Request(
            url,
            data=bytes(body),
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
        )
        with urllib.request.urlopen(req, timeout=TIMEOUT_TELEGRAM) as resp:
            if resp.status == 200:
                logger.info(f"✅ Audio delivered to Telegram ({filename}) via fallback transport!")
            else:
                logger.warning(f"Telegram fallback response: {resp.status}")
    except Exception as e:
        logger.error(f"Fallback Telegram audio transmission failed: {e}")


def send_all_audios_to_telegram(
    audio_results: List[Dict[str, Any]],
    video_header: str,
    dialect: str = "none",
    dry_run: bool = False
):
    """
    Sends all 4 generated audio files sequentially to the Telegram channel
    with distinct, descriptive captions for each Bengali voice version.
    """
    logger.info(f"\nStep 4: Sending all {len(audio_results)} audio editions sequentially to Telegram...")

    for idx, item in enumerate(audio_results, 1):
        label = item["label"]
        region = item["region"]
        gender = item["gender"]
        voice = item["voice"]
        filepath = item["filepath"]

        caption = (
            f"🎙️ <b>{video_header}</b> (Voice Edition {idx}/4)\n"
            f"🗣️ <b>Voice:</b> {label}\n"
            f"📍 <b>Region:</b> {region} | 👤 <b>Gender:</b> {gender}\n"
            f"🔊 <b>Engine:</b> Edge-TTS (<code>{voice}</code>)\n"
            f"⚡ <b>Pacing:</b> Rate: +5% | Pitch: -1Hz\n"
            f"💬 <b>Doc Dialect:</b> {dialect.capitalize()}"
        )
        title = f"{video_header} - {label}"
        performer = f"AI Voice: {item['name']} ({region})"

        logger.info(f"-> Dispatching edition {idx}/4 to Telegram: {label} ({filepath})...")
        send_audio_to_telegram(
            filepath,
            caption=caption,
            title=title,
            performer=performer,
            dry_run=dry_run
        )

        if not dry_run and idx < len(audio_results):
            time.sleep(1.5)


def send_video_to_telegram(
    video_path: str,
    caption: str = "AI Generated Video",
    dry_run: bool = False
):
    """Sends a single synchronized MP4 video to the Telegram channel."""
    if dry_run:
        logger.info(f"[DRY RUN] Simulating Telegram sendVideo for: {video_path}")
        logger.info(f"[DRY RUN] Video Caption: {caption.replace(chr(10), ' ')}")
        return

    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        logger.warning(f"TELEGRAM credentials not configured. Video preserved at: {video_path}")
        return

    try:
        import requests
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendVideo"
        with open(video_path, "rb") as f:
            requests.post(
                url,
                data={"chat_id": TELEGRAM_CHANNEL_ID, "caption": caption[:1024], "parse_mode": "HTML"},
                files={"video": f},
                timeout=(10.0, 90.0)
            )
        logger.info(f"Delivered video edition to Telegram: {os.path.basename(video_path)}")
    except Exception as e:
        logger.warning(f"Failed to send video '{video_path}' to Telegram: {e}")


def send_all_videos_to_telegram(
    video_editions: List[Tuple[str, str]],
    video_header: str,
    dry_run: bool = False
):
    """Sends all rendered video editions sequentially to Telegram."""
    logger.info(f"\nStep 6: Sending {len(video_editions)} video editions to Telegram...")
    for idx, (vid_path, v_label) in enumerate(video_editions, 1):
        caption = (
            f"🎬 <b>{video_header}</b> (Video Edition {idx}/4)\n"
            f"🎙️ <b>Voice Track:</b> {v_label}\n"
            f"⚡ <i>Auto-Synchronized AI Video Pipeline</i>"
        )
        send_video_to_telegram(vid_path, caption=caption, dry_run=dry_run)
        if not dry_run and idx < len(video_editions):
            time.sleep(2.0)
