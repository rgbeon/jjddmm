# Resultados JJDDMM Sevilla

Web instalable en el móvil con calendario, resultados y clasificación de equipos de los
Juegos Deportivos Municipales del IMD Sevilla. GitHub Actions consulta la web del IMD
varias veces por semana y publica los datos en GitHub Pages. Sin servidor y gratis.

## Puesta en marcha (una sola vez)

1. Crea un repo en GitHub (puede ser privado si tienes Pro; si no, público) y sube esta carpeta a `main`.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. **Actions → Actualizar resultados → Run workflow**. En ~1 min estará en
   `https://<usuario>.github.io/<repo>/`.
4. En el móvil, abre esa URL y usa *Añadir a pantalla de inicio* (Safari) o *Instalar app* (Chrome).

## Añadir o cambiar equipos

Edita `equipos.json`. `nombre` y `categoria` tienen que coincidir con lo que muestra la web del
IMD; `busqueda` es el texto que se escribiría en su buscador. Con más de un equipo aparece un
selector arriba (y cada equipo tiene su enlace: `.../#slug`).

Al cambiar de temporada, actualiza `competicion` (p. ej. `XLIII JUEGOS DEPORTIVOS MUNICIPALES 2027-2028`).
`provisional: 1` muestra los resultados según se introducen; `2` solo los definitivos (jueves).

## Cómo funciona

- `scripts/scrape.mjs` hace `POST` a `resultados.php` (el mismo endpoint que usa la web del IMD):
  busca el equipo para obtener su id y pide calendario (`opc=2`) y clasificación (`opc=3`) con `jor=Todas`.
- `scripts/parse.mjs` convierte el HTML (ISO-8859-1) en JSON.
- Escribe `site/data/<slug>.json` y `site/data/index.json`, los commitea (queda historial de
  cambios) y despliega `site/` en Pages.
- Si el IMD cambia su HTML y falla todo, el workflow falla (te llega email de GitHub) y la web sigue
  mostrando los últimos datos buenos.

Horarios en `.github/workflows/actualizar.yml` (en UTC). Local: `npm install && npm run scrape`
y sirve `site/` con cualquier servidor estático.
