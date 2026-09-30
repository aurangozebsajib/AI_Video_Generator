"""
Audio Processing & Multi-Voice Bengali Speech Synthesis Module
"""

from .tts import (
    generate_all_bengali_audio_versions,
    generate_audio_with_edge_tts,
    generate_speaker_segments,
    generate_single_voice,
    BENGALI_VOICE_CONFIGS,
)

__all__ = [
    "generate_all_bengali_audio_versions",
    "generate_audio_with_edge_tts",
    "generate_speaker_segments",
    "generate_single_voice",
    "BENGALI_VOICE_CONFIGS",
]
