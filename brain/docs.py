"""
Google Docs & Sheets Ingestion Module
Authenticates via service account JSON or OAuth to extract script content and log tracking.
"""

import os
import json
import logging
from typing import Optional

logger = logging.getLogger("AIVideoPipeline.Docs")

DEFAULT_SAMPLE_SCRIPT = """Video 1 | 2026-09-30
Dialect: old-dhaka
আসসালামু আলাইকুম! প্রযুক্তির উৎকর্ষে আমাদের নতুন এআই ভিডিও এবং অডিও প্রোডাকশন পাইপলাইনে আপনাকে স্বাগতম। আজকের এই বিশেষ পর্বে আমরা কৃত্রিম বুদ্ধিমত্তা চালিত আধুনিক মাল্টি-ভয়েস ন্যারেশন এবং সিনেমাটিক ভিজ্যুয়াল সংশ্লেষণ সরাসরি উপভোগ করব।"""


def get_latest_script_from_doc(doc_id: str, dry_run: bool = False) -> str:
    """
    Ingests raw script text from Google Doc using Google Drive/Docs API.
    Falls back gracefully to default sample Bengali script if credentials
    are not set, in dry-run mode, or if network drops.
    """
    if dry_run or not doc_id:
        logger.info(f"[DRY RUN] Simulating Google Doc ingestion for ID: '{doc_id or 'DEFAULT'}'")
        return DEFAULT_SAMPLE_SCRIPT

    service_account_json = os.environ.get("GOOGLE_SERVICE_JSON", "").strip()
    if not service_account_json:
        logger.warning("GOOGLE_SERVICE_JSON is not configured. Falling back to default script template.")
        return DEFAULT_SAMPLE_SCRIPT

    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build

        creds_dict = json.loads(service_account_json)
        scopes = [
            "https://www.googleapis.com/auth/documents.readonly",
            "https://www.googleapis.com/auth/drive.readonly",
        ]
        creds = Credentials.from_service_account_info(creds_dict, scopes=scopes)
        service = build("docs", "v1", credentials=creds, cache_discovery=False)

        document = service.documents().get(documentId=doc_id).execute()
        content = ""

        body = document.get("body", {})
        for elem in body.get("content", []):
            if "paragraph" in elem:
                for pellet in elem["paragraph"].get("elements", []):
                    if "textRun" in pellet:
                        content += pellet["textRun"].get("content", "")

        cleaned = content.strip()
        if not cleaned:
            logger.warning("Google Doc content was empty. Using fallback sample.")
            return DEFAULT_SAMPLE_SCRIPT

        logger.info(f"Successfully fetched {len(cleaned)} characters from Google Doc ({doc_id})")
        return cleaned

    except Exception as exc:
        logger.warning(f"Failed to fetch script from Google Doc ({doc_id}): {exc}. Falling back to default sample.")
        return DEFAULT_SAMPLE_SCRIPT
