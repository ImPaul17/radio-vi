# Radio VI

Selector web de emisoras con las 24 portadas locales de `media/logos/png` en el orden de sus archivos. Usa HTML, CSS y JavaScript, sin paso de compilación.

## Abrir en local

Desde la carpeta del proyecto, ejecuta `python -m http.server 4173 --bind 127.0.0.1` y abre [Radio VI](http://127.0.0.1:4173/).

- Cambia de portada con ← y →, L1 y R1, las flechas visibles o un gesto horizontal.
- Arrastra hacia abajo en el selector o en el carrusel para entrar en **On Demand**. Arrastra hacia arriba para volver a **Radio**. También puedes hacer clic en los modos, usar ↑ y ↓ o mover el stick derecho.
- Pulsa **Apagar**, espacio o ✕ en el mando para desactivar la selección visible. Pulsa de nuevo para recuperarla.
- La barra L1/R1 indica la posición y permite saltar a cualquier entrada.

El catálogo incluye títulos y artistas como referencia. Las portadas de la carpeta local son un requisito para ver las 24 imágenes. Las fotografías de fondo y las fuentes están acreditadas en `assets/`.

## Tipografía

Se usa **Barlow Condensed ExtraBold** para el nombre activo y **Space Grotesk** para controles y metadatos. **GTA Art Deco Condensed Bold** aparece en archivos de interfaz del juego. El vínculo con el estilo exacto del selector de la captura sigue sin verificarse.
