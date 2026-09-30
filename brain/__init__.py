"""
Brain Package: Script Ingestion, Cognitive Parsing & Multi-Agent Orchestration
"""

from .docs import get_latest_script_from_doc
from .parser import parse_doc_entries, segment_script_into_scenes
from .gemini import call_gemini_api, load_persona
from .multi_agent import (
    orchestrate_multi_agent_brain,
    ApiKeyManager,
    call_grok,
    call_gemini,
    call_openrouter,
    call_cloudflare,
)

__all__ = [
    "get_latest_script_from_doc",
    "parse_doc_entries",
    "segment_script_into_scenes",
    "call_gemini_api",
    "load_persona",
    "orchestrate_multi_agent_brain",
    "ApiKeyManager",
    "call_grok",
    "call_gemini",
    "call_openrouter",
    "call_cloudflare",
]
