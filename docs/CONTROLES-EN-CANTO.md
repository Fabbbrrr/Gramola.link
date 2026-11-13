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

## Cómo se comprueba

El gráfico del diseño canta solo (`q:'good'`), así que se puede medir sin micro: dejarlo cantar, rebobinar 10 s y
mirar `now`, el total y la racha antes y después — y que el total vuelva a subir después. Está en
`tools/medir-rebobinado.py`.
