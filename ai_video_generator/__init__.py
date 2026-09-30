"""
AI Video Generator Master Package
"""
import sys
from pathlib import Path

# Add project root to sys.path so nested modules resolve cleanly
root_path = str(Path(__file__).parent.parent)
if root_path not in sys.path:
    sys.path.insert(0, root_path)

import brain
import audio
import video
import telegram

__all__ = ["brain", "audio", "video", "telegram"]
