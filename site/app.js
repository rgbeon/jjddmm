// Resultados JJDDMM · lee data/index.json y data/<slug>.json (generados por GitHub Actions)
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const DAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MON = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fdate = (s) => { if (!s) return 'fecha por fijar'; const d = new Date(s + 'T12:00'); return `${DAYS[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };

const SIGLAS = /^(CD|CF|UD|AD|CDF|SD|AMPA|CEIP|IES|II|III|IV|F7|FS|EF|ACD|CDE)$/;
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s(/·-])([a-záéíóúñü])/g, (m, a, b) => a + b.toUpperCase())
  .split(' ').map((w, i) => (SIGLAS.test(w.toUpperCase().replace(/[.,]/g, '')) ? w.toUpperCase() : i && /^(De|Del|La|Las|Los|Y|El)$/.test(w) ? w.toLowerCase() : w)).join(' ');
const team = (t) => titleCase(String(t).replace(/^C\.D\.\s?/i, 'CD ').replace(/^U\.?D\.\s?/i, 'UD ').replace(/^C\.?F\.\s?/i, 'CF ').replace(/^CD\.\s?/i, 'CD '));
const venue = (v) => (v ? titleCase(v.replace(/^C\.?D\.\s?/i, 'CD ').replace(/(\d|[A-Z])-(?=\S)/, '$1 · ')) : 'campo por confirmar');

const LBL = { W: 'V', D: 'E', L: 'D' };
const goals = (r) => r.split('-').map(Number);

async function getJSON(url) {
  const r = await fetch(url, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

let indice;
async function main() {
  try {
    indice = await getJSON('data/index.json');
  } catch (e) {
    return showErr('Aún no hay datos. Lanza el workflow "Actualizar resultados" en GitHub (pestaña Actions).');
  }
  const slugs = indice.equipos.map((e) => e.slug);
  const pick = () => (slugs.includes(location.hash.slice(1)) ? location.hash.slice(1) : slugs[0]);
  const picker = $('picker');
  if (slugs.length > 1) {
    picker.hidden = false;
    const draw = () => (picker.innerHTML = indice.equipos.map((e) => `<a href="#${e.slug}" class="${e.slug === pick() ? 'on' : ''}">${esc(e.apodo || team(e.equipo))} · ${esc(titleCase(e.categoria))}</a>`).join(''));
    draw();
    addEventListener('hashchange', () => { draw(); load(pick()); });
  }
  load(pick());
}

function showErr(msg) { const e = $('err'); e.hidden = false; e.innerHTML = `<p>${esc(msg)}</p>`; }

async function load(slug) {
  let D;
  try { D = await getJSON(`data/${slug}.json`); } catch (e) { return showErr('No he podido cargar los datos (¿sin conexión?).'); }
  render(D);
}

let filt = 'all', cur = null;
function render(D) {
  const ME = D.equipo;
  const M = D.calendario.flatMap((j) => j.partidos.map((p) => ({ ...p, j: j.jornada })));
  const isMe = (m) => m.local === ME || m.visitante === ME;
  const outcomeFor = (m, t) => { if (!m.resultado) return null; const [a, b] = goals(m.resultado); const x = m.local === t ? a - b : b - a; return x > 0 ? 'W' : x < 0 ? 'L' : 'D'; };

  document.title = `${D.apodo || team(ME)} · Resultados`;
  $('kick').textContent = titleCase(D.competicion);
  $('title').textContent = D.apodo || team(ME);
  $('meta').innerHTML = [titleCase(D.deporte), titleCase(D.categoria), 'Distrito ' + titleCase(D.distrito), 'Grupo ' + D.grupo].map((x) => `<span>${esc(x)}</span>`).join('');

  // Próximo partido
  const ours = M.filter(isMe).sort((a, b) => a.j - b.j);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const pend = ours.filter((m) => !m.resultado);
  const next = pend.find((m) => !m.fecha || new Date(m.fecha + 'T00:00') >= today) || pend[0];
  if (next) {
    const days = next.fecha ? Math.round((new Date(next.fecha + 'T00:00') - today) / 864e5) : null;
    const cd = days === null ? 'fecha por fijar' : days < 0 ? 'pendiente de resultado' : days === 0 ? '¡hoy!' : days === 1 ? 'mañana' : `en ${days} días`;
    $('next').innerHTML = `<h2>Próximo partido <small>Jornada ${next.j}</small></h2>
      <div class="vs"><div class="t ${next.local === ME ? 'me' : ''}">${esc(team(next.local))}</div><div class="x">VS</div><div class="t ${next.visitante === ME ? 'me' : ''}">${esc(team(next.visitante))}</div></div>
      <div class="when"><span><b>${fdate(next.fecha)}</b>${next.hora ? ' · ' + next.hora + ' h' : ''}</span><span class="count">${cd}</span></div>
      <div class="when" style="margin-top:8px">📍 ${esc(venue(next.lugar))}</div>
      <div class="when" style="margin-top:4px">${next.local === ME ? 'Jugamos en casa' : 'Jugamos fuera'}${next.obs ? ' · ' + esc(titleCase(next.obs)) : ''}</div>`;
  } else $('next').innerHTML = '<h2>Temporada terminada</h2>';

  // Clasificación + racha
  const racha = (t) => M.filter((m) => m.resultado && (m.local === t || m.visitante === t)).sort((a, b) => b.j - a.j).slice(0, 5).reverse().map((m) => outcomeFor(m, t));
  $('clas').innerHTML = `<tr><th class="tm">Equipo</th><th>PJ</th><th class="hide-s">G</th><th class="hide-s">E</th><th class="hide-s">P</th><th>GF</th><th>GC</th><th>Pts</th><th class="hide-s">Racha</th></tr>` +
    D.clasificacion.map((r) => `<tr class="${r.equipo === ME ? 'me' : ''}"><td class="tm"><span class="pos">${r.pos}</span>${esc(team(r.equipo))}</td><td>${r.pj}</td><td class="hide-s">${r.pg}</td><td class="hide-s">${r.pe}</td><td class="hide-s">${r.pp}</td><td>${r.tf}</td><td>${r.tc}</td><td class="pts">${r.puntos}</td><td class="hide-s"><div class="form">${racha(r.equipo).map((o) => `<span class="dot ${o}">${LBL[o]}</span>`).join('')}</div></td></tr>`).join('');
  $('clasNote').textContent = 'resultados ' + D.estado;

  // Nuestros partidos
  const rec = { W: 0, D: 0, L: 0 };
  ours.filter((m) => m.resultado).forEach((m) => rec[outcomeFor(m, ME)]++);
  $('ourNote').textContent = `${rec.W}V · ${rec.D}E · ${rec.L}D`;
  const row = (m) => {
    const o = isMe(m) ? outcomeFor(m, ME) : null;
    const cls = m.resultado ? (o || 'n') : 'p';
    return `<div class="match"><div class="jn">J${m.j}</div><div><div class="teams"><span class="${m.local === ME ? 'me' : ''}">${esc(team(m.local))}</span> – <span class="${m.visitante === ME ? 'me' : ''}">${esc(team(m.visitante))}</span></div>
      <div class="sub">${fdate(m.fecha)}${m.hora ? ' · ' + m.hora + ' h' : ''} · ${esc(venue(m.lugar))}${m.obsResultado ? ' · <b>' + esc(m.obsResultado) + '</b>' : ''}</div></div>
      <div class="score ${cls}">${m.resultado ? m.resultado.replace('-', ' – ') : '—'}</div></div>`;
  };
  const drawOurs = () => { $('ours').innerHTML = ours.filter((m) => filt === 'all' || (filt === 'played' ? m.resultado : !m.resultado)).map(row).join('') || '<p class="sub">Nada por aquí.</p>'; };
  $('seg').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; filt = b.dataset.f; [...e.currentTarget.children].forEach((x) => x.classList.toggle('on', x === b)); drawOurs(); };
  drawOurs();

  // Jornada a jornada
  const J = [...new Set(M.map((m) => m.j))].sort((a, b) => a - b);
  const lastPlayed = Math.max(0, ...M.filter((m) => m.resultado).map((m) => m.j));
  cur = next ? next.j : J[J.length - 1];
  const tabs = $('tabs');
  const drawJ = () => {
    tabs.innerHTML = J.map((j) => `<button data-j="${j}" class="${j === cur ? 'on' : ''} ${j <= lastPlayed ? 'done' : ''}">J${j}</button>`).join('');
    $('jor').innerHTML = M.filter((m) => m.j === cur).sort((a, b) => ((a.fecha || '') + (a.hora || '')).localeCompare((b.fecha || '') + (b.hora || ''))).map(row).join('');
    const on = tabs.querySelector('.on'); if (on) tabs.scrollLeft = on.offsetLeft - tabs.clientWidth / 2 + on.clientWidth / 2;
  };
  tabs.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; cur = +b.dataset.j; drawJ(); };
  drawJ();

  const up = new Date(D.actualizado);
  $('foot').innerHTML = `Datos del IMD Sevilla · resultados ${esc(D.estado)} · comprobado el ${up.toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}<br>Los provisionales pasan a definitivos los jueves tras el comité de competición · <a href="https://imd.sevilla.org/app/jjddmm_resultados/">web oficial</a>`;
}

main();
