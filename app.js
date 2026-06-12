const DEMO_DATA = [];
let ranking = [];
let loadInfo = { status: "loading", message: "Cargando datos..." };

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const config = window.POLLA_CONFIG || {};
  document.getElementById("siteTitle").textContent = config.title || "Polla Mundialista 2026";

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

  if (!hasUrl) return config.fallbackToDemoData ? DEMO_DATA : [];

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
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

function getInsights(rows) {
  const leader = rows[0] || null;
  const cutoff = rows[4]?.puntos ?? 0;
  const maxPoints = leader?.puntos ?? 0;

  const biggestRise = rows
    .filter(row => row.movimiento.tipo === "subio")
    .sort((a, b) => b.movimiento.delta - a.movimiento.delta)[0] || null;

  const biggestFall = rows
    .filter(row => row.movimiento.tipo === "bajo")
    .sort((a, b) => Math.abs(b.movimiento.delta) - Math.abs(a.movimiento.delta))[0] || null;

  const enteredTop5 = rows.filter(row => row.puesto_actual <= 5 && (!row.puesto_anterior || row.puesto_anterior > 5));
  const leftTop5 = rows.filter(row => row.puesto_anterior && row.puesto_anterior <= 5 && row.puesto_actual > 5);
  const closeToPrize = rows.filter(row => row.puesto_actual > 5 && row.puntos >= cutoff - 3).length;
  const tiedAtTop = rows.filter(row => row.puntos === maxPoints).length;
  const movedCount = rows.filter(row => ["subio", "bajo", "nuevo"].includes(row.movimiento.tipo)).length;
  const roseCount = rows.filter(row => row.movimiento.tipo === "subio").length;
  const fellCount = rows.filter(row => row.movimiento.tipo === "bajo").length;

  return {
    leader,
    cutoff,
    biggestRise,
    biggestFall,
    enteredTop5,
    leftTop5,
    closeToPrize,
    tiedAtTop,
    movedCount,
    roseCount,
    fellCount
  };
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
  const insights = getInsights(ranking);

  renderHeader(ranking, insights);
  renderInsights(insights);
  renderStoryStrip(insights, ranking);
  renderTopFive(ranking.slice(0, 5));
  renderCards(filtered);
  renderTable(filtered);
}

function renderHeader(rows, insights) {
  document.getElementById("lastUpdate").textContent =
    `Actualizado: ${formatDate(new Date())} · ${rows.length} participantes`;

  document.getElementById("participantsChip").textContent =
    `${rows.length} participantes · Corte Top 5: ${insights.cutoff || 0} pts`;
}

function renderInsights(insights) {
  const leaderText = insights.leader
    ? { main: insights.leader.nombre, sub: `${insights.leader.puntos} pts · Puesto 1` }
    : { main: "Sin datos", sub: "Actualiza WEB_DATA" };

  const riseText = insights.biggestRise
    ? { main: insights.biggestRise.nombre, sub: `Subió ${insights.biggestRise.movimiento.delta} puestos` }
    : { main: "Sin subida aún", sub: "Aparecerá desde la próxima actualización" };

  const prizeFight = {
    main: `${insights.closeToPrize} persiguiendo premio`,
    sub: `A 3 pts o menos del corte Top 5`
  };

  const topTie = {
    main: `${insights.tiedAtTop} en la punta`,
    sub: `Jugadores con el puntaje máximo`
  };

  const entered = insights.enteredTop5.length
    ? { main: `${insights.enteredTop5.length} entraron al Top 5`, sub: namesList(insights.enteredTop5) }
    : { main: "Top 5 estable", sub: "Nadie nuevo entró a zona de premio" };

  const fallText = insights.biggestFall
    ? { main: insights.biggestFall.nombre, sub: `Bajó ${Math.abs(insights.biggestFall.movimiento.delta)} puestos` }
    : { main: "Sin caída fuerte", sub: "No hay bajadas destacadas" };

  const cards = [
    ["👑 Líder actual", leaderText.main, leaderText.sub, "featured"],
    ["🚀 Mayor subida", riseText.main, riseText.sub, ""],
    ["⚔️ Pelea por premios", prizeFight.main, prizeFight.sub, "featured"],
    ["🧨 Liderato", topTie.main, topTie.sub, ""],
    ["🔥 Zona de premio", entered.main, entered.sub, ""],
    ["📉 Mayor caída", fallText.main, fallText.sub, ""]
  ];

  document.getElementById("insightGrid").innerHTML = cards.map(([label, main, sub, extra]) => `
    <article class="insight-card ${extra}">
      <p class="insight-label">${label}</p>
      <p class="insight-main">${escapeHtml(main)}</p>
      <p class="insight-sub">${escapeHtml(sub)}</p>
    </article>
  `).join("");
}

function renderStoryStrip(insights, rows) {
  const defended = rows.filter(row => row.puesto_actual <= 5 && row.puesto_anterior && row.puesto_anterior <= 5).length;
  const items = [
    [`🎯 Corte Top 5`, `${insights.cutoff || 0} pts`, `Puntaje mínimo actual para zona de premio`],
    [`📈 Subieron`, `${insights.roseCount}`, `Participantes mejoraron posición`],
    [`📉 Bajaron`, `${insights.fellCount}`, `Participantes perdieron posiciones`],
    [`🛡️ Defendieron premio`, `${defended} de 5`, `Siguen dentro del Top 5`]
  ];

  document.getElementById("storyStrip").innerHTML = items.map(([label, main, sub]) => `
    <article class="story-item">
      <span>${label}</span>
      <strong>${main}</strong>
      <span>${sub}</span>
    </article>
  `).join("");
}

function renderTopFive(rows) {
  const container = document.getElementById("topFive");
  if (!rows.length) {
    container.innerHTML = `<div class="empty">No hay datos para mostrar. Revisa WEB_DATA.</div>`;
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

function namesList(rows) {
  return rows.slice(0, 2).map(row => row.nombre).join(", ") + (rows.length > 2 ? "..." : "");
}

function pick(row, names) {
  for (const name of names) {
    const key = normalizeHeader(name);
    if (Object.prototype.hasOwnProperty.call(row, key) && row[key] !== "") return row[key];
  }
  return "";
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
