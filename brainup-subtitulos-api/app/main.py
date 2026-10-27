"""API REST de subtitulado y traducción de vídeos de cualquier sector (castellano ↔ inglés).

Documentación interactiva en /docs una vez arrancada.
"""
import logging
import shutil
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from . import config, jobs, pipeline

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(app):
    jobs.arrancar_worker()
    yield


app = FastAPI(title="Subtitulado y traducción de vídeos", version="1.1.0", lifespan=lifespan,
              description="Transcribe (Whisper), revisa la coherencia según el contexto del vídeo, traduce y "
                          "localiza (Claude) e incrusta subtítulos (ffmpeg). Cualquier sector. Castellano ↔ inglés.")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def autenticar(x_api_key: str | None = Header(default=None)):
    if config.API_KEYS and x_api_key not in config.API_KEYS:
        raise HTTPException(401, "X-API-Key inválida o ausente")


def _booleano(valor: str | None, defecto: bool) -> bool:
    if valor is None or not valor.strip():
        return defecto
    v = valor.strip().lower()
    if v in ("true", "1", "yes", "si", "sí", "on"):
        return True
    if v in ("false", "0", "no", "off"):
        return False
    raise HTTPException(422, f"Valor booleano no válido: {valor!r}")


def _job_o_404(job_id: str) -> dict:
    job = jobs.leer(job_id)
    if not job:
        raise HTTPException(404, "Trabajo no encontrado")
    return job


class Correccion(BaseModel):
    index: int
    text: str  # vacío = eliminar el subtítulo
    level: Literal["SEGURO", "REVISAR"] = "SEGURO"
    reason: str = ""


@app.get("/health")
def health():
    return {"status": "ok", "model": config.CLAUDE_MODEL, "whisper": config.WHISPER_MODEL}


@app.post("/jobs", status_code=202, dependencies=[Depends(autenticar)])
def crear_trabajo(
    file: UploadFile = File(..., description="Vídeo (mp4, mov, mkv…)"),
    source_lang: Literal["es", "en"] | None = Form(None, description="Idioma hablado. Vacío = detectar"),
    target_lang: Literal["es", "en"] | None = Form(None, description="Idioma de los subtítulos. Vacío = el contrario"),
    topic: str = Form("", description="Contexto: cliente/marca, sector y tipo de vídeo, p. ej. "
                                      "'Anuncio de lanzamiento de zapatillas de running, marca Nike, tono cercano'"),
    glossary: str = Form("", description="Nombres propios y términos esperados, separados por comas "
                                         "(marcas, productos, personas, jerga del sector)"),
    # Como texto: FastAPI convierte un booleano de formulario ausente en False e ignora el valor por defecto
    review_required: str | None = Form(None, description="true/false. Pausar tras la revisión para que un humano la valide (defecto: false)"),
    burn: str | None = Form(None, description="true/false. Generar también el vídeo con subtítulos quemados (defecto: true)"),
    callback_url: str | None = Form(None, description="URL a la que se hace POST con el trabajo al terminar"),
):
    if source_lang and target_lang and source_lang == target_lang:
        raise HTTPException(422, "source_lang y target_lang no pueden coincidir")
    job = jobs.crear(original_filename=file.filename, source_lang=source_lang, target_lang=target_lang,
                     topic=topic, glossary=glossary, review_required=_booleano(review_required, False),
                     burn=_booleano(burn, True),
                     callback_url=callback_url)
    destino = jobs.carpeta(job["id"]) / "input.mp4"
    with destino.open("wb") as f:
        shutil.copyfileobj(file.file, f, length=1024 * 1024)
    if destino.stat().st_size > config.MAX_UPLOAD_MB * 1024 * 1024:
        jobs.borrar(job["id"])
        raise HTTPException(413, f"El vídeo supera {config.MAX_UPLOAD_MB} MB")
    jobs.encolar(job["id"])
    return job


@app.get("/jobs", dependencies=[Depends(autenticar)])
def listar_trabajos():
    return jobs.listar()


@app.get("/jobs/{job_id}", dependencies=[Depends(autenticar)])
def ver_trabajo(job_id: str):
    return _job_o_404(job_id)


@app.get("/jobs/{job_id}/review", dependencies=[Depends(autenticar)])
def ver_revision(job_id: str):
    """Transcripción original con las correcciones propuestas (fase 2)."""
    _job_o_404(job_id)
    d = jobs.carpeta(job_id)
    if not (d / "review.json").exists():
        raise HTTPException(409, "La revisión aún no está lista")
    return {"transcript": pipeline._leer_json(d / "transcript.json"),
            "corrections": pipeline._leer_json(d / "review.json")}


@app.put("/jobs/{job_id}/review", dependencies=[Depends(autenticar)])
def editar_revision(job_id: str, correcciones: list[Correccion]):
    """Sustituye la lista de correcciones (solo en estado awaiting_review)."""
    job = _job_o_404(job_id)
    if job["status"] != "awaiting_review":
        raise HTTPException(409, "Solo se puede editar la revisión en estado awaiting_review")
    d = jobs.carpeta(job_id)
    segmentos = pipeline._leer_json(d / "transcript.json")
    validos = {s["i"] for s in segmentos}
    datos = [c.model_dump() for c in correcciones]
    if any(c["index"] not in validos for c in datos):
        raise HTTPException(422, "Hay correcciones con un número de subtítulo inexistente")
    pipeline._escribir_json(d / "review.json", datos)
    pipeline.informe_revision(d, segmentos, datos)
    return jobs.actualizar(job_id, review_summary=pipeline.resumen_revision(segmentos, datos))


@app.post("/jobs/{job_id}/approve", status_code=202, dependencies=[Depends(autenticar)])
def aprobar(job_id: str):
    """Da por buena la revisión y continúa con la traducción y el vídeo."""
    job = _job_o_404(job_id)
    if job["status"] != "awaiting_review":
        raise HTTPException(409, "El trabajo no está esperando revisión")
    job = jobs.actualizar(job_id, approved=True, status="queued")
    jobs.encolar(job_id)
    return job


@app.post("/jobs/{job_id}/retry", status_code=202, dependencies=[Depends(autenticar)])
def reintentar(job_id: str):
    """Reintenta un trabajo fallido desde la fase en que se quedó."""
    job = _job_o_404(job_id)
    if job["status"] != "failed":
        raise HTTPException(409, "Solo se pueden reintentar trabajos fallidos")
    job = jobs.actualizar(job_id, status="queued", error=None)
    jobs.encolar(job_id)
    return job


@app.get("/jobs/{job_id}/files/{nombre}", dependencies=[Depends(autenticar)])
def descargar(job_id: str, nombre: str):
    job = _job_o_404(job_id)
    if nombre not in job.get("files", []):
        raise HTTPException(404, "Archivo no disponible")
    base = (job.get("original_filename") or "video").rsplit(".", 1)[0]
    return FileResponse(jobs.carpeta(job_id) / nombre, filename=nombre.replace("video", base, 1))


@app.delete("/jobs/{job_id}", status_code=204, dependencies=[Depends(autenticar)])
def borrar_trabajo(job_id: str):
    job = _job_o_404(job_id)
    if job["status"] == "processing":
        raise HTTPException(409, "No se puede borrar un trabajo en proceso")
    jobs.borrar(job_id)
