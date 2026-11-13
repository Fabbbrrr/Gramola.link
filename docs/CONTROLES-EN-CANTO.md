# Controles en la pantalla de canto

Pedidos: poder parar, volver y rebobinar 10 o 30 segundos durante una canción, con el ratón.

## Lo que ya estaba

La pausa existe: `back` abre el menú de pausa (Seguir · Reiniciar canción · Ajustes de audio · Salir) y se
recorre con arriba/abajo + OK. `Salir` va a la lista de canciones (decisión del diseño, se queda igual).
Con teclado va `Esc`/`Backspace`/`P`/`M`; con mando, `B` o `Menu`; con el móvil, `←`.

Lo que no estaba: **el ratón**. La pantalla de canto se pinta entera por canvas, así que no tiene ni un `onClick`
donde hacer clic — el resto de pantallas sí. Y no había forma de rebobinar.

## Decisión

| | Decisión | Coste |
|---|---|---|
| Dónde | Una tira de tres botones (⟲10 ⟲30 ⏸) que monta el puente, abajo a la derecha, solo durante el canto. Nada en `diseno/`. | Es un apaño por encima del diseño, no parte de él; si el diseño mete sus propios controles, este se quita. |
| Rebobinado | **Recalcular desde el punto al que se va.** Las notas que se vuelvan a cantar borran su marcador y sus muestras; lo que queda por delante del punto nuevo conserva lo que ya tenía. | Hay que rehacer total, racha, mejor racha y doradas — y hacerlo con las mismas reglas que `update()`, o los números mentirán. |
| Audio y vídeo | Se dejan hacer la zancada solos: el puente ya corrige cuando el desvío pasa de 0,3 s. | Tarda un frame o dos en sentarse; se comprueba, no se afirma. |
| `tug` y `leader` (duelo) | Se dejan como están: se recalculan solos cantando. | La barra del duelo no vuelve atrás; es lo único que no se recalcula. |

## Qué se borra al rebobinar y qué no

- Notas que terminan **después** del punto nuevo: `done=false` y sus `sl[k]` a cero (se vuelven a cantar y se vuelven
  a puntuar). Frases: `done=false`, para que suelte su veredicto otra vez.
- Total, racha, mejor racha y doradas: se recalculan desde cero con las notas que quedan **antes** del punto nuevo,
  con la regla de siempre (`r > 0,6` suma racha; dorada cuenta si `r > 0,6`).
- Historial de tono, `lastP`, `lastEnd`, `lastMine` y los avisos (`pops`) posteriores al punto: fuera, si no dibujan
  el futuro.
- `disp` (el total animado) se lo lleva la animación sola hacia el número nuevo.

## Lo que falló la primera vez (y por qué)

La primera versión movía `c.now` y borraba marcas. En la tele salía «Fallo» al pulsar ⟲10 o ⟲30.

**Causa:** `c.now` no manda. `G.update()` lo escribe en cada frame desde el reloj del audio (`c.now = audioNow()`),
`gramola-bridge.js:1350`. Así que el reloj no volvía atrás, pero las marcas sí se borraban: cada frase que se cerraba
después se juzgaba con cero aciertos y soltaba «Fallo». Es decir, se rompía la puntuación sin rebobinar nada.

**Arreglo:** se mueve el audio (`G.audio.currentTime`, desplazado la misma cantidad que ve el reloj), se suelta el
suavizado (`G.clock.playing = false`) para que enganche de golpe, y el recálculo copia las reglas de `G.update()` al
cerrar una nota: `r > 0,6` para racha, doradas, y la propina de vibrato con su tope de 10.000.

## Medido

Con un audio falso al que se le pone `currentTime` (así corre el `G.update` de verdad, sin micro ni altavoces):

| Momento | Reloj | Notas cerradas | Total (A/B) | «Fallo» |
|---|---|---|---|---|
| 42 s cantando | 42 | 42 | 603 / 541 | 0 |
| tras ⟲30 | 12 | 0 | 0 / 0 | 0 |
| +6 s | 18 | 0 | 0 / 0 | 0 |
| +20 s | 38 | 36 | 499 / 433 | 0 |

El cero de las filas de 12 y 18 s es correcto: la primera nota de la canción empieza en el segundo 18,8 (intro larga),
así que ahí no hay nada que puntuar. Rebobinar 10 s desde el segundo 40 deja el total en 287/312 y vuelve a subir al
volver a cantar el trozo (395 → 603). Rebobinar más atrás del principio se queda en 0.

Sin comprobar en un aparato de verdad con voz real: el camino del micrófono (`frames`), que solo cambia en que las
muestras llegan con retraso.

## Cómo se comprueba

El gráfico del diseño canta solo (`q:'good'`), así que se puede medir sin micro: dejarlo cantar, rebobinar 10 s y
mirar `now`, el total y la racha antes y después — y que el total vuelva a subir después. Está en
`tools/medir-rebobinado.py`.
