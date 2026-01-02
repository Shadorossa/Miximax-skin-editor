const GITHUB_USER = "tu_usuario";
const GITHUB_REPO = "tu_repo";
let detectedFileName = "chara_model_1.03.49.00.cfg.bin";

const currentViewIndex = {};
let selectedTeam = null;

async function autoDetectFile() {
    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/`);
        const files = await res.json();
        const target = files.find(f => f.name.toLowerCase().startsWith("chara_model") && f.name.toLowerCase().endsWith(".bin"));
        if (target) detectedFileName = target.name;
    } catch (e) { console.warn("Detección fallida."); }
}

function forceCacheReload() {
    window.location.replace(window.location.origin + window.location.pathname + '?r=' + new Date().getTime());
}

async function init() {
    await autoDetectFile();
    if (typeof playersData !== 'undefined') renderTeamSelection();
}

function renderTeamSelection() {
    const grid = document.getElementById('team-grid');
    if (!grid) return;
    let teams = [...new Set(playersData.map(p => p.team))].sort((a, b) => a.localeCompare(b));
    grid.innerHTML = teams.map(t => {
        const id = t.replace(/\s/g, '');
        return `<div class="team-box" id="box-${id}" onclick="selectTeam('${t}')">
                    <img src="img/team/${id}.png" onerror="this.src='img/team/default.png'">
                </div>`;
    }).join('');
}

function selectTeam(t) {
    document.querySelectorAll('.team-box').forEach(b => b.classList.remove('selected'));
    const id = t.replace(/\s/g, '');
    if (document.getElementById(`box-${id}`)) document.getElementById(`box-${id}`).classList.add('selected');
    selectedTeam = t;
    document.getElementById('active-team-title').innerHTML = `EQUIPO: <span style="color: #fff">${t.toUpperCase()}</span>`;
    renderPlayerRow(t);
}

function renderPlayerRow(t) {
    const row = document.getElementById('player-row');
    let filtered = playersData.filter(p => p.team === t).sort((a, b) => {
        const nA = a.imgBase.split('/').pop().match(/^\d+/);
        const nB = b.imgBase.split('/').pop().match(/^\d+/);
        return (nA ? parseInt(nA[0]) : 999) - (nB ? parseInt(nB[0]) : 999);
    });

    row.innerHTML = filtered.map((p, i) => {
        const isMix = localStorage.getItem(p.id) === 'true';
        currentViewIndex[p.id] = 0;
        const subHTML = (p.subOptions || []).map(s => {
            const isSub = localStorage.getItem(s.id) === 'true';
            return `<div class="control-unit">
                <label class="switch"><input type="checkbox" id="${s.id}" ${isSub ? 'checked' : ''} onchange="handleToggle('${p.id}')"><span class="slider"></span></label>
                <span class="control-label">${s.name}</span>
            </div>`;
        }).join('');

        const isSame = (p.imgBase === p.imgMiximax) && p.imgMiximax;

        return `<div class="player-card" id="card-${p.id}" style="animation-delay: ${i * 0.04}s">
            <div class="card-img-top">
                ${isSame ? `<span class="indicator-modified" id="ind-${p.id}">2</span>` : ''}
                <div class="img-nav" id="nav-${p.id}" style="display:none">
                    <button onclick="changeView('${p.id}', -1)">❮</button>
                    <button onclick="changeView('${p.id}', 1)">❯</button>
                </div>
                <img src="${p.imgBase}" id="img-display-${p.id}">
            </div>
            <div class="card-info">
                <h3 class="card-name">${p.name}</h3>
                <div class="options-row">
                    <div class="control-unit">
                        <label class="switch"><input type="checkbox" id="${p.id}" ${isMix ? 'checked' : ''} onchange="handleToggle('${p.id}')"><span class="slider"></span></label>
                        <span class="control-label">MIXIMAX</span>
                    </div>
                    ${subHTML}
                </div>
            </div>
        </div>`;
    }).join('');
    filtered.forEach(p => updateVisuals(p.id, false, true));
}

function getActiveImages(p) {
    let versions = [];
    if (document.getElementById(p.id)?.checked && p.imgMiximax) versions.push(p.imgMiximax);
    (p.subOptions || []).forEach(s => {
        if (document.getElementById(s.id)?.checked) {
            if (s.img && s.img !== "") versions.push(s.img);
            else if (p.imgMiximax) versions.push(p.imgMiximax);
        }
    });
    let unique = [...new Set(versions)];
    return unique.length > 0 ? unique : [p.imgBase];
}

function updateVisuals(id, save, initial = false) {
    const p = playersData.find(x => x.id === id);
    const img = document.getElementById(`img-display-${id}`);
    const nav = document.getElementById(`nav-${id}`);
    const sw = document.getElementById(id);

    if (save) {
        localStorage.setItem(id, sw.checked);
        (p.subOptions || []).forEach(s => localStorage.setItem(s.id, document.getElementById(s.id).checked));
    }

    const ind = document.getElementById(`ind-${id}`);
    if (ind) sw.checked ? ind.classList.add('visible') : ind.classList.remove('visible');

    const list = getActiveImages(p);
    if (nav) nav.style.display = list.length >= 2 ? "flex" : "none";
    if (currentViewIndex[id] >= list.length) currentViewIndex[id] = 0;

    const src = list[currentViewIndex[id]];

    if (initial) {
        img.src = src;
        setTimeout(() => img.classList.add('img-visible'), 100);
    } else {
        img.classList.remove('img-visible');
        img.classList.add('img-hidden');
        setTimeout(() => {
            img.src = src;
            img.classList.remove('img-hidden');
            img.classList.add('img-visible');
        }, 250);
    }
}

function changeView(id, dir) {
    const p = playersData.find(x => x.id === id);
    const list = getActiveImages(p);
    currentViewIndex[id] = (currentViewIndex[id] + dir + list.length) % list.length;
    updateVisuals(id, false, false);
}

function handleToggle(id) { updateVisuals(id, true, false); }

// --- FUNCIÓN CORREGIDA PARA EVITAR EL ERROR .forEach ---
async function processAndDownload() {
    try {
        const res = await fetch(detectedFileName + '?v=' + new Date().getTime());
        const buf = await res.arrayBuffer();
        let data = new Uint8Array(buf);

        playersData.forEach(p => {
            // Miximax Principal
            const mAct = (document.getElementById(p.id)?.checked || localStorage.getItem(p.id) === 'true');

            // Convertimos a lista si es un texto solo para que el .forEach funcione siempre
            const hOrig = Array.isArray(p.hexOriginal) ? p.hexOriginal : [p.hexOriginal];
            const hMod = Array.isArray(p.hexModified) ? p.hexModified : [p.hexModified];

            hOrig.forEach((orig, i) => {
                const mod = hMod[i];
                if (orig && mod) {
                    data = replace(data, mAct ? orig : mod, mAct ? mod : orig);
                }
            });

            // Sub-opciones (Armaduras)
            (p.subOptions || []).forEach(s => {
                const sAct = (document.getElementById(s.id)?.checked || localStorage.getItem(s.id) === 'true');

                const shOrig = Array.isArray(s.hexOriginal) ? s.hexOriginal : [s.hexOriginal];
                const shMod = Array.isArray(s.hexModified) ? s.hexModified : [s.hexModified];

                shOrig.forEach((orig, i) => {
                    const mod = shMod[i];
                    if (orig && mod) {
                        data = replace(data, sAct ? orig : mod, sAct ? mod : orig);
                    }
                });
            });
        });

        const blob = new Blob([data], { type: "application/octet-stream" });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = detectedFileName; a.click();
    } catch (e) { alert("Error: " + e.message); }
}

function replace(data, sH, rH) {
    const sB = hexToB(sH), rB = hexToB(rH);
    if (sH === rH) return data;
    for (let i = 0; i <= data.length - sB.length; i++) {
        let m = true;
        for (let j = 0; j < sB.length; j++) if (data[i + j] !== sB[j]) { m = false; break; }
        if (m) data.set(rB, i);
    }
    return data;
}

function hexToB(h) {
    const clean = h.replace(/\s+/g, '');
    let b = [];
    for (let i = 0; i < clean.length; i += 2) b.push(parseInt(clean.substr(i, 2), 16));
    return new Uint8Array(b);
}

function saveConfig() {
    let c = {};
    playersData.forEach(p => {
        c[p.id] = (localStorage.getItem(p.id) === 'true');
        (p.subOptions || []).forEach(s => c[s.id] = (localStorage.getItem(s.id) === 'true'));
    });
    const b = new Blob([JSON.stringify(c, null, 2)], { type: "text/plain" });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = "config.txt"; a.click();
}

function loadConfig(e) {
    const r = new FileReader();
    r.onload = (ev) => {
        const c = JSON.parse(ev.target.result);
        for (const id in c) localStorage.setItem(id, c[id]);
        if (selectedTeam) renderPlayerRow(selectedTeam);
        alert("Cargado");
    };
    r.readAsText(e.target.files[0]);
}

init();