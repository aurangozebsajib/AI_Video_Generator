#!/usr/bin/env python3
"""
Standalone Script: Google Doc to edge-tts to Telegram Audio Pipeline
Repository: aurangozebsajib/AI_Video_Generator

Features:
1. get_latest_script_from_doc(doc_id): Reads latest script, Video N, and Dialect from Google Doc.
2. generate_audio_with_edge_tts(text, dialect, output_filename): Generates audio with rate & pitch adjustments.
3. send_audio_to_telegram(audio_path, caption): Sends the generated audio file to Telegram channel.
"""

import os
import re
import json
import asyncio
import requests
import edge_tts
from typing import Dict, Any, Tuple
from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

# Environment Variables
SERVICE_ACCOUNT_JSON = os.environ.get("GOOGLE_SERVICE_JSON")
STORY_DOC_ID = os.environ.get("STORY_STORAGE_DOC")
TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHANNEL_ID = os.environ.get("TELEGRAM_CHANNEL_ID")


def parse_latest_entry(content: str) -> Tuple[str, str, str]:
    """
    ডকের টেক্সট থেকে শেষ ভিডিও এন্ট্রি পার্স করা
    ফরম্যাট:
    Video N | YYYY-MM-DD
    Dialect: xxx
    [Script text...]
    """
    pattern = r"(Video\s+\d+\s*\|\s*\d{4}-\d{2}-\d{2}[^\n]*)"
    splits = re.split(pattern, content, flags=re.IGNORECASE)

    if len(splits) > 1:
        # Latest entry is the last block
        header = splits[-2].strip()
        body = splits[-1].strip()

        dialect = "none"
        dialect_match = re.search(r"Dialect\s*:\s*([^\n\r]+)", body, re.IGNORECASE)
        script_text = body
        if dialect_match:
            dialect = dialect_match.group(1).strip().lower()
            script_text = re.sub(r"Dialect\s*:\s*[^\n\r]+", "", body, flags=re.IGNORECASE).strip()

        return header, dialect, script_text

    # No 'Video N | YYYY-MM-DD' header found, check for a generic Dialect line
    dialect = "none"
    dialect_match = re.search(r"Dialect\s*:\s*([^\n\r]+)", content, re.IGNORECASE)
    script_text = content.strip()
    if dialect_match:
        dialect = dialect_match.group(1).strip().lower()
        script_text = re.sub(r"Dialect\s*:\s*[^\n\r]+", "", content, flags=re.IGNORECASE).strip()

    return "Latest Video Script", dialect, script_text


def get_latest_script_from_doc(doc_id):
    """গুগল ডক থেকে সর্বশেষ স্ক্রিপ্ট, ভিডিও নম্বর এবং ডায়ালেক্ট রিড করার ফাংশন"""
    if not SERVICE_ACCOUNT_JSON or not doc_id:
        print("[Notice] SERVICE_ACCOUNT_JSON or STORY_STORAGE_DOC not set. Using sample script.")
        sample_doc = (
            "Video 1 | 2026-09-30\n"
            "Dialect: old-dhaka\n"
            "আসসালামু আলাইকুম, আজকে আমরা আমাদের অটোমেটেড ভিডিও পাইপলাইন থেকে প্রথম অডিও জেনারেট করছি।"
        )
        return sample_doc

    # Support raw JSON string or file path
    if os.path.exists(SERVICE_ACCOUNT_JSON):
        with open(SERVICE_ACCOUNT_JSON, "r", encoding="utf-8") as f:
            creds_dict = json.load(f)
    else:
        creds_dict = json.loads(SERVICE_ACCOUNT_JSON)

    SCOPES = ['https://www.googleapis.com/auth/documents.readonly']
    creds = Credentials.from_service_account_info(creds_dict, scopes=SCOPES)

    # Extract ID if URL is passed
    clean_id = doc_id
    if "/d/" in clean_id:
        clean_id = clean_id.split("/d/")[1].split("/")[0]

    service = build('docs', 'v1', credentials=creds)
    document = service.documents().get(documentId=clean_id).execute()

    content = ""
    for elem in document.get('body', {}).get('content', []):
        if 'paragraph' in elem:
            for pellet in elem['paragraph'].get('elements', []):
                if 'textRun' in pellet:
                    content += pellet['textRun'].get('content', '')

    return content


async def generate_audio_with_edge_tts(text, dialect="none", output_filename="generated_audio.mp3"):
    """ডায়ালেক্ট বা ভাষা অনুযায়ী edge-tts দিয়ে অডিও জেনারেট করার ফাংশন"""
    # ডায়ালেক্ট বা সাধারণ বাংলা অনুযায়ী ভয়েস সিলেক্ট করা
    voice_mapping = {
        "rangpuri": "bn-BD-NabanitaNeural",  # রংপুরী / উত্তরবঙ্গীয়
        "barishal": "bn-BD-NabanitaNeural",  # বরিশাইল্লা
        "old-dhaka": "bn-BD-PradeepNeural",  # পুরান ঢাকা
        "chittagong": "bn-BD-PradeepNeural", # চাঁটগাঁইয়া
        "sylheti": "bn-IN-BashkarNeural",    # সিলেটি
        "kolkata": "bn-IN-TanishaaNeural",   # পশ্চিমবঙ্গ
        "none": "bn-BD-NabanitaNeural",
        "auto": "bn-BD-NabanitaNeural"
    }

    voice = voice_mapping.get(dialect.lower(), "bn-BD-NabanitaNeural")

    communicator = edge_tts.Communicate(text, voice, rate="+5%", pitch="-1Hz")
    await communicator.save(output_filename)
    print(f"Audio successfully generated: {output_filename} using voice: {voice} (dialect: {dialect})")
    return output_filename


def send_audio_to_telegram(audio_path, caption="AI Generated Audio Script"):
    """জেনারেট করা অডিও ফাইলটি সরাসরি টেলিগ্রাম চ্যানেলে পাঠানোর ফাংশন"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHANNEL_ID:
        print(f"[Notice] TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID not set. Audio saved at: {audio_path}")
        return

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendAudio"

    with open(audio_path, 'rb') as audio_file:
        files = {'audio': audio_file}
        data = {
            'chat_id': TELEGRAM_CHANNEL_ID,
            'caption': caption
        }
        response = requests.post(url, files=files, data=data, timeout=60)

    if response.status_code == 200:
        print(f"Audio successfully sent to Telegram channel: {TELEGRAM_CHANNEL_ID}!")
    else:
        print(f"Failed to send audio to Telegram ({response.status_code}): {response.text}")


async def main():
    print("Step 1: Reading script from Google Doc...")
    raw_content = get_latest_script_from_doc(STORY_DOC_ID)

    # ডকের টেক্সট থেকে শেষ ভিডিও এন্ট্রি পার্স করা
    video_header, dialect, script_text = parse_latest_entry(raw_content)
    print(f"Parsed Video Header: {video_header}")
    print(f"Detected Dialect: {dialect}")
    print(f"Script Length: {len(script_text)} characters")

    # যদি ডক খালি থাকে, ডিফল্ট টেস্ট টেক্সট ব্যবহার করা
    if not script_text.strip():
        script_text = "আসসালামু আলাইকুম, আজকে আমরা আমাদের অটোমেটেড ভিডিও পাইপলাইন থেকে প্রথম অডিও জেনারেট করছি।"
        dialect = "none"

    print("Step 2: Generating Audio using edge-tts...")
    audio_file = await generate_audio_with_edge_tts(script_text, dialect=dialect, output_filename="generated_audio.mp3")

    print("Step 3: Sending Audio to Telegram...")
    caption = f"🎙️ {video_header}\n🗣️ Dialect: {dialect.capitalize()}\n⚡ Generated by Edge-TTS"
    send_audio_to_telegram(audio_file, caption=caption)


if __name__ == "__main__":
    asyncio.run(main())
