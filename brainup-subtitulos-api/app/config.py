"""Configuración por variables de entorno (ver .env.example)."""
import os
from pathlib import Path

DATA_DIR = Path(os.getenv("DATA_DIR", "data")).resolve()
JOBS_DIR = DATA_DIR / "jobs"

# Claves que el hub debe enviar en la cabecera X-API-Key (separadas por comas).
# Si está vacío, la API no exige autenticación (solo para desarrollo local).
API_KEYS = {k.strip() for k in os.getenv("API_KEYS", "").split(",") if k.strip()}

CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-opus-5-5")
CLAUDE_EFFORT = os.getenv("CLAUDE_EFFORT", "high")

WHISPER_MODEL = os.getenv("WHISPER_MODEL", "large-v3")
WHISPER_DEVICE = os.getenv("WHISPER_DEVICE", "cpu")  # "cuda" si hay GPU NVIDIA
WHISPER_COMPUTE_TYPE = os.getenv("WHISPER_COMPUTE_TYPE", "int8")  # "float16" en GPU

FFMPEG = os.getenv("FFMPEG_BIN", "ffmpeg")
FFPROBE = os.getenv("FFPROBE_BIN", "ffprobe")

# Estilo de los subtítulos quemados (formato ASS de libass)
SUBTITLE_STYLE = os.getenv(
    "SUBTITLE_STYLE",
    "FontName=Arial,FontSize=17,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
    "BorderStyle=1,Outline=1.3,Shadow=0.6,MarginV=16",
)
# Vídeo vertical (Reels/TikTok/Shorts): letra más pequeña respecto a la altura y más arriba,
# para no quedar tapados por los botones e interfaz de la app
SUBTITLE_STYLE_VERTICAL = os.getenv(
    "SUBTITLE_STYLE_VERTICAL",
    "FontName=Arial,FontSize=13,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,"
    "BorderStyle=1,Outline=1.1,Shadow=0.5,MarginV=60",
)

# Nº de subtítulos que se traducen por llamada a Claude
TRANSLATION_CHUNK = int(os.getenv("TRANSLATION_CHUNK", "150"))

MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "4096"))

LANGUAGES = {"es": ("spa", "Español", "castellano (español de España)"),
             "en": ("eng", "English", "English")}
