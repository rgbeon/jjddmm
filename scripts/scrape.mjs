// Descarga calendario y clasificación de los equipos de equipos.json
// y escribe site/data/<slug>.json + site/data/index.json
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parseHTML } from 'linkedom';
import { parseBusqueda, parseCalendario, parseClasificacion } from './parse.mjs';

const URL_IMD = 'https://imd.sevilla.org/app/jjddmm_resultados/resultados.php';
const cfg = JSON.parse(await readFile(new URL('../equipos.json', import.meta.url)));
const OUT = new URL('../site/data/', import.meta.url);
await mkdir(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function consulta(params) {
  const body = new URLSearchParams({
    opc: '2', provisional: String(cfg.provisional ?? 1), com: cfg.competicion,
    dis: '', busqueda: '', idequipo: '', jor: '', ...params,
  });
  for (let intento = 1; ; intento++) {
    try {
      const res = await fetch(URL_IMD, {
        method: 'POST', body,
        headers: { 'User-Agent': 'jdm-resultados (GitHub Actions; consulta para uso familiar)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = new TextDecoder('windows-1252').decode(await res.arrayBuffer());
      const { document } = parseHTML(`<!DOCTYPE html><html><body>${html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '')}</body></html>`);
      await sleep(800); // ser amables con el servidor del IMD
      return document.body;
    } catch (e) {
      if (intento >= 3) throw e;
      await sleep(3000 * intento);
    }
  }
}

const slugify = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = (s) => s.replace(/\s+/g, ' ').trim().toUpperCase();

const indice = [];
let fallos = 0;
for (const eq of cfg.equipos) {
  try {
    const encontrados = parseBusqueda(await consulta({ busqueda: eq.busqueda }));
    const t = encontrados.find((x) => norm(x.equipo) === norm(eq.nombre) && (!eq.categoria || norm(x.categoria) === norm(eq.categoria)));
    if (!t) throw new Error(`No encuentro "${eq.nombre}" buscando "${eq.busqueda}". Resultados: ${encontrados.map((x) => `${x.equipo} (${x.categoria})`).join(', ')}`);

    const calendario = parseCalendario(await consulta({ opc: '2', idequipo: t.id, jor: 'Todas' }));
    const clasificacion = parseClasificacion(await consulta({ opc: '3', idequipo: t.id, jor: 'Todas' }));
    if (!calendario.length) throw new Error('Calendario vacío: ¿ha cambiado el HTML del IMD?');

    const slug = eq.slug || slugify(`${t.equipo}-${t.categoria}`);
    const data = {
      actualizado: new Date().toISOString(),
      estado: (cfg.provisional ?? 1) === 1 ? 'provisionales' : 'definitivos',
      competicion: cfg.competicion,
      equipo: t.equipo, apodo: eq.apodo || null,
      deporte: t.deporte, categoria: t.categoria, distrito: t.distrito, grupo: t.grupo,
      calendario, clasificacion,
    };
    await writeFile(new URL(`${slug}.json`, OUT), JSON.stringify(data, null, 1));
    indice.push({ slug, equipo: t.equipo, apodo: data.apodo, categoria: t.categoria, grupo: t.grupo });
    console.log(`✓ ${t.equipo} · ${t.categoria} · ${calendario.length} jornadas · ${clasificacion.length} equipos`);
  } catch (e) {
    fallos++;
    console.error(`✗ ${eq.nombre}: ${e.message}`);
  }
}

if (indice.length) await writeFile(new URL('index.json', OUT), JSON.stringify({ actualizado: new Date().toISOString(), equipos: indice }, null, 1));
if (fallos === cfg.equipos.length) process.exit(1); // si falla todo, el workflow falla y no publica
