"""Almacén de trabajos en disco (data/jobs/<id>/job.json) y cola de procesamiento.

Un solo worker procesa los vídeos de uno en uno: Whisper y ffmpeg usan toda la CPU/GPU.
Los trabajos sobreviven a reinicios: al arrancar se reencolan los que estaban pendientes.
"""
import json
import logging
import queue
import shutil
import threading
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path

from . import config

log = logging.getLogger("jobs")
_lock = threading.Lock()
_cola: "queue.Queue[str]" = queue.Queue()

ESTADOS_FINALES = {"completed", "failed"}


def ahora():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def carpeta(job_id: str) -> Path:
    return config.JOBS_DIR / job_id


def leer(job_id: str) -> dict | None:
    f = carpeta(job_id) / "job.json"
    if not f.exists():
        return None
    with _lock:
        return json.loads(f.read_text(encoding="utf-8"))


def guardar(job: dict):
    job["updated_at"] = ahora()
    f = carpeta(job["id"]) / "job.json"
    with _lock:
        tmp = f.with_suffix(".tmp")
        tmp.write_text(json.dumps(job, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(f)


def actualizar(job_id: str, **campos) -> dict:
    job = leer(job_id)
    job.update(campos)
    guardar(job)
    return job


def crear(**datos) -> dict:
    job_id = uuid.uuid4().hex[:12]
    carpeta(job_id).mkdir(parents=True)
    job = {"id": job_id, "status": "queued", "phase": None, "progress": 0.0, "created_at": ahora(),
           "approved": False, "error": None, "files": [], "review_summary": None, **datos}
    guardar(job)
    return job


def listar() -> list[dict]:
    if not config.JOBS_DIR.exists():
        return []
    jobs = [leer(p.name) for p in config.JOBS_DIR.iterdir() if (p / "job.json").exists()]
    return sorted(jobs, key=lambda j: j["created_at"], reverse=True)


def borrar(job_id: str):
    shutil.rmtree(carpeta(job_id), ignore_errors=True)


def encolar(job_id: str):
    _cola.put(job_id)


def notificar(job: dict):
    """Avisa al hub (callback_url) cuando el trabajo termina, falla o espera revisión."""
    url = job.get("callback_url")
    if not url:
        return
    try:
        req = urllib.request.Request(url, data=json.dumps(job).encode(), method="POST",
                                     headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=15)
    except Exception as e:  # el callback nunca debe tumbar el worker
        log.warning("callback a %s falló: %s", url, e)


def _worker():
    from .pipeline import procesar
    while True:
        job_id = _cola.get()
        try:
            if leer(job_id):
                procesar(job_id)
        except Exception:
            log.exception("error no controlado en el trabajo %s", job_id)
        finally:
            _cola.task_done()


def arrancar_worker():
    config.JOBS_DIR.mkdir(parents=True, exist_ok=True)
    for job in reversed(listar()):
        if job["status"] in ("queued", "processing"):
            encolar(job["id"])
    threading.Thread(target=_worker, daemon=True, name="worker-subtitulos").start()
