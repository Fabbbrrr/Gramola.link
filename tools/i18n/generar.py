#!/usr/bin/env python3
"""generar.py — convierte los inventarios en los diccionarios que carga cada pantalla.

    python3 tools/i18n/generar.py            # regenera web/js/i18n/*.js
    python3 tools/i18n/generar.py --check    # dice cuánto queda sin traducir (y sale 1 si falta algo)

No editar los diccionarios a mano: se regeneran. Las cadenas se sacan con tools/i18n/extraer.py.
"""
import json, os, re, sys

try: sys.stdout.reconfigure(encoding='utf-8')
except Exception: pass

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SALIDA = os.path.join(RAIZ, 'web', 'js', 'i18n')
PANTALLAS = ['tv', 'm', 'site', 'admin']

CABECERA = '/* GENERADO por tools/i18n/generar.py — no editar a mano.\n   Fuente: tools/i18n/inventario-%s.json. Vacío = se queda en castellano. */\n'


def generar(clave, check):
    ruta = os.path.join(RAIZ, 'tools', 'i18n', f'inventario-{clave}.json')
    if not os.path.exists(ruta):
        print(f'{clave:6s} sin inventario'); return 0, 0
    inv = json.load(open(ruta, encoding='utf-8'))
    rellenas = {k: v for k, v in inv.items() if v.strip()}
    sin = len(inv) - len(rellenas)
    if not check:
        os.makedirs(SALIDA, exist_ok=True)
        with open(os.path.join(SALIDA, f'{clave}.js'), 'w', encoding='utf-8', newline='\n') as f:
            f.write(CABECERA % clave)
            f.write('window.I18N.cargar(' + json.dumps(rellenas, ensure_ascii=False, sort_keys=True) + ", {idioma: 'en'});\n")
    print(f'{clave:6s} {len(rellenas):4d} con traducción, {sin:4d} vacías')
    return len(rellenas), sin


if __name__ == '__main__':
    check = '--check' in sys.argv
    vac = tot = 0
    for c in PANTALLAS:
        n, s = generar(c, check); tot += n; vac += s
    if check:
        print(f'TOTAL: {tot} traducidas, {vac} vacías')
        sys.exit(1 if vac else 0)
