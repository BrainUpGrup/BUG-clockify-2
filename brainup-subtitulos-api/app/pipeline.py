"""Las 4 fases del proceso. Cada fase guarda su resultado en la carpeta del trabajo y se salta
si ya existe, de modo que un trabajo interrumpido (reinicio, revisión manual) continúa donde se quedó."""
import json
import logging
import shutil
import subprocess
import threading

import numpy as np

from . import config, jobs, llm
from .subtitles import componer_srt, srt_crudo

log = logging.getLogger("pipeline")

_whisper = None
_whisper_lock = threading.Lock()

PISTA_ESTILO = {"es": "Hola a todos. Bienvenidos, ¿empezamos?",
                "en": "Hello, everyone. Welcome, shall we begin?"}


def _modelo_whisper():
    global _whisper
    with _whisper_lock:
        if _whisper is None:
            from faster_whisper import WhisperModel
            _whisper = WhisperModel(config.WHISPER_MODEL, device=config.WHISPER_DEVICE,
                                    compute_type=config.WHISPER_COMPUTE_TYPE)
        return _whisper


def _leer_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def _escribir_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def duracion(video):
    out = subprocess.run([config.FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                          str(video)], capture_output=True, text=True, check=True).stdout
    return float(out.strip())


def es_vertical(video):
    """True si el vídeo se ve en vertical, teniendo en cuenta la rotación que guardan los móviles."""
    out = subprocess.run([config.FFPROBE, "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=width,height:stream_side_data=rotation", "-of", "json", str(video)],
                         capture_output=True, text=True, check=True).stdout
    stream = json.loads(out)["streams"][0]
    w, h = stream["width"], stream["height"]
    rotacion = next((int(sd["rotation"]) for sd in stream.get("side_data_list", []) if "rotation" in sd), 0)
    if abs(rotacion) % 180 == 90:
        w, h = h, w
    return h > w


# ---------- Fase 1: transcripción ----------

def transcribir(job, d):
    destino = d / "transcript.json"
    if destino.exists():
        return _leer_json(destino)
    jobs.actualizar(job["id"], phase="transcription", progress=0.0)
    # Decodificamos con ffmpeg (evita incompatibilidades de PyAV) a 16 kHz mono float32
    raw = subprocess.run([config.FFMPEG, "-v", "error", "-i", str(d / "input.mp4"), "-ac", "1", "-ar", "16000",
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    audio = np.frombuffer(raw, dtype=np.float32)
    modelo = _modelo_whisper()
    origen = job.get("source_lang")
    if not origen:
        # transcribe() detecta el idioma al llamarlo, sin recorrer los segmentos (30 s bastan)
        _, info = modelo.transcribe(audio[:16000 * 30], language=None)
        origen = info.language
    if origen not in config.LANGUAGES:
        raise ValueError(f"Idioma detectado '{origen}' no soportado (solo es/en)")
    # La pista inicial es una frase bien puntuada en el idioma del audio (sin ella, en fragmentos cortos
    # Whisper a veces transcribe sin mayúsculas ni puntuación) más el glosario de nombres propios y jerga.
    glosario = job.get("glossary", "").strip()
    prompt = PISTA_ESTILO[origen] + (f" {glosario}." if glosario else "")
    segmentos, info = modelo.transcribe(audio, language=origen, initial_prompt=prompt,
                                        beam_size=5, vad_filter=True, condition_on_previous_text=True)
    resultado = []
    for i, s in enumerate(segmentos, 1):
        resultado.append({"i": i, "start": s.start, "end": s.end, "text": s.text.strip()})
        if i % 5 == 0:
            jobs.actualizar(job["id"], progress=round(min(s.end / info.duration, 1.0), 3))
    destino_lang = job.get("target_lang") or ("en" if origen == "es" else "es")
    jobs.actualizar(job["id"], source_lang=origen, target_lang=destino_lang)
    (d / "video.original.srt").write_text(srt_crudo(resultado), encoding="utf-8")
    _escribir_json(destino, resultado)
    return resultado


# ---------- Fase 2: revisión ----------

def revisar(job, d, segmentos):
    destino = d / "review.json"
    if destino.exists():
        return _leer_json(destino)
    jobs.actualizar(job["id"], phase="review", progress=0.0)
    idioma = config.LANGUAGES[job["source_lang"]][2]
    correcciones = llm.revisar(segmentos, idioma, job.get("topic", ""), job.get("glossary", ""),
                               job.get("original_filename", ""))
    _escribir_json(destino, correcciones)
    return correcciones


def aplicar_correcciones(segmentos, correcciones):
    por_indice = {c["index"]: c["text"] for c in correcciones}
    corregidos = []
    for s in segmentos:
        texto = por_indice.get(s["i"], s["text"])
        if texto:  # vacío = eliminado
            corregidos.append({**s, "text": texto})
    return corregidos


def informe_revision(d, segmentos, correcciones):
    por_indice = {s["i"]: s for s in segmentos}
    filas = ["# Revisión de la transcripción\n",
             "Las marcadas **REVISAR** son interpretaciones por contexto: conviene que las valide el cliente o un experto del tema.\n",
             "| Nº | Minuto | Whisper oyó | Corregido | Nivel | Motivo |", "|---|---|---|---|---|---|"]
    for c in sorted(correcciones, key=lambda c: c["index"]):
        s = por_indice[c["index"]]
        t = int(s["start"])
        nivel = "**REVISAR**" if c["level"] == "REVISAR" else "Seguro"
        filas.append(f"| {c['index']} | {t // 60:02d}:{t % 60:02d} | {s['text']} | "
                     f"{c['text'] or '*(eliminado)*'} | {nivel} | {c['reason']} |")
    (d / "revision_cambios.md").write_text("\n".join(filas) + "\n", encoding="utf-8")


def resumen_revision(segmentos, correcciones):
    inicio = {s["i"]: s["start"] for s in segmentos}
    return {"total": len(correcciones),
            "revisar": [{"index": c["index"], "time": round(inicio[c["index"]], 1), "text": c["text"],
                         "reason": c["reason"]} for c in correcciones if c["level"] == "REVISAR"]}


# ---------- Fase 3: traducción ----------

def traducir(job, d, corregidos):
    destino = d / "translation.json"
    if destino.exists():
        return {int(k): v for k, v in _leer_json(destino).items()}
    jobs.actualizar(job["id"], phase="translation", progress=0.0)
    traduccion = llm.traducir(corregidos, job["source_lang"], job["target_lang"], job.get("topic", ""),
                              job.get("glossary", ""), job.get("original_filename", ""),
                              progreso=lambda p: jobs.actualizar(job["id"], progress=round(p, 3)))
    _escribir_json(destino, traduccion)
    return traduccion


def construir_srts(job, d, corregidos, traduccion):
    origen, destino = job["source_lang"], job["target_lang"]
    cues_o = [(s["start"], s["end"], s["text"]) for s in corregidos]
    cues_d = []
    for s in corregidos:
        texto = traduccion.get(s["i"], "")
        if texto or not cues_d:
            cues_d.append((s["start"], s["end"], texto or s["text"]))
        else:  # fusionado con el anterior
            i0, _, t0 = cues_d[-1]
            cues_d[-1] = (i0, s["end"], t0)
    vertical = job.get("vertical", False)
    (d / f"video.{origen}.srt").write_text(componer_srt(cues_o, vertical), encoding="utf-8")
    (d / f"video.{destino}.srt").write_text(componer_srt(cues_d, vertical), encoding="utf-8")


# ---------- Fase 4: vídeo ----------

def _ffmpeg_con_progreso(args, cwd, job_id, total):
    proc = subprocess.Popen([config.FFMPEG, "-v", "error", "-progress", "pipe:1", "-nostats", *args], cwd=cwd,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    for linea in proc.stdout:
        if linea.startswith("out_time_us=") and total:
            try:
                jobs.actualizar(job_id, progress=round(min(int(linea.split("=")[1]) / 1e6 / total, 1.0), 3))
            except ValueError:
                pass
    if proc.wait() != 0:
        raise RuntimeError("ffmpeg falló: " + proc.stderr.read()[-2000:])


def renderizar(job, d):
    jobs.actualizar(job["id"], phase="rendering", progress=0.0)
    origen, destino = job["source_lang"], job["target_lang"]
    (tag_d, nombre_d, _), (tag_o, nombre_o, _) = config.LANGUAGES[destino], config.LANGUAGES[origen]
    multipista = d / "video_subtitulos_seleccionables.mp4"
    subprocess.run([config.FFMPEG, "-v", "error", "-y", "-i", "input.mp4", "-i", f"video.{destino}.srt",
                    "-i", f"video.{origen}.srt", "-map", "0:v", "-map", "0:a?", "-map", "1", "-map", "2",
                    "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text",
                    "-metadata:s:s:0", f"language={tag_d}", "-metadata:s:s:0", f"title={nombre_d}",
                    "-metadata:s:s:1", f"language={tag_o}", "-metadata:s:s:1", f"title={nombre_o}",
                    "-disposition:s:0", "default", multipista.name], cwd=d, check=True, capture_output=True)
    if job.get("burn", True):
        shutil.copy(d / f"video.{destino}.srt", d / "_burn.srt")  # nombre simple para el filtro subtitles
        estilo = config.SUBTITLE_STYLE_VERTICAL if job.get("vertical") else config.SUBTITLE_STYLE
        _ffmpeg_con_progreso(["-y", "-i", "input.mp4", "-vf", f"subtitles=_burn.srt:force_style='{estilo}'",
                              "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-c:a", "copy",
                              "-movflags", "+faststart", f"video_{destino.upper()}_subtitulado.mp4"],
                             d, job["id"], job.get("duration"))
        (d / "_burn.srt").unlink(missing_ok=True)


# ---------- Orquestación ----------

ARCHIVOS_SALIDA = ["video_{D}_subtitulado.mp4", "video_subtitulos_seleccionables.mp4", "video.{o}.srt",
                   "video.{d}.srt", "video.original.srt", "revision_cambios.md"]


def procesar(job_id):
    job = jobs.leer(job_id)
    d = jobs.carpeta(job_id)
    try:
        job = jobs.actualizar(job_id, status="processing", error=None)
        if not job.get("duration"):
            job = jobs.actualizar(job_id, duration=duracion(d / "input.mp4"), vertical=es_vertical(d / "input.mp4"))

        segmentos = transcribir(job, d)
        job = jobs.leer(job_id)
        correcciones = revisar(job, d, segmentos)
        informe_revision(d, segmentos, correcciones)
        job = jobs.actualizar(job_id, review_summary=resumen_revision(segmentos, correcciones))

        if job.get("review_required") and not job.get("approved"):
            job = jobs.actualizar(job_id, status="awaiting_review", phase="review", progress=1.0,
                                  files=_archivos(d, job))
            jobs.notificar(job)
            return

        corregidos = aplicar_correcciones(segmentos, correcciones)
        traduccion = traducir(job, d, corregidos)
        construir_srts(job, d, corregidos, traduccion)
        renderizar(job, d)
        job = jobs.actualizar(job_id, status="completed", phase="done", progress=1.0, files=_archivos(d, job))
    except Exception as e:
        log.exception("trabajo %s falló", job_id)
        job = jobs.actualizar(job_id, status="failed", error=f"{type(e).__name__}: {e}")
    jobs.notificar(job)


def _archivos(d, job):
    o, de = job.get("source_lang") or "", job.get("target_lang") or ""
    nombres = [n.format(o=o, d=de, D=de.upper()) for n in ARCHIVOS_SALIDA]
    return [n for n in nombres if (d / n).exists()]
