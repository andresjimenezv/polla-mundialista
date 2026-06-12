const DEMO_DATA = [
  { puesto_actual: 1, usuario: "jaimeco", nombre: "Jaime A Corva Perez", puntos: 10, puesto_anterior: 1 },
  { puesto_actual: 2, usuario: "nachocas13", nombre: "Misael Ignacio Castillo", puntos: 10, puesto_anterior: 8 },
  { puesto_actual: 3, usuario: "aroldan", nombre: "Alvaro Roldan", puntos: 10, puesto_anterior: 2 },
  { puesto_actual: 4, usuario: "carlosg0205", nombre: "Carlos Garcia", puntos: 10, puesto_anterior: "" },
  { puesto_actual: 5, usuario: "edwinnin2026", nombre: "Edwin Fabian Niño Leon", puntos: 10, puesto_anterior: 3 },
  { puesto_actual: 6, usuario: "marcebulla", nombre: "Marcela Bulla", puntos: 10, puesto_anterior: 6 }
];

let ranking = [];
let loadInfo = { status: "loading", message: "Cargando datos..." };

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const config = window.POLLA_CONFIG || {};
  document.getElementById("siteTitle").textContent = config.title || "Polla Mundialista 2026";

  ranking = await loadRanking(config);
  ranking = normalizeRows(ranking);

  if (ranking.length > 0) {
    loadInfo = { status: "ok", message: `Conectado: ${ranking.length} participantes cargados desde WEB_DATA.` };
  } else if (loadInfo.status !== "error") {
    loadInfo = { status: "warn", message: "CSV conectado, pero no encontré filas válidas. Revisa que WEB_DATA tenga encabezados y datos." };
  }

  populatePointsFilter(ranking);
  renderAll();

  document.getElementById("searchInput").addEventListener("input", renderAll);
  document.getElementById("statusFilter").addEventListener("change", renderAll);
  document.getElementById("pointsFilter").addEventListener("change", renderAll);
  document.getElementById("copyWhatsapp").addEventListener("click", copyWhatsappRanking);
}

async function loadRanking(config) {
  const url = config.sheetCsvUrl || "";
  const hasUrl = url && !url.includes("PEGAR_AQUI");

  if (!hasUrl) {
    loadInfo = { status: "warn", message: "Falta pegar el enlace CSV de WEB_DATA en config.js." };
    return config.fallbackToDemoData ? DEMO_DATA : [];
  }

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const csv = await response.text();
    const rows = parseCsv(csv);
    return rows;
  } catch (error) {
    console.error(error);
    loadInfo = { status: "error", message: "No pude leer el CSV publicado. Revisa permisos, publicación y enlace CSV." };
    return config.fallbackToDemoData ? DEMO_DATA : [];
  }
}

function normalizeRows(rows) {
  return rows
    .map(row => {
      const puestoActual = numberValue(pick(row, [
        "puesto_actual", "puesto", "pos", "posicion", "posición", "ranking", "rank", "posicion_actual", "posición_actual"
      ]));
      const puntos = numberValue(pick(row, ["puntos", "pts", "puntaje", "score"]));
      const puestoAnteriorRaw = pick(row, [
        "puesto_anterior", "anterior", "posicion_anterior", "posición_anterior", "ranking_anterior", "rank_anterior"
      ]);
      const puestoAnterior = numberValue(puestoAnteriorRaw);

      return {
        puesto_actual: puestoActual,
        usuario: textValue(pick(row, ["usuario", "user", "username"])),
        nombre: textValue(pick(row, ["nombre", "participante", "jugador", "nombre_participante"])),
        puntos,
        puesto_anterior: puestoAnterior || "",
        movimiento: getMovement(puestoActual, puestoAnterior)
      };
    })
    .filter(row => row.puesto_actual > 0 && row.nombre)
    .sort((a, b) => a.puesto_actual - b.puesto_actual);
}

function pick(row, names) {
  for (const name of names) {
    const key = normalizeHeader(name);
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== "") return row[key];
  }
  return "";
}

function getMovement(actual, anterior) {
  if (!anterior) return { tipo: "nuevo", texto: "🆕 Nuevo", delta: null };
  const delta = anterior - actual;
  if (delta > 0) return { tipo: "subio", texto: `📈 Subió ${delta}`, delta };
  if (delta < 0) return { tipo: "bajo", texto: `📉 Bajó ${Math.abs(delta)}`, delta };
  return { tipo: "igual", texto: "➖ Igual", delta: 0 };
}

function renderAll() {
  const filtered = getFilteredRanking();
  renderHeader(ranking);
  renderTopFive(ranking.slice(0, 5));
  renderCards(filtered);
  renderTable(filtered);
}

function renderHeader(rows) {
  const leader = rows[0] || {};
  const movers = rows.filter(row => ["subio", "bajo", "nuevo"].includes(row.movimiento.tipo)).length;

  document.getElementById("totalParticipants").textContent = rows.length;
  document.getElementById("leaderPoints").textContent = leader.puntos ?? 0;
  document.getElementById("moversCount").textContent = movers;
  document.getElementById("lastUpdate").textContent = `Actualizado: ${formatDate(new Date())}`;

  const status = document.getElementById("connectionStatus");
  status.textContent = loadInfo.message;
  status.className = `connection-status ${loadInfo.status}`;
}

function renderTopFive(rows) {
  const container = document.getElementById("topFive");
  if (!rows.length) {
    container.innerHTML = `<div class="empty">No hay datos para mostrar. Revisa que la pestaña WEB_DATA esté publicada como CSV y tenga participantes.</div>`;
    return;
  }

  const medals = ["🥇", "🥈", "🥉", "🏅", "🎖️"];
  const html = rows.map((row, index) => `
    <article class="prize-card">
      <div class="prize-card__rank">${medals[index]} ${row.puesto_actual}</div>
      <div class="prize-card__name">${escapeHtml(row.nombre)}</div>
      <div class="prize-card__points">${row.puntos} pts</div>
    </article>
  `).join("");

  container.innerHTML = html;
}

function renderCards(rows) {
  const medals = {1:"🥇", 2:"🥈", 3:"🥉", 4:"🏅", 5:"🎖️"};
  const html = rows.map(row => {
    const prefix = medals[row.puesto_actual] || "🔹";
    return `
      <article class="rank-card">
        <div class="rank-card__rank">${prefix} ${row.puesto_actual}</div>
        <div class="rank-card__name">${escapeHtml(row.nombre)}</div>
        <div class="rank-card__meta">
          <span class="badge">${row.puntos} pts</span>
          <span class="badge ${row.movimiento.tipo}">${row.movimiento.texto}</span>
        </div>
      </article>
    `;
  }).join("");

  document.getElementById("rankingCards").innerHTML = html || emptyState();
}

function renderTable(rows) {
  const medals = {1:"🥇", 2:"🥈", 3:"🥉", 4:"🏅", 5:"🎖️"};
  const html = rows.map(row => {
    const prefix = medals[row.puesto_actual] || "🔹";
    return `
      <tr>
        <td><strong>${prefix} ${row.puesto_actual}</strong></td>
        <td><span class="badge ${row.movimiento.tipo}">${row.movimiento.texto}</span></td>
        <td class="name">${escapeHtml(row.nombre)}</td>
        <td><strong>${row.puntos}</strong></td>
        <td>${row.puesto_anterior || "—"}</td>
        <td>${escapeHtml(row.usuario)}</td>
      </tr>
    `;
  }).join("");

  document.getElementById("rankingTable").innerHTML = html || `<tr><td colspan="6">${emptyState()}</td></tr>`;
}

function getFilteredRanking() {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const status = document.getElementById("statusFilter").value;
  const points = document.getElementById("pointsFilter").value;

  return ranking.filter(row => {
    const matchesSearch = !search ||
      row.nombre.toLowerCase().includes(search) ||
      row.usuario.toLowerCase().includes(search);

    const matchesStatus = !status || row.movimiento.tipo === status;
    const matchesPoints = !points || String(row.puntos) === points;

    return matchesSearch && matchesStatus && matchesPoints;
  });
}

function populatePointsFilter(rows) {
  const select = document.getElementById("pointsFilter");
  const points = [...new Set(rows.map(row => row.puntos))].sort((a, b) => b - a);

  points.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = `${value} pts`;
    select.appendChild(option);
  });
}

async function copyWhatsappRanking() {
  const rows = ranking;
  if (!rows.length) {
    alert("No hay ranking cargado para copiar.");
    return;
  }

  const medals = {1:"🥇", 2:"🥈", 3:"🥉", 4:"🏅", 5:"🎖️"};
  const formatRow = row => `${medals[row.puesto_actual] || "🔹"} ${row.puesto_actual}. ${row.nombre} — ${row.puntos} pts`;

  const text = [
    "🏆 RANKING ACTUALIZADO — POLLA MUNDIALISTA",
    "",
    `Total participantes: ${rows.length}`,
    "",
    "🔥 TOP 10",
    "",
    ...rows.slice(0, 10).map(formatRow),
    "",
    "📋 RANKING GENERAL",
    "",
    ...rows.map(formatRow)
  ].join("\n");

  try {
    await navigator.clipboard.writeText(text);
    alert("Ranking copiado para WhatsApp.");
  } catch (error) {
    console.error(error);
    alert("No se pudo copiar automáticamente. Selecciona el texto manualmente.");
  }
}

function parseCsv(csv) {
  const clean = String(csv || "").replace(/^\uFEFF/, "").trim();
  if (!clean) return [];

  let lines = clean.split(/\r?\n/).filter(line => line.trim() !== "");
  if (!lines.length) return [];

  if (/^sep=/i.test(lines[0])) lines = lines.slice(1);

  const headerIndex = findHeaderLine(lines);
  if (headerIndex < 0) return [];

  const delimiter = detectDelimiter(lines[headerIndex]);
  const headers = splitDelimitedLine(lines[headerIndex], delimiter).map(header => normalizeHeader(header));

  return lines.slice(headerIndex + 1).map(line => {
    const values = splitDelimitedLine(line, delimiter);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function findHeaderLine(lines) {
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const normalized = normalizeHeader(lines[i]);
    const hasName = normalized.includes("nombre") || normalized.includes("participante") || normalized.includes("jugador");
    const hasPoints = normalized.includes("puntos") || normalized.includes("pts") || normalized.includes("puntaje");
    const hasPosition = normalized.includes("puesto") || normalized.includes("posicion") || normalized.includes("pos");
    if ((hasName && hasPoints) || (hasPosition && hasPoints)) return i;
  }
  return 0;
}

function detectDelimiter(line) {
  const candidates = [",", ";", "\t"];
  return candidates
    .map(delimiter => ({ delimiter, count: splitDelimitedLine(line, delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function splitDelimitedLine(line, delimiter) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result.map(value => value.trim());
}

function normalizeHeader(header) {
  return String(header ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function numberValue(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "—" || raw === "-") return 0;
  const number = Number(raw.replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function textValue(value) {
  return String(value ?? "").trim();
}

function formatDate(date) {
  return date.toLocaleString("es-CO", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function emptyState() {
  return `<div class="empty">No hay resultados para estos filtros.</div>`;
}
