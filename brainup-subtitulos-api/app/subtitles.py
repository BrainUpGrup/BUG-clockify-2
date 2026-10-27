"""Formato profesional de subtítulos: 2 líneas como máximo, duración mínima 1 s.
Máx. 42 caracteres/línea en vídeo horizontal y 28 en vertical (Reels, TikTok, Shorts)."""
import re
from datetime import timedelta

import srt

MAX_LINEA_HORIZONTAL = 42
MAX_LINEA_VERTICAL = 28
MIN_DUR = 1.0

# Palabras que no deben quedar colgando al final de una línea o subtítulo
DEBILES = set("""a an the of to in on at by for and or but with from as that which is are
de del la el los las un una y o e en con por para que se su sus al lo""".split())


def _coste_corte(texto, i, limite):
    izq, der = texto[:i].rstrip(), texto[i:].strip()
    coste = abs(len(izq) - len(der))
    exceso = max(len(izq) - limite, 0) + max(len(der) - limite, 0)
    coste += 100 * exceso
    if re.search(r"[,;:.?!—]$", izq):
        coste -= 25
    if izq.split()[-1].lower() in DEBILES:
        coste += 30
    return coste


def _mejor_corte(texto, limite):
    espacios = [m.start() for m in re.finditer(" ", texto)]
    return min(espacios, key=lambda i: _coste_corte(texto, i, limite))


def _partir(inicio, fin, texto, max_cue):
    """Divide recursivamente un subtítulo largo, repartiendo el tiempo por caracteres."""
    if len(texto) <= max_cue or " " not in texto:
        return [(inicio, fin, texto)]
    i = _mejor_corte(texto, max_cue)
    a, b = texto[:i].strip(), texto[i:].strip()
    medio = inicio + (fin - inicio) * len(a) / (len(a) + len(b))
    return _partir(inicio, medio, a, max_cue) + _partir(medio, fin, b, max_cue)


def _dos_lineas(texto, max_linea):
    if len(texto) <= max_linea or " " not in texto:
        return texto
    i = _mejor_corte(texto, max_linea)
    return texto[:i] + "\n" + texto[i + 1:]


def componer_srt(cues, vertical=False):
    """cues: lista de (inicio_s, fin_s, texto). Devuelve el SRT como texto."""
    max_linea = MAX_LINEA_VERTICAL if vertical else MAX_LINEA_HORIZONTAL
    max_cue = max_linea * 2 - 4  # margen para poder partir en dos líneas sin pasarse
    trozos = []
    for ini, fin, txt in cues:
        trozos += _partir(ini, fin, txt, max_cue)
    for k, (ini, fin, txt) in enumerate(trozos):
        sig = trozos[k + 1][0] if k + 1 < len(trozos) else fin + MIN_DUR
        if fin - ini < MIN_DUR:
            fin = min(ini + MIN_DUR, sig - 0.04)
        trozos[k] = (ini, max(fin, ini + 0.3), txt)
    subs = [srt.Subtitle(n, timedelta(seconds=i), timedelta(seconds=f), _dos_lineas(t, max_linea))
            for n, (i, f, t) in enumerate(trozos, 1)]
    return srt.compose(subs)


def srt_crudo(segmentos):
    """SRT sin reformatear, tal como sale de Whisper."""
    return srt.compose([srt.Subtitle(s["i"], timedelta(seconds=s["start"]), timedelta(seconds=s["end"]), s["text"])
                        for s in segmentos])
