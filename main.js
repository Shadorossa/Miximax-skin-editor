const FILE_NAME = "chara_model_1.03.49.00.cfg";
const currentViewIndex = {};
let selectedTeam = null;

function forceCacheReload() {
    const cleanUrl = window.location.origin + window.location.pathname;
    window.location.href = cleanUrl + '?update=' + new Date().getTime();
}

document.addEventListener('DOMContentLoaded', () => { renderTeamSelection(); });

// --- LÓGICA DE EQUIPOS ---
function renderTeamSelection() {
    const grid = document.getElementById('team-grid');
    let teams = [...new Set(playersData.filter(p => !p.isSubOption).map(p => p.team))];
    teams.sort((a, b) => a.localeCompare(b));

    grid.innerHTML = teams.map(teamName => {
        const teamId = teamName.replace(/\s/g, '');
        return `<div class="team-box" id="box-${teamId}" onclick="selectTeam('${teamName}')" title="${teamName}">
                    <img src="img/team/${teamId}.png" onerror="this.src='img/team/default.png'">
                </div>`;
    }).join('');
}

function selectTeam(teamName) {
    document.querySelectorAll('.team-box').forEach(b => b.classList.remove('selected'));
    const teamId = teamName.replace(/\s/g, '');
    if (document.getElementById(`box-${teamId}`)) document.getElementById(`box-${teamId}`).classList.add('selected');
    selectedTeam = teamName;
    document.getElementById('active-team-title').innerHTML = `EQUIPO: <span style="color: #fff">${teamName.toUpperCase()}</span>`;
    renderPlayerRow(teamName);
}

// --- LÓGICA JUGADORES CON INDICADOR ---
function getPlayerNumber(path) {
    const filename = path.split('/').pop();
    const match = filename.match(/^\d+/);
    return match ? parseInt(match[0]) : 999999;
}

function renderPlayerRow(teamName) {
    const row = document.getElementById('player-row');
    let filteredPlayers = playersData.filter(p => p.team === teamName && !p.isSubOption);
    filteredPlayers.sort((a, b) => getPlayerNumber(a.imgBase) - getPlayerNumber(b.imgBase));

    row.innerHTML = filteredPlayers.map((player, index) => {
        const isChecked = localStorage.getItem(player.id) === 'true';
        currentViewIndex[player.id] = 0;

        // DETECCIÓN: ¿Tienen la misma imagen base y miximax?
        // Si es así, preparamos el indicador (oculto por ahora)
        const hasIdenticalImages = (player.imgBase === player.imgMiximax) && player.imgMiximax;
        const indicatorHTML = hasIdenticalImages ? `<span class="indicator-modified" id="ind-${player.id}">2</span>` : '';

        return `
        <div class="player-card" id="card-${player.id}" style="animation-delay: ${index * 0.05}s">
            <div class="card-img-top" id="container-${player.id}">
                ${indicatorHTML} <div class="img-nav" id="nav-${player.id}" style="display:none">
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

    filteredPlayers.forEach(p => updateVisuals(p.id, false, true));
}

function getActiveImages(player) {
    let images = [];
    const checkMiximax = document.getElementById(player.id)?.checked;
    if (player.id === "flora_base") {
        const checkArmor = document.getElementById("flora_armadura")?.checked;
        if (checkMiximax) images.push(player.imgMiximax);
        if (checkArmor) images.push(player.imgArmadura);
    } else { if (checkMiximax) images.push(player.imgMiximax); }
    return images.length > 0 ? images : [player.imgBase];
}

function updateVisuals(mainId, save, isInitial = false) {
    const player = playersData.find(p => p.id === mainId);
    const imgElement = document.getElementById(`img-display-${mainId}`);
    const nav = document.getElementById(`nav-${mainId}`);
    const mainSwitch = document.getElementById(mainId);

    if (save) {
        localStorage.setItem(mainId, mainSwitch.checked);
        if (mainId === "flora_base") localStorage.setItem("flora_armadura", document.getElementById("flora_armadura").checked);
        currentViewIndex[mainId] = 0;
    }

    // LÓGICA DEL INDICADOR "2" ROJO
    // Buscamos si existe el indicador para este jugador
    const indicator = document.getElementById(`ind-${mainId}`);
    if (indicator) {
        // Solo lo mostramos si el switch principal (Miximax) está activado
        if (mainSwitch.checked) {
            indicator.classList.add('visible');
        } else {
            indicator.classList.remove('visible');
        }
    }

    const activeImages = getActiveImages(player);
    if (nav) nav.style.display = activeImages.length > 1 ? "flex" : "none";
    const targetSrc = activeImages[currentViewIndex[mainId] || 0];

    if (isInitial) {
        imgElement.src = targetSrc;
        setTimeout(() => imgElement.classList.add('img-visible'), 100);
    } else {
        imgElement.classList.remove('img-visible');
        imgElement.classList.add('img-hidden');

        const animationPromise = new Promise(resolve => setTimeout(resolve, 250));
        const imageLoadPromise = new Promise(resolve => {
            const temp = new Image();
            temp.onload = () => resolve();
            temp.onerror = () => resolve();
            temp.src = targetSrc;
        });

        Promise.all([animationPromise, imageLoadPromise]).then(() => {
            imgElement.src = targetSrc;
            imgElement.classList.remove('img-hidden');
            imgElement.classList.add('img-visible');
        });
    }
}

function changeView(id, dir) {
    const player = playersData.find(p => p.id === id);
    const activeImages = getActiveImages(player);
    const imgElement = document.getElementById(`img-display-${id}`);
    const newIndex = (currentViewIndex[id] + dir + activeImages.length) % activeImages.length;
    const targetSrc = activeImages[newIndex];

    imgElement.classList.remove('img-visible');
    imgElement.classList.add('img-hidden');

    const animationPromise = new Promise(resolve => setTimeout(resolve, 250));
    const imageLoadPromise = new Promise(resolve => {
        const temp = new Image();
        temp.onload = () => resolve();
        temp.src = targetSrc;
    });

    Promise.all([animationPromise, imageLoadPromise]).then(() => {
        currentViewIndex[id] = newIndex;
        imgElement.src = targetSrc;
        imgElement.classList.remove('img-hidden');
        imgElement.classList.add('img-visible');
    });
}

function handleToggle(id) { updateVisuals(id, true, false); }

// --- MOTOR HEXADECIMAL (Sin cambios) ---
async function processAndDownload() {
    try {
        const res = await fetch(FILE_NAME);
        if (!res.ok) throw new Error("Archivo .bin no encontrado.");
        const buffer = await res.arrayBuffer();
        let data = new Uint8Array(buffer);
        playersData.forEach(p => {
            const el = document.getElementById(p.id) || { checked: localStorage.getItem(p.id) === 'true' };
            const active = el.checked;
            const sH = active ? p.hexOriginal : p.hexModified;
            const rH = active ? p.hexModified : p.hexOriginal;
            if (sH && rH && !sH.includes("HEX_")) data = replaceByteSequence(data, sH, rH);
        });
        const blob = new Blob([data], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = FILE_NAME; a.click();
    } catch (e) { alert(e.message); }
}

function replaceByteSequence(data, sH, rH) {
    const sB = hexToBytes(sH), rB = hexToBytes(rH);
    if (sB.length !== rB.length) return data;
    for (let i = 0; i <= data.length - sB.length; i++) {
        let match = true;
        for (let j = 0; j < sB.length; j++) if (data[i + j] !== sB[j]) { match = false; break; }
        if (match) data.set(rB, i);
    }
    return data;
}

function hexToBytes(hex) {
    const clean = hex.replace(/\s+/g, '');
    let b = [];
    for (let i = 0; i < clean.length; i += 2) b.push(parseInt(clean.substr(i, 2), 16));
    return new Uint8Array(b);
}

function saveConfig() {
    let c = {};
    playersData.forEach(p => { c[p.id] = (localStorage.getItem(p.id) === 'true'); });
    const b = new Blob([JSON.stringify(c, null, 2)], { type: "text/plain" });
    const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = "config_miximax.txt"; a.click();
}

function loadConfig(event) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const config = JSON.parse(e.target.result);
        for (const id in config) { localStorage.setItem(id, config[id]); }
        if (selectedTeam) renderPlayerRow(selectedTeam);
        alert("Configuración cargada.");
    };
    reader.readAsText(event.target.files[0]);
}