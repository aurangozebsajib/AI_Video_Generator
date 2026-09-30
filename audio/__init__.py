"""
Audio Processing & Edge-TTS Speech Synthesis Module
"""

from .tts import (
    BENGALI_VOICE_CONFIGS,
    generate_single_audio_edition,
    generate_all_bengali_audio_versions,
    generate_audio_with_edge_tts,
    write_dummy_audio_file,
)

__all__ = [
    "BENGALI_VOICE_CONFIGS",
    "generate_single_audio_edition",
    "generate_all_bengali_audio_versions",
    "generate_audio_with_edge_tts",
    "write_dummy_audio_file",
]
