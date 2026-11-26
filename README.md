# Radio VI

Selector web con 24 emisoras en **Radio**, The Sniper of La Perle en **Bajo Demanda**, y Los Diozes FM, Huelintown FM y Boom-Bap Rap en **Extra Radio**. Las listas de todas las emisoras mantienen el orden del catálogo. Usa HTML, CSS y JavaScript, sin paso de compilación.

## Abrir en local

Desde la carpeta del proyecto, ejecuta `python serve.py` y abre [Radio VI](http://127.0.0.1:4174/). El servidor permite que el navegador lea por tramos las emisiones largas y retome la reproducción donde la dejaste.

- Cambia de emisora con ← y →, el stick izquierdo hacia los lados, L1 y R1, las flechas visibles o un gesto horizontal.
- Arrastra hacia arriba para acceder a **Extra Radio** y hacia abajo para escuchar The Sniper of La Perle en **Bajo Demanda**. También puedes elegir la sección con un clic, con ↑ y ↓ o con el stick derecho.
- En **Extra Radio** puedes cambiar entre las tres emisoras. Al intentar sintonizar un hueco vacío en **Extra Radio** o **Bajo Demanda**, el carrusel vuelve al centro y suena el efecto de sintonía.
- Selecciona una emisora para escucharla. Las flechas y L1/R1 también reproducen el efecto de sintonía.
- La radio arranca apagada. Pulsa **Encender**, espacio o ✕ en el mando para empezar a escuchar. Las tres secciones comparten el encendido y cada emisora conserva su posición.
- La barra L1/R1 indica la posición y permite saltar a cualquier entrada.
- La barra inferior muestra el tiempo transcurrido y la duración, y permite buscar dentro de la pista. Pulsa L2 o R2 para cambiar de canción con el efecto de sintonía, y △ o **LISTAS** para abrir los temas de la emisora con el sonido del menú.
- Pulsa □ o **VOLUMEN** para abrir la barra de la música. La música empieza al 50 %. Selecciónala con ✕, Enter o Espacio. Las flechas ajustan el volumen en pasos de 5 puntos y el stick en pasos de 1 punto. El stick acelera al mantenerlo inclinado. El altavoz silencia la música y recupera el último nivel.
- Abre **AJUSTES** con SELECT u OPTIONS, elige una casilla con el stick o las flechas y cambia su estado con ✕. Con el ratón, arrastra la R para moverte entre opciones y haz clic en la ✕ o en la casilla para cambiarla. **REPRODUCCIÓN ALEATORIA** cambia la secuencia de reproducción y mantiene el orden visual de las listas. **EFECTOS DE SONIDO** activa o silencia los sonidos de la interfaz, que vienen activados por defecto. El navegador recuerda ambas opciones.
- Para usar el teléfono como mando, abre [Radio VI](https://impaul17.github.io/radio-vi/) en el ordenador y entra en **AJUSTES → MANDO MÓVIL**. Escanea el QR con la cámara del teléfono, abre el enlace y úsalo en horizontal. El código vincula un solo móvil a esa pestaña. Puedes desconectarlo en el mismo menú.
- En **LISTAS**, arrastra el icono L o usa el stick izquierdo, las flechas o la rueda del ratón para avanzar de canción en canción. Pulsa ✕, Enter o haz clic en una canción para reproducirla.
- Pulsa ◯ o **SALIR** para cerrar **LISTAS**, **VOLUMEN** o **AJUSTES**.
- Mantén la cruceta, un stick, L1/R1, L2/R2 o una tecla de dirección para repetir el movimiento mientras esté disponible.

El reproductor carga `media/radio-local/manifest.json`. Reproduce las emisiones continuas y avanza entre los cortes en las demás emisoras. En el selector se muestra el título del corte cuando el catálogo de audio lo identifica. `media/` contiene los audios, las portadas y la fuente locales y está excluida de Git. Las fotografías de fondo están acreditadas en `assets/`.

La reproducción usa los archivos locales del juego. Las descripciones de GTA 6 Radio y los [créditos oficiales](https://www.rockstargames.com/VI/credits) sirven para identificar canciones e intérpretes. En las emisiones continuas el título cambia al llegar a una marca del audio local. Los capítulos pendientes de identificar se muestran por número. Cuando hay créditos de composición, se pueden consultar al pasar el puntero sobre el nombre del intérprete.

## Publicar la interfaz y servir el audio

GitHub Pages publica el HTML, CSS, JavaScript y los archivos de `assets/`, incluidas las portadas optimizadas en WebP. La web precarga esas portadas antes de mostrar el selector. El servidor del PC entrega los audios, el manifiesto y la fuente de `media/` desde el origen HTTPS indicado en la variable `RADIO_MEDIA_URL`. Ese mismo servidor comunica la pestaña de Radio VI con el móvil emparejado.

1. Ejecuta `python serve.py --media-only --port 4175` en el equipo que tenga la carpeta `media/`.
2. Conecta el puerto a un túnel HTTPS de Cloudflare. Para las pruebas, ejecuta `cloudflared tunnel --url http://127.0.0.1:4175`. El enlace temporal cambia al reiniciar el túnel.
3. En GitHub, selecciona **GitHub Actions** en **Settings → Pages**. En **Settings → Secrets and variables → Actions → Variables**, configura `RADIO_MEDIA_URL` con la URL HTTPS del túnel y ejecuta el workflow **Publicar Radio VI**.

Para trasladar el audio y el emparejamiento al portátil, copia `serve.py`, `controller_relay.py` y `media/` manteniendo la misma estructura. Inicia el servidor y el túnel en el portátil. Si cambia la URL HTTPS, actualiza `RADIO_MEDIA_URL` y vuelve a ejecutar el workflow.

## Tipografía

El selector usa **GTA Art Deco Condensed Bold** con texto blanco y contorno negro. El archivo local es `media/fonts/GTAArtDeco-Condensed-Bold.ttf`.
