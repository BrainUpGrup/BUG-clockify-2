# API de subtitulado y traducción de vídeos

Servicio HTTP que recibe un vídeo de **cualquier sector** (publicidad, corporativo, producto, formación, salud,
gastronomía, finanzas, eventos…) y devuelve subtítulos profesionales traducidos (castellano ↔ inglés):

1. **Transcripción**: Whisper large-v3 (local, sin coste por uso).
2. **Revisión de coherencia**: Claude deduce el contexto (sector, marca, tipo de vídeo) y corrige lo mal oído: jerga del sector, marcas y nombres propios, cifras ("huerta" → aorta, "cubernetes" → Kubernetes, una marca partida en dos palabras…). Marca como `REVISAR` lo que debe validar el cliente o un experto.
3. **Traducción y localización**: Claude, con la terminología del sector en el idioma destino, sin traducir marcas, adaptando eslóganes, llamadas a la acción y tono de marca.
4. **Vídeo**: ffmpeg genera el vídeo con subtítulos quemados y otro con pistas seleccionables.

Documentación interactiva (Swagger) en `http://localhost:8000/docs` con el servidor arrancado.

## Arrancar en local

Requisitos: Python 3.12 y ffmpeg en el PATH.

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows  (Linux/Mac: source .venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env          # y rellena ANTHROPIC_API_KEY y API_KEYS
uvicorn app.main:app --env-file .env --port 8000
```

La primera transcripción descarga el modelo de Whisper (~3 GB) si no está ya en caché.

## Con Docker

```bash
docker build -t brainup-subtitulos .
docker run -p 8000:8000 --env-file .env -v brainup-data:/data brainup-subtitulos
```

En un servidor con GPU NVIDIA: `--gpus all` y en `.env` `WHISPER_DEVICE=cuda`, `WHISPER_COMPUTE_TYPE=float16`
(la transcripción pasa de ~1x la duración del vídeo a unos segundos por minuto).

## Autenticación

Todas las rutas salvo `/health` exigen la cabecera `X-API-Key` con una de las claves de `API_KEYS`.
Llama a esta API **desde el backend del hub**, nunca desde el navegador, para no exponer la clave.

## Flujo de uso

```
POST /jobs (vídeo) ──► queued ──► processing ──► completed ──► GET /jobs/{id}/files/{nombre}
                                       │
                         (si review_required=true)
                                       ▼
                               awaiting_review ── PUT /review (opcional) ── POST /approve ──► processing ...
```

| Método | Ruta | Para qué |
|---|---|---|
| `POST` | `/jobs` | Sube el vídeo (multipart) y crea el trabajo. Devuelve `202` con el `id`. |
| `GET` | `/jobs/{id}` | Estado, fase (`transcription`, `review`, `translation`, `rendering`), progreso 0–1, idiomas, archivos, resumen de puntos `REVISAR`. |
| `GET` | `/jobs` | Lista de trabajos (más recientes primero). |
| `GET` | `/jobs/{id}/review` | Transcripción y correcciones propuestas. |
| `PUT` | `/jobs/{id}/review` | Sustituye las correcciones (solo en `awaiting_review`). |
| `POST` | `/jobs/{id}/approve` | Aprueba la revisión y continúa con traducción y vídeo. |
| `POST` | `/jobs/{id}/retry` | Reintenta un trabajo `failed` desde la fase en que falló. |
| `GET` | `/jobs/{id}/files/{nombre}` | Descarga un resultado (nombres en `files` del trabajo). |
| `DELETE` | `/jobs/{id}` | Borra el trabajo y sus archivos. |
| `GET` | `/health` | Comprobación de vida (sin clave). |

### Campos de `POST /jobs` (multipart/form-data)

| Campo | Obligatorio | Descripción |
|---|---|---|
| `file` | sí | El vídeo. |
| `source_lang` | no | `es` o `en`. Vacío = se detecta. |
| `target_lang` | no | `es` o `en`. Vacío = el idioma contrario. |
| `topic` | no | Contexto: cliente/marca, sector, tipo de vídeo y tono (mejora mucho la revisión y la traducción): "Anuncio de zapatillas de running, marca Nike, tono cercano". |
| `glossary` | no | Nombres propios y jerga esperada, separados por comas: "Nike, Pegasus 41, ZoomX". Mejora la transcripción. |
| `review_required` | no | `true` para pausar tras la revisión y que el cliente o un experto la valide. Defecto `false`. |
| `burn` | no | `false` para no generar el vídeo con subtítulos quemados. Defecto `true`. |
| `callback_url` | no | El servicio hará `POST` con el JSON del trabajo al terminar, fallar o quedar en `awaiting_review`. |

### Archivos de salida

| Archivo | Contenido |
|---|---|
| `video_ES_subtitulado.mp4` / `video_EN_subtitulado.mp4` | Subtítulos quemados en el idioma destino. |
| `video_subtitulos_seleccionables.mp4` | Vídeo original con dos pistas de subtítulos (destino por defecto + original). |
| `video.es.srt`, `video.en.srt` | Subtítulos corregidos y formateados (máx. ~42 caracteres/línea, 2 líneas). |
| `video.original.srt` | Transcripción tal cual salió de Whisper. |
| `revision_cambios.md` | Informe de correcciones con minuto y nivel. |

Al descargar, el nombre se adapta al del vídeo original (`caso.mp4` → `caso_ES_subtitulado.mp4`).

## Ejemplo de integración (backend del hub, TypeScript)

```ts
const API = process.env.SUBTITULOS_API_URL!;           // p. ej. http://subtitulos:8000
const headers = { "X-API-Key": process.env.SUBTITULOS_API_KEY! };

// 1. Crear el trabajo
const form = new FormData();
form.append("file", videoBlob, "caso.mp4");
form.append("topic", "Webinar de producto SaaS de facturación, tono profesional");
form.append("glossary", "FacturaPro, dashboard, Verifactu");
form.append("target_lang", "en");
form.append("callback_url", "https://hub.tuagencia.example/webhooks/subtitulos");
const job = await (await fetch(`${API}/jobs`, { method: "POST", headers, body: form })).json();

// 2. Consultar el estado (o esperar al callback)
const estado = await (await fetch(`${API}/jobs/${job.id}`, { headers })).json();
// estado.status: queued | processing | awaiting_review | completed | failed
// estado.phase, estado.progress (0-1), estado.review_summary.revisar (puntos a validar)

// 3. Descargar
const video = await fetch(`${API}/jobs/${job.id}/files/video_EN_subtitulado.mp4`, { headers });
```

Con cURL:

```bash
curl -H "X-API-Key: TU_CLAVE" -F "file=@caso.mp4" -F "topic=Vídeo corporativo de una cadena de restaurantes" http://localhost:8000/jobs
```

## Notas de funcionamiento

- **Vídeos verticales** (Reels, TikTok, Shorts): se detectan solos (incluida la rotación de los móviles). Usan líneas más cortas (28 caracteres) y los subtítulos van más arriba para no quedar bajo los botones de la app. El estilo se cambia con `SUBTITLE_STYLE_VERTICAL` / `SUBTITLE_STYLE` (tipografía y colores de marca, formato ASS).
- **Un vídeo cada vez**: hay un único worker porque Whisper y ffmpeg usan toda la máquina. Los demás esperan en cola (`queued`).
- **Persistencia**: todo se guarda en `DATA_DIR/jobs/<id>/`. Si el servicio se reinicia, los trabajos pendientes continúan donde se quedaron.
- **Coste de Claude**: revisión + traducción de un vídeo de 40 min ronda unos pocos dólares con `claude-opus-5-5` (la transcripción completa se envía en caché entre llamadas). Ajustable con `CLAUDE_MODEL` y `CLAUDE_EFFORT`.
- **Respaldo ante rechazos**: si un filtro de seguridad de Claude rechazara un texto legítimo (p. ej. contenido médico o de seguridad), la petición se reintenta automáticamente con otro modelo (`fallbacks: "default"`).
- **Límites**: solo castellano e inglés; no se traduce el texto de las diapositivas.

## Prueba rápida sin gastar créditos

```bash
python tests/smoke_test.py ruta/a/un_video_corto.mp4
```

Levanta la API real con Whisper y ffmpeg, simula a Claude y recorre todo el flujo (incluida la revisión manual).
