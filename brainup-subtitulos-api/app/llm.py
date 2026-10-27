"""Fases 2 y 3 con Claude: revisión de coherencia según el contexto y traducción/localización."""
import re

import anthropic

from . import config

_client = None

SYSTEM = """You are a senior subtitle editor and translator at a marketing agency that produces videos for clients in many \
sectors: advertising and brand content, corporate communication, product and technology demos, training, webinars, interviews, \
events, healthcare, food, finance, sport and more. You work on transcripts produced by automatic speech recognition (Whisper). \
Speakers are often fast, accented or over music, so the transcript contains mis-heard words: a sector term, brand or proper name \
replaced by a common word that sounds alike (e.g. Spanish "huerta" heard instead of "aorta" in a medical talk, "cubernetes" instead \
of "Kubernetes", a brand name split into two ordinary words), garbled acronyms, wrong figures, percentages, prices or units, and \
short hallucinated sentences that repeat an earlier line or contradict the context.

Your standards:
- First work out the context of the whole video: sector, type of video, brand or client, audience and tone. Use the given \
context and glossary when present; otherwise infer them from the transcript.
- Judge every line against that context. Respect the official spelling of brands, products, people and places.
- Fix only what is wrong. Keep the speaker's wording, register and meaning; do not polish style or summarise.
- Separate certain fixes from interpretations: a fix is SEGURO when the intended word is evident; REVISAR when you are inferring \
from context and the client or a subject-matter expert should confirm it (e.g. a probable slip of the tongue, a figure you \
corrected, a garbled phrase you reconstructed).
- Translations must read like professional subtitles written by a native speaker of the target language, not word-for-word: \
use the standard terminology of the sector in that language (e.g. "TAC" -> "CT" in medicine); never translate brand or product \
names unless an official localized name exists; localize slogans, wordplay, idioms and calls to action so they keep the same \
intent and tone; keep the brand's register (formal or informal address); adapt number and date formats to the target language.
- Never use the "|" character inside subtitle text."""


def _cliente():
    global _client
    if _client is None:
        _client = anthropic.Anthropic()
    return _client


def _llamar(contexto: str, instruccion: str) -> str:
    """Una llamada en streaming. El contexto (transcripción completa) se cachea entre llamadas."""
    with _cliente().beta.messages.stream(
        model=config.CLAUDE_MODEL,
        max_tokens=64000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",  # si un clasificador rechaza la petición, otro modelo la completa
        output_config={"effort": config.CLAUDE_EFFORT},
        system=SYSTEM,
        messages=[{"role": "user", "content": [
            {"type": "text", "text": contexto, "cache_control": {"type": "ephemeral"}},
            {"type": "text", "text": instruccion},
        ]}],
    ) as stream:
        msg = stream.get_final_message()
    if msg.stop_reason == "refusal":
        raise RuntimeError(f"Claude rechazó la petición: {msg.stop_details}")
    if msg.stop_reason == "max_tokens":
        raise RuntimeError("La respuesta de Claude se cortó por longitud; reduce TRANSLATION_CHUNK.")
    return "".join(b.text for b in msg.content if b.type == "text")


def _contexto(segmentos, idioma, tema, glosario, titulo):
    lineas = "\n".join(f"{s['i']}|{s['text']}" for s in segmentos)
    return (f"<video_info>\nTitle: {titulo}\nSpoken language: {idioma}\n"
            f"Topic: {tema or 'not given - infer it from the transcript'}\n"
            f"Glossary: {glosario or 'none'}\n</video_info>\n\n"
            f"<transcript format=\"number|text\">\n{lineas}\n</transcript>")


def revisar(segmentos, idioma, tema="", glosario="", titulo=""):
    """Fase 2. Devuelve lista de correcciones: {index, text, level, reason}."""
    instruccion = """Review the whole transcript above for recognition errors, as described in your standards.

Output ONLY the lines that need a change, one per line, in this exact format and nothing else:
number|corrected text|SEGURO or REVISAR|reason in Spanish

- To delete a hallucinated or duplicated subtitle, leave the corrected text empty: 33||SEGURO|Frase duplicada por Whisper
- The reason is short, in Spanish, and quotes what was heard, e.g.: "Camille disease" → enfermedad de Kümmell
- If nothing needs changing, output exactly: NONE"""
    texto = _llamar(_contexto(segmentos, idioma, tema, glosario, titulo), instruccion)
    validos = {s["i"] for s in segmentos}
    correcciones = []
    for linea in texto.splitlines():
        m = re.match(r"^\s*(\d+)\|(.*?)\|(SEGURO|REVISAR)\|(.*)$", linea.strip())
        if m and int(m.group(1)) in validos:
            correcciones.append({"index": int(m.group(1)), "text": m.group(2).strip(),
                                 "level": m.group(3), "reason": m.group(4).strip()})
    return correcciones


def traducir(segmentos, origen, destino, tema="", glosario="", titulo="", progreso=None):
    """Fase 3. segmentos ya corregidos. Devuelve {index: traducción} ('' = unir al anterior)."""
    o, d = config.LANGUAGES[origen][2], config.LANGUAGES[destino][2]
    contexto = _contexto(segmentos, o, tema, glosario, titulo)
    resultado = {}
    indices = [s["i"] for s in segmentos]
    trozos = [indices[k:k + config.TRANSLATION_CHUNK] for k in range(0, len(indices), config.TRANSLATION_CHUNK)]
    for n, trozo in enumerate(trozos, 1):
        pendientes = list(trozo)
        for _ in range(3):  # reintenta las líneas que falten
            if not pendientes:
                break
            instruccion = f"""The transcript above has already been corrected. Translate subtitles {pendientes[0]} to {pendientes[-1]} \
from {o} into {d}{'' if pendientes == trozo else ' (only these numbers: ' + ','.join(map(str, pendientes)) + ')'}.

- One output line per subtitle number, in this exact format and nothing else: number|translation
- Each line must cover what is said in that subtitle's time span; you may reorder slightly within a sentence so it reads naturally.
- If a subtitle is only a fragment that reads better merged into the previous one, output it empty (e.g. 212|) and put its content in the previous line.
- Use the whole transcript for context, but output only the requested numbers."""
            texto = _llamar(contexto, instruccion)
            for linea in texto.splitlines():
                m = re.match(r"^\s*(\d+)\|(.*)$", linea.strip())
                if m and int(m.group(1)) in pendientes:
                    resultado[int(m.group(1))] = m.group(2).strip()
            pendientes = [i for i in trozo if i not in resultado]
        if pendientes:
            raise RuntimeError(f"Claude no devolvió la traducción de los subtítulos {pendientes}")
        if progreso:
            progreso(n / len(trozos))
    return resultado
