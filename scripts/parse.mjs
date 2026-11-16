// Parsers del HTML que devuelve resultados.php (IMD Sevilla).
// Solo usan APIs DOM estándar: funcionan en Node (linkedom) y en el navegador.

const txt = (el) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
const leafRows = (root) => [...root.querySelectorAll('tr')].filter((tr) => !tr.querySelector('tr'));
const cellsOf = (tr) => [...tr.children].filter((e) => /^T[DH]$/i.test(e.tagName)).map(txt);

/** Búsqueda (opc=2 + busqueda): lista de equipos con su id. */
export function parseBusqueda(root) {
  const out = [];
  for (const tr of leafRows(root)) {
    const holder = tr.querySelector('[onclick*="datosequipo"]') || (tr.getAttribute('onclick')?.includes('datosequipo') ? tr : null);
    if (!holder) continue;
    const id = holder.getAttribute('onclick').match(/datosequipo\('([^']+)'\)/)?.[1];
    const c = cellsOf(tr);
    if (!id || c.length < 5) continue;
    out.push({ id, equipo: c[0], deporte: c[1], categoria: c[2], distrito: c[3], grupo: c[4] });
  }
  return out;
}

/** Calendario del grupo (opc=2, jor=Todas): jornadas con sus partidos. */
export function parseCalendario(root) {
  const jornadas = [];
  let cur = null;
  for (const tr of leafRows(root)) {
    const c = cellsOf(tr);
    const line = c.join(' ');
    const m = line.match(/^Jornada\s+N\D{0,3}\s*(\d+)/i);
    if (m) { cur = { jornada: +m[1], partidos: [] }; jornadas.push(cur); continue; }
    if (!cur || c.length < 6 || c[0] === 'Fecha') continue;
    const f = c[0].match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!f && c[0] !== '' && c[0] !== '-') continue;
    cur.partidos.push({
      fecha: f ? `${f[3]}-${f[2]}-${f[1]}` : null,
      hora: /^\d{1,2}:\d{2}$/.test(c[1]) ? c[1] : null,
      local: c[2],
      visitante: c[3],
      resultado: /^\d+\s*-\s*\d+$/.test(c[4]) ? c[4].replace(/\s/g, '') : null,
      lugar: c[5] && c[5] !== '-' ? c[5] : null,
      obs: c[6] && c[6] !== '-' ? c[6] : null,
      obsResultado: c[7] && c[7] !== '-' ? c[7] : null,
    });
  }
  return jornadas;
}

/** Clasificación (opc=3, jor=Todas). */
export function parseClasificacion(root) {
  const out = [];
  for (const tr of leafRows(root)) {
    const c = cellsOf(tr);
    const m = c[0]?.match(/^(\d+)\s*-\s*(.+)$/);
    if (!m || c.length < 9) continue;
    const n = c.slice(1, 9).map(Number);
    if (n.some(Number.isNaN)) continue;
    const [pj, pg, pe, pp, pnp, tf, tc, puntos] = n;
    out.push({ pos: +m[1], equipo: m[2].trim(), pj, pg, pe, pp, pnp, tf, tc, puntos });
  }
  return out;
}
