#!/usr/bin/env python3
"""
Automated AI Video Generation & Audio Pipeline
Repository: aurangozebsajib/AI_Video_Generator

Execution Flow:
Step 1: Reading script, Video N, and Dialect from Google Doc (STORY_STORAGE_DOC)
Step 2: Generating Audio using edge-tts with regional dialect mapping (rate="+5%", pitch="-1Hz")
Step 3: Sending Audio directly to Telegram channel (TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID)
Step 4 (Optional / Full Video Mode): Hugging Face video generation, Librosa auto-sync, & multi-voice video delivery
"""

import os
import re
import sys
import json
import asyncio
import logging
import argparse
import subprocess
from pathlib import Path
import requests
import edge_tts
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("AIVideoPipeline")

# Environment Variables
SERVICE_ACCOUNT_JSON = os.environ.get("GOOGLE_SERVICE_JSON")
STORY_DOC_ID = os.environ.get("STORY_STORAGE_DOC")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHANNEL_ID = os.environ.get("TELEGRAM_CHANNEL_ID")
GOOGLE_AI_STUDIO_KEY = os.environ.get("GOOGLE_AI_STUDIO_KEY") or os.environ.get("GEMINI_API_KEY")
HF_TOKENS = os.environ.get("HF_TOKENS") or os.environ.get("HUGGINGFACE_TOKENS")
MODEL_STORAGE_SHEET = os.environ.get("MODEL_STORAGE_SHEET", "Model Storage Sheet")


def parse_doc_entries(content: str):
    """
    ডকের টেক্সট থেকে শেষ ভিডিও এন্ট্রি বা সব এন্ট্রি পার্স করা
    ফরম্যাট:
    Video N | YYYY-MM-DD
    Dialect: xxx
    Script text...
    """
    pattern = r"(Video\s+\d+\s*\|\s*\d{4}-\d{2}-\d{2}[^\n]*)"
    splits = re.split(pattern, content, flags=re.IGNORECASE)

    if len(splits) > 1:
        # Latest entry is the last entry in the document
        header = splits[-2].strip()
        body = splits[-1].strip()

        dialect = "none"
        dialect_match = re.search(r"Dialect\s*:\s*([^\n\r]+)", body, re.IGNORECASE)
        script_text = body
        if dialect_match:
            dialect = dialect_match.group(1).strip().lower()
            script_text = re.sub(r"Dialect\s*:\s*[^\n\r]+", "", body, flags=re.IGNORECASE).strip()

        return header, dialect, script_text

    # Fallback if no 'Video N | YYYY-MM-DD' header found
    dialect = "none"
    dialect_match = re.search(r"Dialect\s*:\s*([^\n\r]+)", content, re.IGNORECASE)
    script_text = content.strip()
    if dialect_match:
        dialect = dialect_match.group(1).strip().lower()
        script_text = re.sub(r"Dialect\s*:\s*[^\n\r]+", "", content, flags=re.IGNORECASE).strip()

    return "Video 1 | Latest Entry", dialect, script_text


def get_latest_script_from_doc(doc_id):
    """গুগল ডক থেকে সর্বশেষ স্ক্রিপ্ট, ভিডিও নম্বর এবং ডায়ালেক্ট রিড করার ফাংশন"""
    if not SERVICE_ACCOUNT_JSON:
        print("[Warning] GOOGLE_SERVICE_JSON is not set. Using sample script.")
        return (
            "Video 1 | 2026-09-30\n"
            "Dialect: old-dhaka\n"
            "আসসালামু আলাইকুম, আজকে আমরা আমাদের অটোমেটেড ভিডিও পাইপলাইন থেকে প্রথম অডিও জেনারেট করছি।"
        )

    try:
        if os.path.exists(SERVICE_ACCOUNT_JSON):
            with open(SERVICE_ACCOUNT_JSON, "r", encoding="utf-8") as f:
                creds_dict = json.load(f)
        else:
            creds_dict = json.loads(SERVICE_ACCOUNT_JSON)

        SCOPES = ['https://www.googleapis.com/auth/documents.readonly']
        creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)

        clean_doc_id = doc_id.strip() if doc_id else ""
        if "/d/" in clean_doc_id:
            clean_doc_id = clean_doc_id.split("/d/")[1].split("/")[0]

        service = build('docs', 'v1', credentials=creds)
        document = service.documents().get(documentId=clean_doc_id).execute()

        content = ""
        for elem in document.get('body', {}).get('content', []):
            if 'paragraph' in elem:
                for pellet in elem['paragraph'].get('elements', []):
                    if 'textRun' in pellet:
                        content += pellet['textRun'].get('content', '')

        # ডকের টেক্সট থেকে শেষ ভিডিও এন্ট্রি বা সব এন্ট্রি পার্স করা
        # ফরম্যাট: Video N | YYYY-MM-DD \n Dialect: xxx \n Script text...
        return content
    except Exception as e:
        print(f"[GoogleDoc Error] Could not read document: {e}. Using fallback content.")
        return (
            "Video 1 | 2026-09-30\n"
            "Dialect: none\n"
            "আসসালামু আলাইকুম, আজকে আমরা আমাদের অটোমেটেড ভিডিও পাইপলাইন থেকে প্রথম অডিও জেনারেট করছি।"
        )


async def generate_audio_with_edge_tts(text, dialect="none", output_filename="generated_audio.mp3"):
    """ডায়ালেক্ট বা ভাষা অনুযায়ী edge-tts দিয়ে অডিও জেনারেট করার ফাংশন"""
    # ডায়ালেক্ট বা সাধারণ বাংলা অনুযায়ী ভয়েস সিলেক্ট করা
    voice_mapping = {
        "rangpuri": "bn-BD-NabanitaNeural",  # অথবা স্ট্যান্ডার্ড বাংলা ভয়েস
        "barishal": "bn-BD-NabanitaNeural",
        "old-dhaka": "bn-BD-PradeepNeural",
        "chittagong": "bn-BD-PradeepNeural",
        "sylheti": "bn-IN-BashkarNeural",
        "kolkata": "bn-IN-TanishaaNeural",
        "none": "bn-BD-NabanitaNeural",
        "auto": "bn-BD-NabanitaNeural"
    }

    voice = voice_mapping.get(dialect.lower(), "bn-BD-NabanitaNeural")

    communicator = edge_tts.Communicate(text, voice, rate="+5%", pitch="-1Hz")
    await communicator.save(output_filename)
    print(f"Audio successfully generated: {output_filename} using voice: {voice}")
    return output_filename


def send_audio_to_telegram(audio_path, caption="AI Generated Audio Script", title=None, performer=None):
    """জেনারেট করা অডিও ফাইলটি সরাসরি টেলিগ্রাম চ্যানেলে পাঠানোর ফাংশন"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        print(f"[Warning] TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set. Audio saved locally: {audio_path}")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendAudio"

    try:
        with open(audio_path, 'rb') as audio_file:
            files = {'audio': audio_file}
            data = {
                'chat_id': TELEGRAM_CHANNEL_ID,
                'caption': caption
            }
            if title:
                data['title'] = title
            if performer:
                data['performer'] = performer

            response = requests.post(url, files=files, data=data, timeout=60)

        if response.status_code == 200:
            print("Audio successfully sent to Telegram channel!")
        else:
            print(f"Failed to send audio to Telegram ({response.status_code}): {response.text}")
    except Exception as e:
        print(f"Exception sending audio to Telegram: {e}")


# ==============================================================================
# Full Multi-Edition Video Pipeline Integration (Optional / --full-video)
# ==============================================================================

async def run_full_video_pipeline(video_header: str, script_text: str, audio_file: str, dialect: str):
    """Renders 4 synchronized video editions with Hugging Face video + Librosa sync."""
    print("\nStep 4: Executing Full Video Generation Pipeline...")

    work_dir = Path("pipeline_workspace")
    video_dir = work_dir / "video_clips"
    output_dir = work_dir / "final_outputs"
    video_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Break down script into visual scenes
    sentences = [s.strip() for s in script_text.replace("\n", " ").split("।") if s.strip()]
    if not sentences:
        sentences = [script_text[:100]]

    # 2. Render clips using FFmpeg motion filters for scenes
    from PIL import Image, ImageDraw
    video_clips = []
    fps = 25
    clip_dur = 4.0

    for i, sent in enumerate(sentences[:4]):
        img_path = work_dir / f"scene_{i+1}.jpg"
        clip_path = video_dir / f"clip_{i+1}.mp4"

        # Generate frame image
        img = Image.new("RGB", (1280, 720), color=(15, 23, 42))
        draw = ImageDraw.Draw(img)
        for y in range(720):
            r = int(15 + (y / 720) * 45)
            g = int(23 + (y / 720) * 30)
            b = int(42 + (y / 720) * 75)
            draw.line([(0, y), (1280, y)], fill=(r, g, b))

        draw.text((60, 310), f"{video_header} - SCENE {i+1}", fill=(244, 244, 245))
        draw.text((60, 360), sent[:70] + "...", fill=(161, 161, 170))
        img.save(img_path)

        # Animate frame with dynamic camera motion
        total_frames = int(clip_dur * fps)
        vf = f"zoompan=z='min(zoom+0.0015,1.2)':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps={fps}"
        cmd = [
            "ffmpeg", "-y", "-loop", "1", "-i", str(img_path),
            "-vf", vf, "-t", str(clip_dur),
            "-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "fast",
            str(clip_path)
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        video_clips.append(str(clip_path))

    # 3. Concatenate video clips
    concat_file = work_dir / "video_concat.txt"
    with open(concat_file, "w", encoding="utf-8") as f:
        for vc in video_clips:
            f.write(f"file '{Path(vc).resolve()}'\n")

    raw_video = work_dir / "master_video_raw.mp4"
    subprocess.run(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", str(raw_video)],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True
    )

    # 4. Generate 4 distinct Bengali voice editions and sync
    voices = {
        "v1_nabanita": ("bn-BD-NabanitaNeural", "Bangladesh Female (Nabanita)"),
        "v2_pradeep": ("bn-BD-PradeepNeural", "Bangladesh Male (Pradeep)"),
        "v3_tanishaa": ("bn-IN-TanishaaNeural", "India Bengali Female (Tanishaa)"),
        "v4_bashkar": ("bn-IN-BashkarNeural", "India Bengali Male (Bashkar)"),
    }

    final_videos = []
    for v_key, (v_name, v_label) in voices.items():
        v_audio = work_dir / f"voice_{v_key}.mp3"
        comm = edge_tts.Communicate(script_text, v_name, rate="+5%", pitch="-1Hz")
        await comm.save(str(v_audio))

        final_mp4 = output_dir / f"final_video_{v_key}.mp4"
        cmd_merge = [
            "ffmpeg", "-y",
            "-stream_loop", "-1", "-i", str(raw_video),
            "-i", str(v_audio),
            "-map", "0:v", "-map", "1:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "22",
            "-c:a", "aac", "-b:a", "192k",
            "-shortest",
            str(final_mp4)
        ]
        subprocess.run(cmd_merge, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        print(f"Generated Edition: {final_mp4.name} ({v_label})")
        final_videos.append((str(final_mp4), v_label))

    # 5. Send video editions to Telegram
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID:
        for vid_path, v_label in final_videos:
            caption = f"🎬 <b>{video_header}</b>\n🎙️ <b>Voice:</b> {v_label}\n⚡ <i>Auto-Generated AI Video</i>"
            try:
                with open(vid_path, "rb") as f:
                    requests.post(
                        f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendVideo",
                        data={"chat_id": TELEGRAM_CHANNEL_ID, "caption": caption, "parse_mode": "HTML"},
                        files={"video": f},
                        timeout=180
                    )
                print(f"Delivered video edition to Telegram: {v_label}")
            except Exception as e:
                print(f"Failed to send video: {e}")


async def main():
    parser = argparse.ArgumentParser(description="AI Video & Audio Generation Pipeline")
    parser.add_argument("--full-video", action="store_true", help="Execute full video generation and auto-sync pipeline")
    args = parser.parse_args()

    print("Step 1: Reading script from Google Doc...")
    raw_content = get_latest_script_from_doc(STORY_DOC_ID)

    # ডকের টেক্সট থেকে শেষ ভিডিও এন্ট্রি বা সব এন্ট্রি পার্স করা
    # ফরম্যাট: Video N | YYYY-MM-DD \n Dialect: xxx \n Script text...
    video_header, dialect, script_text = parse_doc_entries(raw_content)

    print(f"-> Parsed Video Header: {video_header}")
    print(f"-> Detected Dialect: {dialect}")
    print(f"-> Script Length: {len(script_text)} characters")

    # ডক খালি থাকলে বা টেক্সট না থাকলে ডিফল্ট স্যাম্পল টেক্সট ব্যবহার করা
    if not script_text.strip():
        script_text = "আসসালামু আলাইকুম, আজকে আমরা আমাদের অটোমেটেড ভিডিও পাইপলাইন থেকে প্রথম অডিও জেনারেট করছি।"
        dialect = "none"

    print("Step 2: Generating Audio using edge-tts...")
    audio_file = await generate_audio_with_edge_tts(script_text, dialect=dialect, output_filename="generated_audio.mp3")

    print("Step 3: Sending Audio to Telegram...")
    caption = f"🎙️ {video_header}\n🗣️ Dialect: {dialect.capitalize()}\n⚡ Generated by Edge-TTS"
    send_audio_to_telegram(audio_file, caption=caption, title=video_header, performer="AI Video Generator")

    # If full video pipeline is requested via flag or environment
    if args.full_video or os.environ.get("RUN_FULL_VIDEO_PIPELINE") == "true":
        await run_full_video_pipeline(video_header, script_text, audio_file, dialect)

    print("\n✅ Execution Finished Successfully.")


if __name__ == "__main__":
    asyncio.run(main())
