"""Prueba de humo de la API completa: Whisper y ffmpeg reales, Claude simulado (no gasta créditos).

Uso (desde la raíz del proyecto):
    python tests/smoke_test.py RUTA_A_UN_VIDEO_CORTO.mp4
"""
import json
import os
import sys
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

CLIP = sys.argv[1]
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="bu_smoke_")
os.environ["API_KEYS"] = "test-key"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app import llm  # noqa: E402

llm.revisar = lambda segs, *a, **k: [
    {"index": 2, "text": segs[1]["text"] + " [corregido]", "level": "REVISAR", "reason": "prueba"}]
llm.traducir = lambda segs, o, d, *a, progreso=None, **k: {s["i"]: f"[{d}] {s['text']}" for s in segs}

import uvicorn  # noqa: E402

from app.main import app  # noqa: E402

srv = uvicorn.Server(uvicorn.Config(app, port=8765, log_level="warning"))
threading.Thread(target=srv.run, daemon=True).start()
time.sleep(3)
B, H = "http://127.0.0.1:8765", {"X-API-Key": "test-key"}


def req(method, path, data=None, headers=None):
    r = urllib.request.Request(B + path, data=data, method=method, headers={**H, **(headers or {})})
    with urllib.request.urlopen(r) as resp:
        return resp.status, resp.read()


def esperar(jid, estados):
    while True:
        j = json.loads(req("GET", f"/jobs/{jid}")[1])
        if j["status"] in estados:
            return j
        time.sleep(3)


try:
    urllib.request.urlopen(B + "/jobs")
    print("ERROR: sin clave no dio 401")
except urllib.error.HTTPError as e:
    print("sin clave ->", e.code)

bnd = uuid.uuid4().hex
partes = [f'--{bnd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
          for k, v in {"topic": "Caso clínico de radiología", "review_required": "true"}.items()]
partes.append(f'--{bnd}\r\nContent-Disposition: form-data; name="file"; filename="caso prueba.mp4"\r\n'
              f'Content-Type: video/mp4\r\n\r\n'.encode() + Path(CLIP).read_bytes() + b"\r\n")
partes.append(f"--{bnd}--\r\n".encode())
st, body = req("POST", "/jobs", b"".join(partes), {"Content-Type": f"multipart/form-data; boundary={bnd}"})
jid = json.loads(body)["id"]
print("POST /jobs ->", st)

j = esperar(jid, {"awaiting_review", "failed", "completed"})
print("tras revisión ->", j["status"], j["source_lang"], "->", j["target_lang"], "| resumen:", j["review_summary"],
      "| error:", j["error"])
rev = json.loads(req("GET", f"/jobs/{jid}/review")[1])
print("transcripción:", len(rev["transcript"]), "frases; 1ª:", rev["transcript"][0]["text"][:80])

nuevas = json.dumps([{"index": 1, "text": rev["transcript"][0]["text"], "level": "SEGURO",
                      "reason": "editado a mano"}]).encode()
print("PUT review ->", req("PUT", f"/jobs/{jid}/review", nuevas, {"Content-Type": "application/json"})[0])
print("approve ->", req("POST", f"/jobs/{jid}/approve")[0])
j = esperar(jid, {"failed", "completed"})
print("final ->", j["status"], "| error:", j["error"])
for f in j["files"]:
    st, data = req("GET", f"/jobs/{jid}/files/{urllib.parse.quote(f)}")
    print(f"  GET {f} -> {st}, {len(data)} bytes")
print(req("GET", f"/jobs/{jid}/files/video.{j['target_lang']}.srt")[1].decode()[:300])
srv.should_exit = True
