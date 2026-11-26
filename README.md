# Radio VI

Selector web con 24 emisoras en **Radio**, The Sniper of La Perle en **Bajo Demanda**, y Los Diozes FM y Huelintown FM en **Extra Radio**. Las dos emisoras extra barajan sus pistas al abrir o recargar la página y mantienen ese orden mientras la página siga abierta. Usa HTML, CSS y JavaScript, sin paso de compilación.

## Abrir en local

Desde la carpeta del proyecto, ejecuta `python serve.py` y abre [Radio VI](http://127.0.0.1:4174/). El servidor permite que el navegador lea por tramos las emisiones largas y retome la reproducción donde la dejaste.

- Cambia de emisora con ← y →, el stick izquierdo hacia los lados, L1 y R1, las flechas visibles o un gesto horizontal.
- Arrastra hacia arriba para acceder a **Extra Radio** y hacia abajo para escuchar The Sniper of La Perle en **Bajo Demanda**. También puedes elegir la sección con un clic, con ↑ y ↓ o con el stick derecho.
- En **Extra Radio** puedes cambiar entre Los Diozes FM y Huelintown FM. Al intentar sintonizar un hueco vacío en **Extra Radio** o **Bajo Demanda**, el carrusel vuelve al centro y suena el efecto de sintonía.
- Selecciona una emisora para escucharla. Las flechas y L1/R1 también reproducen el efecto de sintonía.
- La radio arranca apagada. Pulsa **Encender**, espacio o ✕ en el mando para empezar a escuchar. Las tres secciones comparten el encendido y cada emisora conserva su posición.
- La barra L1/R1 indica la posición y permite saltar a cualquier entrada.
- La barra inferior muestra el tiempo transcurrido y la duración, y permite buscar dentro de la pista. Pulsa L2 o R2 para cambiar de canción con el efecto de sintonía, y △ o **LISTAS** para abrir los temas de la emisora con el sonido del menú.
- Pulsa □ o **VOLUMEN** para ajustar el nivel de la música y de los efectos. El icono de altavoz silencia y recupera el último nivel.
- En **VOLUMEN**, la cruceta ajusta el nivel en pasos de 5 puntos porcentuales y el stick izquierdo en pasos de 1 punto. El stick acelera al mantenerlo inclinado. Cierra el menú para volver a sintonizar con la cruceta o con L1 y R1.
- En **LISTAS**, arrastra el icono L o usa el stick izquierdo, las flechas o la rueda del ratón para avanzar de canción en canción. Pulsa ✕, Enter o haz clic en una canción para reproducirla.
- Pulsa ◯ o **SALIR** para cerrar **LISTAS** o **VOLUMEN**.
- Mantén la cruceta, un stick, L1/R1, L2/R2 o una tecla de dirección para repetir el movimiento mientras esté disponible.

El reproductor carga `media/radio-local/manifest.json`. Reproduce las emisiones continuas y avanza entre los cortes en las demás emisoras. En el selector se muestra el título del corte cuando el catálogo de audio lo identifica. `media/` contiene los audios, las portadas y la fuente locales y está excluida de Git. Las fotografías de fondo están acreditadas en `assets/`.

La reproducción usa los archivos locales del juego. Las descripciones de GTA 6 Radio y los [créditos oficiales](https://www.rockstargames.com/VI/credits) sirven para identificar canciones e intérpretes. En las emisiones continuas el título cambia al llegar a una marca del audio local. Los capítulos pendientes de identificar se muestran por número. Cuando hay créditos de composición, se pueden consultar al pasar el puntero sobre el nombre del intérprete.

## Publicar la interfaz y servir el audio

GitHub Pages publica el HTML, CSS, JavaScript y los archivos de `assets/`. El servidor del PC entrega los audios, el manifiesto, las portadas y la fuente de `media/`. El reproductor usa el origen HTTPS indicado en la variable del repositorio `RADIO_MEDIA_URL`.

1. Ejecuta `python serve.py --media-only --port 4175` en el equipo que tenga la carpeta `media/`.
2. Conecta el puerto a un túnel HTTPS de Cloudflare. Para las pruebas, ejecuta `cloudflared tunnel --url http://127.0.0.1:4175`. El enlace temporal cambia al reiniciar el túnel.
3. En GitHub, selecciona **GitHub Actions** en **Settings → Pages**. En **Settings → Secrets and variables → Actions → Variables**, configura `RADIO_MEDIA_URL` con la URL HTTPS del túnel y ejecuta el workflow **Publicar Radio VI**.

Para trasladar el audio al portátil, copia `serve.py` y `media/` manteniendo la misma estructura. Inicia el servidor y el túnel en el portátil. Si cambia la URL HTTPS, actualiza `RADIO_MEDIA_URL` y vuelve a ejecutar el workflow.

## Tipografía

El selector usa **GTA Art Deco Condensed Bold** con texto blanco y contorno negro. El archivo local es `media/fonts/GTAArtDeco-Condensed-Bold.ttf`.
