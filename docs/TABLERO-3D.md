# Tablero de documentos · septiembre de 2026

La escena del mapa fue reemplazada por un tablero de corcho en Three.js. La dirección visual surge de las tres imágenes locales de `Inspo`: materiales físicos, papeles sujetos con chinches, marco de madera e iluminación cálida.

## Uso

- El corcho ocupa el 100% de la ventana: no hay títulos de aplicación, cabecera, navbar ni desplazamiento de la escena.
- Los siete países aparecen juntos desde 900 px. En pantallas menores se muestran cuatro, dos o un país, con flechas dibujadas en notas físicas para cambiar de grupo.
- Las hojas abren una ficha con el enlace a Google Docs. La firma se realiza en el documento externo.
- Cargar, buscar y alternar entre muestra y documentos son notas tridimensionales sujetas al mismo corcho. La búsqueda abre un fichero de papel.
- Cada columna muestra dos documentos. Si hay más, una nota "Más documentos" cambia las hojas visibles de la pila, sin scroll. Todos siguen disponibles en el fichero de búsqueda.
- Sin documentos guardados, se inicia una muestra identificada. Los ejemplos no se guardan ni tienen enlaces ficticios de firma. "Ver mis documentos" vuelve a los datos reales.
- Los documentos se sincronizan con Google Sheets vía Apps Script. Ver [`docs/APPS-SCRIPT.md`](APPS-SCRIPT.md).

## Materiales

Texturas de color, normales OpenGL y rugosidad de [Cork001](https://ambientcg.com/view?id=Cork001) y [Wood049](https://ambientcg.com/view?id=Wood049), de ambientCG, bajo [CC0](https://docs.ambientcg.com/license/). Archivos locales de 1K en `public/textures`; no requiere descargar materiales al navegar desde otra PC.

Papel impreso con fibras y cantos irregulares, hojas subdivididas y curvas, hojas de respaldo, cinta semitransparente, clips de alambre, chinches con vástago y cabeza, lápiz y pequeñas marcas en el corcho. Todos los controles visibles son geometría de la escena; botones HTML transparentes coincidentes permiten mouse, tacto y teclado. Materiales PBR, iluminación de entorno, luz direccional con sombras 4096 (2048 en celular), una luz focal de pool y una PointLight dinámica que sigue el puntero para resaltar metales y papel. Sin trazado de rayos.

## Mejoras visuales y de animación

### Pines de bandera por país

Cada etiqueta de país tiene un pin metálico con la bandera del país correspondiente dibujada en canvas 2D, posicionado en la esquina superior izquierda del título. Las banderas incluyen los siete países (Argentina, Bolivia, Chile, Ecuador, Paraguay, Perú, Uruguay) con detalles como el sol de mayo, estrellas y franjas. La geometría de la bandera tiene una ondulación horizontal sutil.

### Animación de cámara

- **Parallax por puntero**: la cámara sigue el mouse con suavizado exponencial (`1 - exp(-8·dt)`) en XY.
- **Zoom al hover**: al posarse sobre un documento, la cámara se acerca suavemente usando un ease más lento (`1 - exp(-0.75·dt)`) para un efecto cinematográfico. El zoom en Z es independiente del parallax para evitar sensación de brusquedad.
- **Lift del papel**: el documento bajo el cursor se eleva (`baseZ + 0.26`) con leve inclinación en X.
- **FOV**: se estrecha levemente al hacer hover (36° → 34.8°) con transición suave.
- **Luz de puntero**: una PointLight cálida sigue el mouse por el tablero generando reflejos en vivo sobre los pines metálicos y calidez difusa en el papel.
- Todos los efectos respetan `prefers-reduced-motion`.

### Distribución y padding

- Margen horizontal aumentado (1.15 en desktop, 0.85 en mobile) para más aire en los bordes.
- Etiquetas de país bajadas a Y=4.35 y notas de control subidas a Y=-4.45 para separar el contenido del marco.
- Notas de control (+ Documento, Buscar, Muestra) desplazadas hacia el centro para no recortarse durante el zoom.

## Rendimiento

- Cork, madera y fibras cacheados en `useRef` — no se recrean en cada rebuild de escena.
- `shadowMap.autoUpdate = false` — sombras calculadas una sola vez tras la construcción.
- 34 marcas de pinholes como un único `InstancedMesh` (1 draw call).
- Texturas de documentos generadas solo para las dos hojas visibles de cada pila; se descartan al ocultarse.
- Presupuesto de píxeles: 3 MP en mobile, 9 MP en desktop.

## Verificación

`npm run build`

`node scripts/check-board.mjs` ejecuta una prueba de navegador aislada con Edge instalado. La variable `BOARD_URL` permite seleccionar otro puerto (por defecto 5175). Comprueba apertura, Escape, carga, persistencia, enlace, eliminación, búsqueda, viewport completo, ausencia de navegación externa y scroll, y controles de celular. Guarda capturas en `artifacts`. Usa un contexto de navegador nuevo y no toca los documentos del navegador del usuario.

Los documentos anteriores de continuidad describen la versión del mapa y quedan como historial; este archivo describe la interfaz actual.
