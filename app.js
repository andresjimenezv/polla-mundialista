const DEMO_DATA = [
  { puesto_actual: 1, usuario: "jaimeco", nombre: "Jaime A Corva Perez", puntos: 10, puesto_anterior: 1 },
  { puesto_actual: 2, usuario: "nachocas13", nombre: "Misael Ignacio Castillo", puntos: 10, puesto_anterior: 8 },
  { puesto_actual: 3, usuario: "aroldan", nombre: "Alvaro Roldan", puntos: 10, puesto_anterior: 2 },
  { puesto_actual: 4, usuario: "carlosg0205", nombre: "Carlos Garcia", puntos: 10, puesto_anterior: "" },
  { puesto_actual: 5, usuario: "edwinnin2026", nombre: "Edwin Fabian Niño Leon", puntos: 10, puesto_anterior: 3 },
  { puesto_actual: 6, usuario: "marcebulla", nombre: "Marcela Bulla", puntos: 10, puesto_anterior: 6 }
];

let ranking = [];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const config = window.POLLA_CONFIG || {};
  document.getElementById("siteTitle").textContent = config.title || "Polla Mundialista";

  ranking = await loadRanking(config);
  ranking = normalizeRows(ranking);
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
    if (config.fallbackToDemoData) return DEMO_DATA;
    return [];
  }

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("No se pudo cargar el CSV");
    const csv = await response.text();
    return parseCsv(csv);
  } catch (error) {
    console.error(error);
    return config.fallbackToDemoData ? DEMO_DATA : [];
  }
}

function normalizeRows(rows) {
  return rows
    .map(row => {
      const puestoActual = numberValue(row.puesto_actual ?? row.puesto ?? row.posicion ?? row.posición);
      const puntos = numberValue(row.puntos);
      const puestoAnterior = numberValue(row.puesto_anterior ?? row.anterior);

      return {
        puesto_actual: puestoActual,
        usuario: textValue(row.usuario),
        nombre: textValue(row.nombre),
        puntos,
        puesto_anterior: puestoAnterior || "",
        movimiento: getMovement(puestoActual, puestoAnterior)
      };
    })
    .filter(row => row.puesto_actual && row.nombre)
    .sort((a, b) => a.puesto_actual - b.puesto_actual);
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
}

function renderTopFive(rows) {
  const medals = ["🥇", "🥈", "🥉", "🏅", "🎖️"];
  const html = rows.map((row, index) => `
    <article class="prize-card">
      <div class="prize-card__rank">${medals[index]} ${row.puesto_actual}</div>
      <div class="prize-card__name">${escapeHtml(row.nombre)}</div>
      <div class="prize-card__points">${row.puntos} pts</div>
    </article>
  `).join("");

  document.getElementById("topFive").innerHTML = html;
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
  const lines = csv.trim().split(/\r?\n/);
  if (!lines.length) return [];

  const headers = splitCsvLine(lines[0]).map(header => normalizeHeader(header));
  return lines.slice(1).map(line => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? "";
    });
    return row;
  });
}

function splitCsvLine(line) {
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
    } else if (char === "," && !insideQuotes) {
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
  return String(header)
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function numberValue(value) {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
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
