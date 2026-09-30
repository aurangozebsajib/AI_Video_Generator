"""
Audio Processing & Edge-TTS Speech Synthesis Module
"""
from .tts import (
    BENGALI_VOICE_CONFIGS,
    generate_single_audio_edition,
    generate_single_voice,
    generate_all_bengali_audio_versions,
    generate_audio_with_edge_tts,
    generate_speaker_segments,
    write_dummy_audio_file,
    embed_mp3_id3_metadata,
)

__all__ = [
    "BENGALI_VOICE_CONFIGS",
    "generate_single_audio_edition",
    "generate_single_voice",
    "generate_all_bengali_audio_versions",
    "generate_audio_with_edge_tts",
    "generate_speaker_segments",
    "write_dummy_audio_file",
    "embed_mp3_id3_metadata",
]
