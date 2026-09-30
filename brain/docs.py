"""
Google Docs & Workspace Script Ingestion Module
Safely retrieves latest script entries from Google Docs using service accounts.
"""

import os
import json
import logging
from typing import Dict, Any

logger = logging.getLogger("AIVideoPipeline.Brain.Docs")

SERVICE_ACCOUNT_JSON = os.environ.get("GOOGLE_SERVICE_JSON", "").strip()


def get_latest_script_from_doc(doc_id: str, dry_run: bool = False) -> str:
    """
    Reads the latest video script entry from the target Google Doc.
    Supports live Google Docs API with service account credentials,
    and returns simulated dry-run script if offline.
    """
    if dry_run or not doc_id:
        logger.info(f"[DRY RUN] Simulating Google Doc retrieval for ID: '{doc_id or 'Default Simulated Doc'}'")
        return (
            "Video 1 | 2026-09-30\n"
            "Dialect: old-dhaka\n"
            "আইচ্ছা মামুর বেটা, শুনেন তাইলে! আইজকা পুরান ঢাকার অরিজিনাল বিরিয়ানি আর বাকরখানির গল্প কমু।"
        )

    if not SERVICE_ACCOUNT_JSON:
        logger.warning("GOOGLE_SERVICE_JSON secret is empty. Using simulated fallback Bengali script.")
        return (
            "Video 1 | 2026-09-30\n"
            "Dialect: none\n"
            "আসসালামু আলাইকুম! প্রযুক্তির উৎকর্ষে আমাদের নতুন এআই ভিডিও জেনারেশন পাইপলাইনে আপনাকে স্বাগতম।"
        )

    try:
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build

        creds_dict = json.loads(SERVICE_ACCOUNT_JSON)
        creds = Credentials.from_service_account_info(
            creds_dict,
            scopes=["https://www.googleapis.com/auth/documents.readonly"]
        )

        service = build("docs", "v1", credentials=creds, cache_discovery=False)
        document = service.documents().get(documentId=doc_id).execute()

        content = document.get("body", {}).get("content", [])
        text = ""

        for element in content:
            if "paragraph" in element:
                elements = element.get("paragraph", {}).get("elements", [])
                for elem in elements:
                    text_run = elem.get("textRun", {})
                    if "content" in text_run:
                        text += text_run["content"]

        logger.info(f"Successfully retrieved document content ({len(text)} characters).")
        return text

    except Exception as e:
        logger.error(f"Error accessing Google Doc ID '{doc_id}': {e}. Using resilient fallback script.")
        return (
            "Video 1 | 2026-09-30\n"
            "Dialect: none\n"
            "আসসালামু আলাইকুম! স্বাগতম আমাদের স্বয়ংক্রিয় এআই ভিডিও এবং অডিও প্রোডাকশন পাইপলাইনে।"
        )
