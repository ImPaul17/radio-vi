# Radio VI

Radio VI es un reproductor web independiente para explorar un catálogo de emisoras y programas bajo demanda. El selector, las portadas de la demo y las transiciones se diseñaron para esta web. El catálogo usa nombres y referencias de los [créditos de Rockstar Games](https://www.rockstargames.com/VI/credits) y de la [investigación del proyecto](docs/RESEARCH.md).

[Abrir Radio VI en GitHub Pages](https://impaul17.github.io/radio-vi/)

## Abrir en local

Desde la carpeta del proyecto, ejecuta:

```sh
python -m http.server 4173 --bind 127.0.0.1
```

Abre [Radio VI en tu navegador](http://127.0.0.1:4173/). La web usa HTML, CSS y módulos JavaScript, sin paso de compilación.

## Escuchar

Selecciona una emisora o un programa y abre **Mi biblioteca**. Puedes cargar un audio, una portada y un archivo de letras con marcas de tiempo en formato LRC, VTT o SRT. El navegador lee los archivos elegidos en tu equipo y conserva la biblioteca y la posición de cada pista durante la sesión actual de la página.

Recorre el selector con el ratón, un gesto horizontal, ←/→ o L1/R1. Usa ↑/↓ o la cruceta para cambiar entre Radio y On Demand. Espacio y el botón ✕ encienden o apagan la radio. La tecla L y el botón △ muestran u ocultan las letras. El botón del reproductor pausa o reanuda el audio.

## GitHub Pages

El sitio se sirve directamente desde la raíz de la rama `main`. En **Settings → Pages**, selecciona **Deploy from a branch**, **main** y **/(root)**. Los recursos de la web usan rutas relativas, de modo que funcionan bajo la ruta del repositorio.

La carpeta local `media/` está excluida de Git. Mantén ahí los archivos del juego y cualquier medio personal que quieras usar durante el desarrollo.

## Créditos

Las fotografías de ambiente están acreditadas en [assets/photo-credits.json](assets/photo-credits.json) y en el menú de ayuda. Las fuentes Barlow Condensed y Space Grotesk se incluyen con sus licencias SIL Open Font License en [assets/fonts](assets/fonts).
