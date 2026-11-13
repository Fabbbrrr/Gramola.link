# Quitar la voz

Pedido: quitar la voz de las canciones **mientras suenan, si se quiere**, «sin romper la música». Después: si se
puede, dejar el trabajo hecho de antemano en el servidor.

## Lo que hay, en dos caminos (y el bueno manda)

| | Cómo | Calidad | Coste |
|---|---|---|---|
| **1. Pista pre-procesada** (`sin-voz.mp3` en la carpeta de la canción) | Demucs `htdemucs` separa la voz del resto **una vez**; se guarda la música sin la voz. La tele pone ese fichero al empezar la canción. | Es separación de verdad: la música se queda entera. Es también la voz que usa el editor del admin, así que lo que se oye cantar y lo que se quita son la misma separación. | 20 s por canción en la 3090 (medido, 4 min de audio), ~4–6 min en CPU. Una vez. Después: cero en la partida, y el fichero se puede adelantar y rebobinar como cualquier mp3. |
| **2. Filtro en vivo** (`web/tv/quita-voces-worklet.js`) | STFT de 1024 (21 ms), separa cada bin en centro `(L+R)/2` y lado `(L−R)/2`, y baja **solo el centro**, con la banda de la voz (140 Hz–11 kHz), con peso por lo iguales que sean los dos canales, suelo por bin y guardia de mono. | Es un filtro, no una separación: baja lo centrado, y con la voz se va lo que comparta banda y centro (caja, coros, guitarra al centro). Sirve para salir del paso en una canción sin pre-procesar. | ~1 % de un núcleo (medido en node), 21 ms de retardo (el reloj de la letra lo descuenta). |

Regla que queda en el puente:

- Ajuste puesto **y** `sin-voz.mp3` existe al empezar la canción → se pone esa pista y **no** se procesa nada.
- Ajuste puesto y no hay pista → filtro en vivo, y se puede encender y apagar a mitad de canción.
- Si suena la pista sin voz, el ajuste no la puede cambiar a mitad: avisa («La voz vuelve en la próxima canción»).

El ajuste es `voz` en los ajustes guardados: 0 = No, 1 = Suave, 2 = Fuerte. Está en **Pausa → Ajustes de audio**
(cuarta fila), que es donde uno lo busca cuando está cantando.

## Lo medido (y lo que no)

`node tools/medir-quita-voces.mjs` ejecuta **el mismo fichero** que sirve la tele (no una copia) con un apaño de
AudioWorklet, y mide con el chart UltraStar de cada canción: la energía de la banda de voz **donde el cantante canta**
frente a **los huecos instrumentales**. Así se separa «quitar la voz» de «destrozar la canción».

Pruebas sintéticas (lo que tiene que pasar por construcción):

| Prueba | Resultado |
|---|---|
| Sin filtro, la señal sale idéntica (solo retrasada) | error −147 dB, retardo 1023 muestras (21,3 ms) |
| Tono de 1 kHz centrado, nivel fuerte | −24,4 dB |
| Tono de 500 Hz duro a la izquierda (mismo caso) | −0,0 dB (no se toca) |
| Bajo de 60 Hz centrado | −0,0 dB (la banda lo protege) |
| Nivel suave / fuerte sobre un tono centrado | −10,5 / −24,4 dB, el lado quieto en los dos |
| Fichero **mono** (guardia) | −0,00 dB: no se queda hueco |

Canciones de verdad (chart de la propia biblioteca, ventana alrededor de la primera frase):

| Canción | Filtro en vivo, fuerte: canta / huecos | `sin-voz.mp3`: canta / huecos |
|---|---|---|
| Adele – Rolling In The Deep | −7,2 / **−9,1 dB** | −8,4 / **−0,3 dB** |
| Lady GaGa – Bad Romance | −6,7 / −5,2 dB | (pendiente del lote) |
| Queen – We Will Rock You | −5,4 / −2,5 dB | (pendiente del lote) |

Cómo se lee: el filtro en vivo baja la banda de voz donde canta… y casi lo mismo en los huecos, que es donde solo hay
música. Eso es lo que se oye como «hueco» o «raro». La pista pre-procesada hace lo contrario: baja donde canta y deja
la música quieta (−0,3 dB). Es la diferencia entre un filtro y una separación, y es la razón del pre-procesador.

Lo que **no** está medido:

- No hay oído en estas pruebas. El número dice cuánta energía sale de la banda de voz; si el resultado suena bien
  (o si Demucs deja un resto de voz audible en un tema concreto) hay que escucharlo: `--wav` deja el original y el
  procesado en `_scratch/` para comparar.
- El coste medido es de este PC en node, no de la tele: en una tele lenta el 1 % de núcleo puede ser más, y no se ha
  probado en la tele.
- El filtro solo cubre la canción normal (y la vista previa del editor). El **Megamix** no lo lleva.

## El pre-procesador

```bash
# ¿qué falta?
python tools/quitar-voz.py --carpeta web/songs --listar
# todas las que falten (se puede cortar y volver a lanzar: las hechas se saltan)
python tools/quitar-voz.py --carpeta web/songs
# una sola, o rehacer una que ya estaba
python tools/quitar-voz.py --carpeta web/songs --cancion "Queen - We Will Rock You" --forzar
```

Deja en cada carpeta `sin-voz.mp3` (192 kbps estéreo) y `sin-voz.json` con el modelo, el dispositivo y el fichero de
origen (tamaño y fecha): si el mp3 cambia, la próxima pasada lo rehace.

Necesita `torch`, `torchaudio`, `demucs` y `ffmpeg`. En esta máquina están en el entorno
`C:\Users\lai\Documents\workspace\.venvs\gramola-voz` (torch 2.14 con CUDA, demucs 4.1). En el servidor Ubuntu, el
mismo entorno que el trabajador (ver `tools/trabajador/LEEME.md`); allí `device()` ahora también usa CUDA si la hay.

El trabajador (`tools/trabajador/crear.py`) deja el `sin-voz.mp3` **en la misma pasada** en la que separa la voz para
el editor: no cuesta una segunda separación.

## Ficheros

- `web/tv/quita-voces-worklet.js` — el filtro (AudioWorklet, sin dependencias).
- `web/tv/gramola-bridge.js` — carga el filtro, lo mete en el grafo de la canción, elige la pista sin voz, y suma su
  retardo al reloj de la letra.
- `tools/build-tv.py` — la fila «Quitar voces» del menú de audio de la pausa (el diseño no se toca).
- `server/server.js` — `sinVoz` en la lista de canciones cuando el fichero está.
- `tools/quitar-voz.py` — el pre-procesador.
- `tools/medir-quita-voces.mjs` — el banco de pruebas.
