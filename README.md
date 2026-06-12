# Polla Mundialista - Web estática

Archivos del sitio:

- `index.html`: estructura de la página.
- `styles.css`: diseño visual.
- `app.js`: lógica de carga, filtros, movimientos y botón de WhatsApp.
- `config.js`: configuración. Aquí se pega la URL CSV publicada de Google Sheets.
- `.nojekyll`: evita que GitHub Pages procese el sitio con Jekyll.

## Cómo conectar Google Sheets

1. En Google Sheets, deja lista la pestaña `WEB_DATA`.
2. Ve a Archivo > Compartir > Publicar en la web.
3. Selecciona solo la pestaña `WEB_DATA`.
4. Elige formato CSV.
5. Copia el enlace.
6. Abre `config.js` y reemplaza `PEGAR_AQUI_LA_URL_CSV_DE_WEB_DATA` por ese enlace.
7. Sube los archivos a GitHub.
