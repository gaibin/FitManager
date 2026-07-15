"""Vercel Python entry point for the YGFIT posture API."""

from __future__ import annotations

import os
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
MODEL = BACKEND / "models" / "pose_landmarker" / "pose_landmarker_heavy.task"

sys.path.insert(0, str(BACKEND))
os.environ.setdefault("POSE_LANDMARKER_MODEL", str(MODEL))
os.environ.setdefault("POSTURE_SEGMENTATION_MASKS", "false")
os.environ.setdefault("MAX_CONTENT_LENGTH_MB", "4")

from app import app  # noqa: E402,F401
