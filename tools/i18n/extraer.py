#!/usr/bin/env python3
"""extraer.py — saca las cadenas visibles de cada pantalla y deja el inventario para rellenar.

    python3 tools/i18n/extraer.py            # regenera todos los inventarios
    python3 tools/i18n/extraer.py --check    # dice cuánto queda sin traducir

Las claves son la cadena en castellano (docs/I18N.md). La traducción se deja vacía para quien la rellene.
"""
import json, os, re, sys

# La consola de Windows arranca en cp1252 y se cae al imprimir una tilde.
try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

PANTALLAS = {
    'tv':   ['diseno/Gramola TV.dc.html', 'web/tv/gramola-bridge.js'],
    'm':    ['web/m/index.html', 'web/m/m.js'],
    'site': ['web/index.html'],
    'admin':['web/admin/index.html', 'web/admin/admin.js', 'web/admin/editor.js'],
}

# Cadena con pinta de ser para el usuario: letras, y espacio o tilde o palabra usual
LIT = re.compile(r"""(?<![\\w$])(['"`])([^'"`\n]{3,160})\1""")
TXT = re.compile(r""">\s*([^<>{}\n]{3,160}?)\s*<""")
DEBE = re.compile(r"[áéíóúñüÁÉÍÓÚÑÜ¿¡]")
ES = re.compile(r"\b(pulsa|pulsar|canci|cantar|canta|letra|pantalla|ajustes|volver|instalar|sala|código|"
                r"jugador|equipo|puntos|nota|notas|melod|lista|buscar|búsqueda|resultados|marcador|ruleta|"
                r"racha|salón|sala|créditos|barra|cortina|iris|fundido|apagón|retraso|volumen|estela|tamaño|"
                r"expulsar|prepárate|cantantes|mejores|dúo|duelo|jukebox|aforo|micrófono|mand|emparejar|"
                r"salir|entrar|empezar|listo|pista|sinfon|nota|aguanta|susurra|bailando|acento|ver la letra)\b", re.I)
NO = re.compile(r"^(#[0-9a-f]{3,8}|[a-z-]+:[-0-9a-z. %;]+|[\w./-]+\.(js|css|png|jpg|svg|woff2?|mp3|mp4|json|html)|"
                r"[A-Z_]{2,}|[a-z][\w-]*:[\w %-]+)$")
# Trozos de código que el repaso saca como si fueran texto: empiezan por operador o llevan forma de expresión.
RUIDO = re.compile(r"^[)\]\[}{+\-*/&|!<>]|=>|\.\w+\(|\bcharAt\b|toLowerCase|\breturn\b|^\W+$|&&|\|\|")


def visible(s):
    s = s.strip()
    if len(s) < 3 or NO.match(s) or RUIDO.search(s): return False
    if not re.search(r"[A-Za-zÁÉÍÓÚÑáéíóúñ]", s): return False
    # una cadena suelta sin espacio solo cuenta si lleva tilde o es palabra española suelta
    if ' ' not in s and not DEBE.search(s) and not ES.match(s + ' '): return False
    return bool(DEBE.search(s) or ES.search(s))


def de_fichero(rel):
    p = os.path.join(RAIZ, rel.replace('/', os.sep))
    if not os.path.exists(p): return []
    s = open(p, encoding='utf-8').read()
    out = []
    for m in LIT.finditer(s): out.append(m.group(2))
    for m in TXT.finditer(s): out.append(m.group(1))
    return [x.strip() for x in out if visible(x)]


def inventario(clave):
    cadenas = set()
    for rel in PANTALLAS[clave]: cadenas |= set(de_fichero(rel))
    return {c: '' for c in sorted(cadenas)}


if __name__ == '__main__':
    check = '--check' in sys.argv
    total = sin = 0
    for clave in PANTALLAS:
        inv = inventario(clave)
        ruta = os.path.join(RAIZ, 'tools', 'i18n', f'inventario-{clave}.json')
        if check:
            viejo = json.load(open(ruta, encoding='utf-8')) if os.path.exists(ruta) else {}
            sin += sum(1 for k in inv if k in viejo and not viejo[k])
            total += len(viejo)
            print(f'{clave:6s} {len(viejo):4d} en el inventario, {sin:4d} sin traducir')
        else:
            viejo = json.load(open(ruta, encoding='utf-8')) if os.path.exists(ruta) else {}
            merged = {k: viejo.get(k, '') for k in inv}          # lo traducido se conserva, lo nuevo entra vacío
            for k, v in viejo.items():                            # y lo que ya no está en el código sale
                if k in inv: merged[k] = v
            json.dump(merged, open(ruta, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
            print(f'{clave:6s} {len(merged):4d} cadenas → {os.path.relpath(ruta, RAIZ)}')
    if check: print(f'TOTAL: {total - sin}/{total} traducidas')
