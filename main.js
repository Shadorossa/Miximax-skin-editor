const FILE_NAME = "chara_model_1.03.49.00.cfg.bin";
const currentViewIndex = {};
let selectedTeam = null;

document.addEventListener('DOMContentLoaded', () => {
    renderTeamSelection();
});

function renderTeamSelection() {
    const grid = document.getElementById('team-grid');
    const teams = [...new Set(playersData.filter(p => !p.isSubOption).map(p => p.team))];
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

function renderPlayerRow(teamName) {
    const row = document.getElementById('player-row');
    const filteredPlayers = playersData.filter(p => p.team === teamName && !p.isSubOption);
    row.innerHTML = filteredPlayers.map(player => createPlayerCard(player)).join('');
    filteredPlayers.forEach(p => updateVisuals(p.id, false, true));
}

function createPlayerCard(player) {
    const isChecked = localStorage.getItem(player.id) === 'true';
    if (!currentViewIndex[player.id]) currentViewIndex[player.id] = 0;

    return `
        <div class="player-card" id="card-${player.id}">
            <div class="card-img-top" id="container-${player.id}">
                <div class="img-nav" id="nav-${player.id}" style="display:none">
                    <button onclick="changeView('${player.id}', -1)">❮</button>
                    <button onclick="changeView('${player.id}', 1)">❯</button>
                </div>
                <img src="${player.imgBase}" id="img-display-${player.id}" class="img-visible">
            </div>
            <div class="card-info">
                <div class="card-name-container">
                    <h3 class="card-name">${player.name}</h3>
                </div>
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
        </div>
    `;
}

function handleToggle(id) {
    const card = document.getElementById(`card-${id}`);
    if (card) {
        card.classList.remove('energy-effect');
        void card.offsetWidth;
        card.classList.add('energy-effect');
    }
    updateVisuals(id, true, false);
}

function updateVisuals(mainId, save, isInitial = false) {
    const player = playersData.find(p => p.id === mainId);
    const imgElement = document.getElementById(`img-display-${mainId}`);
    const nav = document.getElementById(`nav-${mainId}`);
    const checkMiximax = document.getElementById(mainId).checked;

    if (save) localStorage.setItem(mainId, checkMiximax);

    let activeImages = [];
    if (mainId === "flora_base") {
        const checkArmor = document.getElementById("flora_armadura").checked;
        if (save) localStorage.setItem("flora_armadura", checkArmor);
        if (checkMiximax) activeImages.push(player.imgMiximax);
        if (checkArmor) activeImages.push(player.imgArmadura);
    } else {
        if (checkMiximax) activeImages.push(player.imgMiximax);
    }

    if (activeImages.length === 0) activeImages = [player.imgBase];
    if (nav) nav.style.display = activeImages.length > 1 ? "flex" : "none";

    const targetSrc = activeImages[currentViewIndex[mainId] || 0];

    if (isInitial) {
        imgElement.src = targetSrc;
    } else {
        imgElement.classList.add('img-hidden');
        setTimeout(() => {
            if (currentViewIndex[mainId] >= activeImages.length) currentViewIndex[mainId] = 0;
            imgElement.src = targetSrc;
            imgElement.classList.remove('img-hidden');
            imgElement.classList.add('img-visible');
        }, 200);
    }
}

function changeView(id, dir) {
    const player = playersData.find(p => p.id === id);
    let activeImages = [];
    if (document.getElementById(id).checked) activeImages.push(player.imgMiximax);
    if (id === "flora_base" && document.getElementById("flora_armadura").checked) activeImages.push(player.imgArmadura);
    if (activeImages.length === 0) activeImages = [player.imgBase];

    const imgElement = document.getElementById(`img-display-${id}`);
    imgElement.classList.add('img-hidden');
    setTimeout(() => {
        currentViewIndex[id] = (currentViewIndex[id] + dir + activeImages.length) % activeImages.length;
        imgElement.src = activeImages[currentViewIndex[id]];
        imgElement.classList.remove('img-hidden');
        imgElement.classList.add('img-visible');
    }, 200);
}

// LÓGICA HEXADECIMAL
async function processAndDownload() {
    try {
        const res = await fetch(FILE_NAME);
        if (!res.ok) throw new Error("Base .bin no encontrada.");
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