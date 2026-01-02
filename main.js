/**
 * CONFIGURACIÓN DE REPOSITORIO
 * Asegúrate de que estos nombres coincidan con tu cuenta de GitHub
 */
const GITHUB_USER = "tu_usuario";
const GITHUB_REPO = "tu_repo";
let detectedFileName = "chara_model_1.03.49.00.cfg.bin";

const currentViewIndex = {};
let selectedTeam = null;

// --- 1. RECARGA DE EMERGENCIA ---
function forceCacheReload() {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.location.replace(cleanUrl + '?reload=' + new Date().getTime());
}

// --- 2. DETECCIÓN AUTOMÁTICA DEL ARCHIVO .BIN ---
async function autoDetectFile() {
    try {
        const apiUrl = `https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/`;
        const res = await fetch(apiUrl);
        if (!res.ok) return;
        const files = await res.json();
        const target = files.find(f =>
            f.name.toLowerCase().startsWith("chara_model") &&
            f.name.toLowerCase().endsWith(".bin")
        );
        if (target) {
            detectedFileName = target.name;
            console.log("Archivo detectado:", detectedFileName);
        }
    } catch (e) {
        console.warn("API de GitHub no disponible, usando nombre base.");
    }
}

// --- 3. INICIALIZADOR PRINCIPAL ---
async function startEditor() {
    console.log("Iniciando Editor...");

    // Esperamos a que el .bin sea detectado
    await autoDetectFile();

    // Verificamos si los datos existen
    if (typeof playersData === 'undefined') {
        console.error("CRÍTICO: No se ha encontrado 'playersData'. Revisa que data.js no tenga errores de sintaxis.");
        alert("Error: No se pudieron cargar los datos de los jugadores.");
        return;
    }

    renderTeamSelection();
}

// --- 4. RENDERIZADO DE EQUIPOS ---
function renderTeamSelection() {
    const grid = document.getElementById('team-grid');
    if (!grid) return;

    // Obtenemos equipos únicos y ordenamos alfabéticamente
    let teams = [...new Set(playersData.filter(p => !p.isSubOption).map(p => p.team))];
    teams.sort((a, b) => a.localeCompare(b));

    grid.innerHTML = teams.map(teamName => {
        const teamId = teamName.replace(/\s/g, '');
        return `
            <div class="team-box" id="box-${teamId}" onclick="selectTeam('${teamName}')" title="${teamName}">
                <img src="img/team/${teamId}.png" onerror="this.src='img/team/default.png'">
            </div>
        `;
    }).join('');

    console.log("Equipos renderizados:", teams.length);
}

function selectTeam(teamName) {
    document.querySelectorAll('.team-box').forEach(b => b.classList.remove('selected'));
    const teamId = teamName.replace(/\s/g, '');
    const box = document.getElementById(`box-${teamId}`);
    if (box) box.classList.add('selected');

    selectedTeam = teamName;
    document.getElementById('active-team-title').innerHTML = `EQUIPO: <span style="color: #fff">${teamName.toUpperCase()}</span>`;
    renderPlayerRow(teamName);
}

// --- 5. RENDERIZADO JUGADORES (ORDEN NUMÉRICO + INDICADOR 2) ---
function getPlayerNumber(path) {
    const filename = path.split('/').pop();
    const match = filename.match(/^\d+/);
    return match ? parseInt(match[0]) : 999999;
}

function renderPlayerRow(teamName) {
    const row = document.getElementById('player-row');
    let filtered = playersData.filter(p => p.team === teamName && !p.isSubOption);

    // Ordenamos por el número de la imagen
    filtered.sort((a, b) => getPlayerNumber(a.imgBase) - getPlayerNumber(b.imgBase));

    row.innerHTML = filtered.map((player, index) => {
        const isChecked = localStorage.getItem(player.id) === 'true';
        currentViewIndex[player.id] = 0;

        const hasSameImg = (player.imgBase === player.imgMiximax) && player.imgMiximax;
        const indicator = hasSameImg ? `<span class="indicator-modified" id="ind-${player.id}">2</span>` : '';

        return `
        <div class="player-card" id="card-${player.id}" style="animation-delay: ${index * 0.05}s">
            <div class="card-img-top">
                ${indicator}
                <div class="img-nav" id="nav-${player.id}" style="display:none">
                    <button onclick="changeView('${player.id}', -1)">❮</button>
                    <button onclick="changeView('${player.id}', 1)">❯</button>
                </div>
                <img src="${player.imgBase}" id="img-display-${player.id}">
            </div>
            <div class="card-info">
                <div class="card-name-container"><h3 class="card-name">${player.name}</h3></div>
                <div class="options-row">
                    <div class="control-unit">
                        <label class="switch">
                            <input type="checkbox" id="${player.id}" ${isChecked ? 'checked' : ''} onchange="handleToggle('${player.id}')">
                            <span class="slider"></span>
                        </label>
                        <span class="control-label">MIXIMAX</span>
                    </div>
                    ${player.id === "flora_base" ? `
                    <div class="control-unit">
                        <label class="switch">
                            <input type="checkbox" id="flora_armadura" ${localStorage.getItem("flora_armadura") === 'true' ? 'checked' : ''} onchange="handleToggle('flora_base')">
                            <span class="slider"></span>
                        </label>
                        <span class="control-label">ARMADURA</span>
                    </div>` : ''}
                </div>
            </div>
        </div>`;
    }).join('');

    filtered.forEach(p => updateVisuals(p.id, false, true));
}

// --- 6. GESTIÓN DE IMÁGENES ---
function getActiveImages(player) {
    let images = [];
    const mix = document.getElementById(player.id)?.checked;
    if (player.id === "flora_base") {
        const arm = document.getElementById("flora_armadura")?.checked;
        if (mix) images.push(player.imgMiximax);
        if (arm) images.push(player.imgArmadura);
    } else { if (mix) images.push(player.imgMiximax); }
    return images.length > 0 ? images : [player.imgBase];
}

function updateVisuals(id, save, initial = false) {
    const p = playersData.find(x => x.id === id);
    const img = document.getElementById(`img-display-${id}`);
    const nav = document.getElementById(`nav-${id}`);
    const sw = document.getElementById(id);
    if (!img) return;

    if (save) {
        localStorage.setItem(id, sw.checked);
        if (id === "flora_base") localStorage.setItem("flora_armadura", document.getElementById("flora_armadura").checked);
        currentViewIndex[id] = 0;
    }

    const ind = document.getElementById(`ind-${id}`);
    if (ind) sw.checked ? ind.classList.add('visible') : ind.classList.remove('visible');

    const active = getActiveImages(p);
    if (nav) nav.style.display = active.length > 1 ? "flex" : "none";
    const src = active[currentViewIndex[id] || 0];

    if (initial) {
        img.src = src;
        setTimeout(() => img.classList.add('img-visible'), 100);
    } else {
        img.classList.remove('img-visible');
        img.classList.add('img-hidden');
        const p1 = new Promise(r => setTimeout(r, 250));
        const p2 = new Promise(r => { const t = new Image(); t.onload = r; t.src = src; });
        Promise.all([p1, p2]).then(() => {
            img.src = src;
            img.classList.remove('img-hidden');
            img.classList.add('img-visible');
        });
    }
}

function changeView(id, dir) {
    const p = playersData.find(x => x.id === id);
    const active = getActiveImages(p);
    const img = document.getElementById(`img-display-${id}`);
    const next = (currentViewIndex[id] + dir + active.length) % active.length;

    img.classList.remove('img-visible');
    img.classList.add('img-hidden');
    const p1 = new Promise(r => setTimeout(r, 250));
    const p2 = new Promise(r => { const t = new Image(); t.onload = r; t.src = active[next]; });

    Promise.all([p1, p2]).then(() => {
        currentViewIndex[id] = next;
        img.src = active[next];
        img.classList.remove('img-hidden');
        img.classList.add('img-visible');
    });
}

function handleToggle(id) { updateVisuals(id, true, false); }

// --- 7. PROCESAMIENTO BINARIO ---
async function processAndDownload() {
    try {
        const res = await fetch(detectedFileName + '?v=' + new Date().getTime());
        if (!res.ok) throw new Error("No se pudo cargar el archivo base .bin");
        const buf = await res.arrayBuffer();
        let data = new Uint8Array(buf);
        playersData.forEach(p => {
            const el = document.getElementById(p.id) || { checked: localStorage.getItem(p.id) === 'true' };
            const act = el.checked;
            const sH = act ? p.hexOriginal : p.hexModified;
            const rH = act ? p.hexModified : p.hexOriginal;
            if (sH && rH && !sH.includes("HEX_")) data = replace(data, sH, rH);
        });
        const b = new Blob([data], { type: "application/octet-stream" });
        const u = URL.createObjectURL(b);
        const a = document.createElement('a'); a.href = u; a.download = detectedFileName; a.click();
    } catch (e) { alert(e.message); }
}

function replace(data, sH, rH) {
    const sB = hexToB(sH), rB = hexToB(rH);
    for (let i = 0; i <= data.length - sB.length; i++) {
        let m = true;
        for (let j = 0; j < sB.length; j++) if (data[i + j] !== sB[j]) { m = false; break; }
        if (m) data.set(rB, i);
    }
    return data;
}

function hexToB(h) {
    const c = h.replace(/\s+/g, '');
    let b = [];
    for (let i = 0; i < c.length; i += 2) b.push(parseInt(c.substr(i, 2), 16));
    return new Uint8Array(b);
}

function saveConfig() {
    let c = {};
    playersData.forEach(p => { c[p.id] = (localStorage.getItem(p.id) === 'true'); });
    const b = new Blob([JSON.stringify(c, null, 2)], { type: "text/plain" });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a'); a.href = u; a.download = "config_miximax.txt"; a.click();
}

function loadConfig(e) {
    const r = new FileReader();
    r.onload = (ev) => {
        const c = JSON.parse(ev.target.result);
        for (const id in c) { localStorage.setItem(id, c[id]); }
        if (selectedTeam) renderPlayerRow(selectedTeam);
        alert("Configuración cargada.");
    };
    r.readAsText(e.target.files[0]);
}

// LANZAMIENTO
startEditor();