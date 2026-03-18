const sceneFrame = document.querySelector(".scene-frame");
const metricsPanel = document.getElementById("metricsPanel");
const river = document.getElementById("river");
const lightRaysLayer = river.querySelector(".light-rays");
const animalLayer = document.getElementById("animalLayer");
const trashLayer = document.getElementById("trashLayer");
const treatmentOverlay = document.getElementById("treatmentOverlay");
const hiddenExportMetricsNode = document.getElementById("hiddenExportMetrics");
const downloadWaterCsvButton = document.getElementById("downloadWaterCsv");
const model = window.WATER_QUALITY_MODEL;

if (!model) {
    throw new Error("No se encontro WATER_QUALITY_MODEL. Carga water_quality_model.js antes de este script.");
}

const fishSpriteMap = {
    tilapia: "assets/visual/fish/fish_1.webp",
    bagre: "assets/visual/fish/fish_2.webp",
    trucha: "assets/visual/fish/fish_3.webp"
};
const livestockSpriteMap = {
    vacas: "assets/visual/animals/cow.webp",
    cerdos: "assets/visual/animals/pig.webp",
    pollos: "assets/visual/animals/chicken.webp",
    ovejas: "assets/visual/animals/sheep.webp"
};
const livestockZones = {
    vacas: { xMin: 3, xMax: 16, yMin: 46, yMax: 66, baseSize: 20, sizeJitter: 10 },
    cerdos: { xMin: 3, xMax: 16, yMin: 46, yMax: 66, baseSize: 12, sizeJitter: 10 },
    pollos: { xMin: 3, xMax: 16, yMin: 46, yMax: 66, baseSize: 8, sizeJitter: 10 },
    ovejas: { xMin: 3, xMax: 16, yMin: 46, yMax: 66, baseSize: 4, sizeJitter: 10 }
};
const livestockControls = ["pollos", "ovejas", "vacas", "cerdos"];
const fishSpecies = ["tilapia", "bagre", "trucha"];
const trashSpriteSrc = "assets/visual/trash.webp";
const floatingTrashCount = 3;
const trashZone = { xMin: 62, xMax: 88, yMin: 86, yMax: 96, baseSize: 70 };
const treatmentOverlayMap = {
    planta: "assets/visual/structures/treatment.webp",
    pozo: "assets/visual/structures/septic.webp",
    descarga: "assets/visual/structures/direct.webp"
};
let aliveFishes = [];
let deadFishes = [];
let bubbles = [];
let plants = [];
let algaeElements = [];
let trashSprites = [];
const livestockSprites = {
    pollos: [],
    ovejas: [],
    vacas: [],
    cerdos: []
};
const livestockMotionState = new WeakMap();
const livestockMotionConfig = {
    maxOffsetPx: 3,
    minStepPx: 0.35,
    maxStepPx: 0.9,
    minIntervalMs: 700,
    maxIntervalMs: 2300
};

const collisionCanvas = document.createElement("canvas");
const collisionContext = collisionCanvas.getContext("2d", { willReadFrequently: true });
const collisionImage = new Image();
let collisionMap = null;
let collisionImageLoaded = false;

const waterStops = model.waterStops;
const maxTotalFish = model.parameters?.visual?.fishMaxTotal ?? 20;
const maxLightRaysOnScene = 6;
let activeLightRays = [];
let pendingLightRayProfile = {
    coreRgb: "232, 246, 255",
    edgeRgb: "160, 210, 232",
    peakOpacity: 0.62,
    swayMin: 8.5,
    swayMax: 13.5,
    fadeMin: 4.6,
    fadeMax: 7.2
};
const metricDefinitions = {
    ph: {
        label: "pH",
        caption: "Balance &aacute;cido-base",
        unit: "escala",
        tone: "ph",
        defaultValue: "7.0",
        icon: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3C9 6.8 6.5 9.7 6.5 13a5.5 5.5 0 0 0 11 0C17.5 9.7 15 6.8 12 3Z"></path>
                <path d="M9.5 13.5c.5 1 1.3 1.7 2.5 2"></path>
            </svg>
        `
    },
    od: {
        label: "Ox&iacute;geno disuelto",
        caption: "Aire disponible en el agua",
        unit: "mg/L",
        tone: "od",
        defaultValue: "7.0",
        icon: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="8" cy="10" r="3"></circle>
                <circle cx="15.5" cy="8.5" r="2.5"></circle>
                <circle cx="14" cy="15" r="4"></circle>
            </svg>
        `
    },
    dbo: {
        label: "DBO",
        caption: "Materia organica consumida",
        unit: "mg/L",
        tone: "dbo",
        defaultValue: "10.0",
        icon: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8 4v5l-3.5 5.5A3 3 0 0 0 7 19h10a3 3 0 0 0 2.5-4.5L16 9V4"></path>
                <path d="M9 4h6"></path>
                <path d="M8 13h8"></path>
            </svg>
        `
    },
    turbidez: {
        label: "Turbidez",
        caption: "Particulas suspendidas",
        unit: "NTU",
        tone: "turbidez",
        defaultValue: "70",
        icon: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 9c2-2 4-2 6 0s4 2 6 0 4-2 4 0"></path>
                <path d="M4 15c2-2 4-2 6 0s4 2 6 0 4-2 4 0"></path>
                <circle cx="8" cy="12" r="1"></circle>
                <circle cx="16" cy="12" r="1"></circle>
            </svg>
        `
    },
    nitratos: {
        label: "Nitratos",
        caption: "Nutrientes nitrogenados",
        unit: "mg/L",
        tone: "nitratos",
        defaultValue: "15.0",
        icon: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v16"></path>
                <path d="M12 9c4 0 6-2 7-4 0 6-2.5 10-7 10"></path>
                <path d="M12 11c-4 0-6-2-7-4 0 6 2.5 10 7 10"></path>
            </svg>
        `
    },
    fosfatos: {
        label: "Fosfatos",
        caption: "Nutrientes fosforados",
        unit: "mg/L",
        tone: "fosfatos",
        defaultValue: "2.0",
        icon: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4l3 3-3 3-3-3 3-3Z"></path>
                <path d="M12 10v10"></path>
                <path d="M8 15h8"></path>
                <path d="M9 20h6"></path>
            </svg>
        `
    },
    conductividad: {
        label: "Conductividad",
        caption: "Sales y carga ionica",
        unit: "&micro;S/cm",
        tone: "conductividad",
        defaultValue: "420",
        icon: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13 2 6 13h5l-1 9 8-12h-5l0-8Z"></path>
            </svg>
        `
    },
    icg: {
        label: "&Iacute;ndice global",
        caption: "Estado general del rio",
        unit: "0-100",
        tone: "icg",
        defaultValue: "50",
        icon: `
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 3 19 6v6c0 4.2-2.8 7.7-7 9-4.2-1.3-7-4.8-7-9V6l7-3Z"></path>
                <path d="m9 12 2 2 4-4"></path>
            </svg>
        `
    }
};
const metricOrder = ["ph", "od", "dbo", "turbidez", "nitratos", "fosfatos", "conductividad", "icg"];
const exportFieldDefinitions = [
    { key: "oxigenoDisuelto", label: "Ox\u00edgeno disuelto mg/L", digits: 2 },
    { key: "oxigenoSaturacion", label: "Ox\u00edgeno de saturaci\u00f3n mg/L", digits: 2 },
    { key: "sst", label: "SST mg/L", digits: 2 },
    { key: "dqo", label: "DQO mg/L", digits: 2 },
    { key: "conductividad", label: "Conductividad uS/cm", digits: 0 },
    { key: "ph", label: "pH", digits: 2 },
    { key: "nt", label: "NT mg/L", digits: 2 },
    { key: "pt", label: "PT mg/L", digits: 2 },
    { key: "dbo5", label: "DBO5 mg/L", digits: 2 },
    { key: "alcalinidad", label: "Alcalinidad mg/L Ca CO3", digits: 2 },
    { key: "dureza", label: "Dureza mg/L CaCO3", digits: 2 },
    { key: "coliformesTotales", label: "Coliformes totales NMP/100mL", digits: 0 }
];
let latestExportMetrics = null;

class FishEntity {
    constructor({ species, dead = false }) {
        this.species = species;
        this.dead = dead;
        this.isDying = false;
        this.element = document.createElement("div");
        this.element.className = dead ? "fish dead" : "fish spawning";

        this.img = document.createElement("img");
        this.img.src = fishSpriteMap[species] || fishSpriteMap.bagre;
        this.element.appendChild(this.img);

        this.width = 72;
        this.height = 40;

        if (dead) {
            this.findDeadStartPosition();
            this.speedX = 0;
            this.speedY = 0;
            this.direction = Math.random() < 0.5 ? -1 : 1;
        } else {
            this.findValidStartPosition();
            this.speedX = (Math.random() - 0.5) * 2.2;
            if (Math.abs(this.speedX) < 0.5) this.speedX = this.speedX < 0 ? -0.5 : 0.5;
            this.speedY = (Math.random() - 0.5) * 0.8;
            this.direction = this.speedX > 0 ? 1 : -1;
        }

        this.updateElement();
        river.appendChild(this.element);

        if (!dead) {
            this.isSpawning = true;
            setTimeout(() => {
                this.isSpawning = false;
                this.element.classList.remove("spawning");
            }, 1000);
        } else {
            this.isSpawning = false;
        }
    }

    findValidStartPosition() {
        const validPosition = findRandomValidFishPosition(this.width, this.height, this.species);
        if (validPosition) {
            this.x = validPosition.x;
            this.y = validPosition.y;
            return;
        }

        const limits = getFishVerticalLimits(this.species);
        this.x = river.offsetWidth * 0.45;
        this.y = limits.minY + (limits.maxY - limits.minY) * 0.5;
    }

    findDeadStartPosition() {
        const minY = river.offsetHeight * 0.12;
        const maxY = river.offsetHeight * 0.3;
        this.x = Math.random() * Math.max(1, river.offsetWidth - this.width);
        this.y = minY + Math.random() * Math.max(1, maxY - minY);
    }

    recoverFromInvalidPosition() {
        if (this.dead) return;
        const validPosition = findRandomValidFishPosition(this.width, this.height, this.species);
        if (validPosition) {
            this.x = validPosition.x;
            this.y = validPosition.y;
            this.speedX *= -1;
            this.speedY *= -1;
            this.direction = this.speedX > 0 ? 1 : -1;
        }
    }

    updateElement() {
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
        this.element.style.setProperty("--fish-direction", this.direction);
        if (!this.dead && !this.isSpawning) {
            this.element.style.transform = `scaleX(${this.direction})`;
        } else if (this.dead) {
            this.element.style.transform = `rotate(165deg) scaleX(${this.direction})`;
        }
    }

    update() {
        if (this.dead || this.isDying) return;

        if (!canFishMoveTo(this.x, this.y, this.width, this.height, this.species)) {
            this.recoverFromInvalidPosition();
        }

        const nextX = this.x + this.speedX;
        const nextY = this.y + this.speedY;

        if (!canFishMoveTo(nextX, this.y, this.width, this.height, this.species)) {
            this.speedX *= -1;
            this.direction *= -1;
            this.x += this.speedX;
        } else {
            this.x = nextX;
        }

        if (!canFishMoveTo(this.x, nextY, this.width, this.height, this.species)) {
            this.speedY *= -1;
            this.y += this.speedY;
        } else {
            this.y = nextY;
        }

        if (!canFishMoveTo(this.x, this.y, this.width, this.height, this.species)) {
            this.recoverFromInvalidPosition();
        }

        if (Math.random() < 0.02) {
            this.speedY += (Math.random() - 0.5) * 0.18;
            this.speedY = Math.max(-0.8, Math.min(0.8, this.speedY));
        }

        if (Math.random() < 0.01) {
            this.speedX += (Math.random() - 0.5) * 0.25;
            this.speedX = Math.max(-2.2, Math.min(2.2, this.speedX));
            if (Math.abs(this.speedX) < 0.4) this.speedX = this.speedX < 0 ? -0.4 : 0.4;
            if (this.speedX > 0 && this.direction < 0) this.direction = 1;
            if (this.speedX < 0 && this.direction > 0) this.direction = -1;
        }

        this.updateElement();
    }

    startDying() {
        if (this.dead || this.isDying) return;
        this.isDying = true;
        this.element.classList.remove("spawning");
        this.element.classList.add("dying");
        setTimeout(() => this.remove(), 2000);
    }

    remove() {
        this.element.remove();
    }
}

function syncFishPool(pool, targetBySpecies, dead) {
    fishSpecies.forEach((species) => {
        const targetCount = Math.max(0, Math.round(Number(targetBySpecies?.[species] ?? 0)));
        let speciesFishes = pool.filter((fish) => fish.species === species);

        while (speciesFishes.length < targetCount) {
            const entity = new FishEntity({ species, dead });
            pool.push(entity);
            speciesFishes.push(entity);
        }

        while (speciesFishes.length > targetCount) {
            const entity = speciesFishes.pop();
            if (!entity) break;
            const index = pool.indexOf(entity);
            if (index >= 0) pool.splice(index, 1);
            if (dead) {
                entity.remove();
            } else {
                entity.startDying();
            }
        }
    });

    return pool;
}

function setFishPopulation(visual) {
    const fishAlive = visual?.fishAlive ?? { tilapia: 0, bagre: 0, trucha: 0 };
    const fishDead = visual?.fishDead ?? { tilapia: 0, bagre: 0, trucha: 0 };

    const aliveTargetTotal = fishSpecies.reduce((acc, species) => acc + Math.max(0, Number(fishAlive[species] ?? 0)), 0);
    const capRatio = aliveTargetTotal > maxTotalFish ? maxTotalFish / aliveTargetTotal : 1;
    const cappedAlive = {};
    fishSpecies.forEach((species) => {
        cappedAlive[species] = Math.round(Math.max(0, Number(fishAlive[species] ?? 0)) * capRatio);
    });

    aliveFishes = syncFishPool(aliveFishes, cappedAlive, false);
    deadFishes = syncFishPool(deadFishes, fishDead, true);

    aliveFishes = aliveFishes.filter((fish) => document.body.contains(fish.element));
    deadFishes = deadFishes.filter((fish) => document.body.contains(fish.element));
}

function animateFishes(now = performance.now()) {
    aliveFishes.forEach((fish) => fish.update());
    deadFishes.forEach((fish) => fish.update());
    updateLivestockMotion(now);
    requestAnimationFrame(animateFishes);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function map(value, inMin, inMax, outMin, outMax) {
    const normalized = (value - inMin) / (inMax - inMin);
    return outMin + normalized * (outMax - outMin);
}

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function renderMetricsPanel() {
    if (!metricsPanel) return;

    metricsPanel.innerHTML = metricOrder
        .map((metricKey) => {
            const metric = metricDefinitions[metricKey];
            return `
                <article class="metric-card" data-metric="${metricKey}" data-tone="${metric.tone}" data-level="medium" data-state="warn">
                    <div class="metric-copy">
                        <div class="metric-top">
                            <div class="metric-icon">${metric.icon}</div>
                            <div class="metric-heading">
                                <div class="metric-label">${metric.label}</div>
                                <div class="metric-caption">${metric.caption}</div>
                            </div>
                        </div>
                        <div class="metric-value-row">
                            <div class="metric-value" id="metric-${metricKey}">${metric.defaultValue}</div>
                            <div class="metric-unit">${metric.unit}</div>
                        </div>
                    </div>
                    <div class="metric-status">
                        <div class="metric-level" data-role="level">Medio</div>
                        <div class="metric-scale" aria-hidden="true">
                            <span data-band="low"></span>
                            <span data-band="medium"></span>
                            <span data-band="high"></span>
                        </div>
                    </div>
                </article>
            `;
        })
        .join("");
}

function resolveMetricDescriptor(metricKey, rawValue) {
    const value = Number(rawValue);

    switch (metricKey) {
        case "ph":
            if (value < 6.5) return { level: "low", label: "Bajo", state: "bad" };
            if (value < 6.8) return { level: "low", label: "Bajo", state: "warn" };
            if (value <= 7.6) return { level: "medium", label: "Medio", state: "good" };
            if (value <= 8.0) return { level: "high", label: "Alto", state: "warn" };
            return { level: "high", label: "Alto", state: "bad" };
        case "od":
            if (value < 5) return { level: "low", label: "Bajo", state: "bad" };
            if (value < 7) return { level: "medium", label: "Medio", state: "warn" };
            return { level: "high", label: "Alto", state: "good" };
        case "dbo":
            if (value < 8) return { level: "low", label: "Bajo", state: "good" };
            if (value < 20) return { level: "medium", label: "Medio", state: "warn" };
            return { level: "high", label: "Alto", state: "bad" };
        case "turbidez":
            if (value < 40) return { level: "low", label: "Bajo", state: "good" };
            if (value < 120) return { level: "medium", label: "Medio", state: "warn" };
            return { level: "high", label: "Alto", state: "bad" };
        case "nitratos":
            if (value < 10) return { level: "low", label: "Bajo", state: "good" };
            if (value < 50) return { level: "medium", label: "Medio", state: "warn" };
            return { level: "high", label: "Alto", state: "bad" };
        case "fosfatos":
            if (value < 0.8) return { level: "low", label: "Bajo", state: "good" };
            if (value < 3) return { level: "medium", label: "Medio", state: "warn" };
            return { level: "high", label: "Alto", state: "bad" };
        case "conductividad":
            if (value < 300) return { level: "low", label: "Bajo", state: "good" };
            if (value < 700) return { level: "medium", label: "Medio", state: "warn" };
            return { level: "high", label: "Alto", state: "bad" };
        case "icg":
            if (value < 40) return { level: "low", label: "Bajo", state: "bad" };
            if (value < 70) return { level: "medium", label: "Medio", state: "warn" };
            return { level: "high", label: "Alto", state: "good" };
        default:
            return { level: "medium", label: "Medio", state: "warn" };
    }
}

function updateMetricVisual(metricKey, rawValue) {
    if (!metricsPanel) return;

    const card = metricsPanel.querySelector(`[data-metric="${metricKey}"]`);
    if (!card) return;

    const descriptor = resolveMetricDescriptor(metricKey, rawValue);
    const labelNode = card.querySelector('[data-role="level"]');

    card.dataset.level = descriptor.level;
    card.dataset.state = descriptor.state;
    card.setAttribute("aria-label", `${metricKey} ${descriptor.label}`);

    if (labelNode) {
        labelNode.textContent = descriptor.label;
    }
}

function formatExportValue(value, digits = 2) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "";
    return numericValue.toFixed(digits);
}

function csvEscape(value) {
    const text = String(value ?? "");
    if (/[",\r\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
}

function calculateExportMetrics(metrics, state) {
    const pollutantLoad = Number.isFinite(Number(metrics?.pollutantLoad))
        ? Number(metrics.pollutantLoad)
        : Number(metrics?.pollutantLoadLegacy ?? 0);
    const ph = Number.isFinite(Number(metrics?.ph)) ? Number(metrics.ph) : 7;
    const od = Math.max(0, Number(metrics?.od ?? 0));
    const dbo5 = Math.max(0, Number(metrics?.dbo ?? 0));
    const turbidez = Math.max(0, Number(metrics?.turbidez ?? 0));
    const nitratos = Math.max(0, Number(metrics?.nitratos ?? 0));
    const fosfatos = Math.max(0, Number(metrics?.fosfatos ?? 0));
    const conductividad = Math.max(0, Number(metrics?.conductividad ?? 0));
    const fertilizantes = Math.max(0, Number(state?.fertilizantes ?? 0));
    const detergentes = Math.max(0, Number(state?.detergentes ?? 0));
    const conductivityPenalty = clamp(map(conductividad, 120, 1400, 0.05, 0.9), 0.05, 0.9);
    const oxygenSaturationBase = clamp(9.45 - conductivityPenalty - Math.abs(ph - 7) * 0.08, 6.5, 9.45);
    const oxygenSaturation = Math.max(od, oxygenSaturationBase);
    const sst = clamp(turbidez * 1.18 + Math.max(0, dbo5 - 2) * 0.35, 3, 450);
    const dqo = clamp(dbo5 * 1.85 + sst * 0.12, dbo5, 650);
    const nt = clamp(nitratos * 1.16 + Math.max(0, dbo5 - 2) * 0.05 + fertilizantes * 0.35, 0.2, 260);
    const pt = clamp(fosfatos * 1.12 + detergentes * 0.015 + fertilizantes * 0.02, 0.02, 240);
    const alcalinidad = clamp(conductividad * 0.36 + (ph - 7) * 22 + 25, 20, 350);
    const dureza = clamp(conductividad * 0.52 + Math.max(0, alcalinidad - 80) * 0.18, 25, 500);
    const treatmentPenaltyByType = {
        planta: 0.15,
        pozo: 0.65,
        descarga: 1.1
    };
    const treatmentPenalty = treatmentPenaltyByType[state?.tratamiento] ?? 0.4;
    const residuesPenalty =
        (state?.botadero ? 0.35 : 0) +
        (state?.quema ? 0.12 : 0) +
        (state?.separacion ? -0.08 : 0.15);
    const domesticPressure = clamp(map(Number(state?.numCasas ?? 10), 1, 500, 0.02, 0.55), 0.02, 0.55);
    const logColiformes = clamp(2.2 + pollutantLoad / 38 + treatmentPenalty + residuesPenalty + domesticPressure, 1.8, 6.2);
    const coliformesTotales = Math.round(Math.pow(10, logColiformes));

    return {
        oxigenoDisuelto: od,
        oxigenoSaturacion: oxygenSaturation,
        sst,
        dqo,
        conductividad,
        ph,
        nt,
        pt,
        dbo5,
        alcalinidad,
        dureza,
        coliformesTotales
    };
}

function syncHiddenExportMetrics(exportMetrics) {
    if (!hiddenExportMetricsNode) return;

    hiddenExportMetricsNode.innerHTML = exportFieldDefinitions
        .map(
            ({ key, label, digits }) =>
                `<span data-export-key="${key}" data-export-label="${label}">${formatExportValue(exportMetrics[key], digits)}</span>`
        )
        .join("");
}

function buildExportCsv(exportMetrics) {
    const header = exportFieldDefinitions.map(({ label }) => csvEscape(label)).join(",");
    const values = exportFieldDefinitions
        .map(({ key, digits }) => csvEscape(formatExportValue(exportMetrics[key], digits)))
        .join(",");
    return `\uFEFF${header}\r\n${values}\r\n`;
}

function downloadExportCsv(exportMetrics) {
    const now = new Date();
    const pad = (value) => String(value).padStart(2, "0");
    const timestamp = [
        now.getFullYear(),
        pad(now.getMonth() + 1),
        pad(now.getDate())
    ].join("-") + "_" + [pad(now.getHours()), pad(now.getMinutes()), pad(now.getSeconds())].join("-");
    const blob = new Blob([buildExportCsv(exportMetrics)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `calidad_agua_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function mixRgb(from, to, t) {
    const mix = clamp(t, 0, 1);
    const r = Math.round(lerp(from[0], to[0], mix));
    const g = Math.round(lerp(from[1], to[1], mix));
    const b = Math.round(lerp(from[2], to[2], mix));
    return `rgb(${r}, ${g}, ${b})`;
}

function sliderRatio(controlId, rawValue) {
    const input = document.getElementById(controlId);
    const min = input ? Number(input.min) : 0;
    const max = input ? Number(input.max) : 100;
    const value = Number.isFinite(Number(rawValue)) ? Number(rawValue) : min;
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
    return clamp((value - min) / (max - min), 0, 1);
}

function livestockCountFromRatio(ratio) {
    if (ratio <= 0) return 0;
    if (ratio < 0.3) return 1;
    if (ratio < 0.7) return 2;
    return 3;
}

function randomInRange(min, max) {
    return min + Math.random() * (max - min);
}

function createTrashSprite() {
    const sprite = document.createElement("img");
    sprite.className = "trash-sprite";
    sprite.src = trashSpriteSrc;
    sprite.alt = "";
    sprite.style.left = `${randomInRange(trashZone.xMin, trashZone.xMax).toFixed(2)}%`;
    sprite.style.top = `${randomInRange(trashZone.yMin, trashZone.yMax).toFixed(2)}%`;
    sprite.style.setProperty("--trash-size", `${trashZone.baseSize}px`);
    sprite.style.setProperty("--trash-scale", `${(1 + randomInRange(-0.05, 0.05)).toFixed(3)}`);
    sprite.style.setProperty("--trash-rotation", `${randomInRange(-6, 6).toFixed(2)}deg`);
    sprite.style.setProperty("--trash-float-distance", `${randomInRange(2.5, 5.5).toFixed(2)}px`);
    sprite.style.setProperty("--trash-float-duration", `${randomInRange(2.8, 4.8).toFixed(2)}s`);
    sprite.style.setProperty("--trash-float-delay", `${randomInRange(0, 1.2).toFixed(2)}s`);
    sprite.onerror = () => {
        sprite.style.display = "none";
    };
    return sprite;
}

function updateTrashSprites(state) {
    const layer = trashLayer || river;
    const targetCount = state?.botadero ? floatingTrashCount : 0;

    while (trashSprites.length < targetCount) {
        const sprite = createTrashSprite();
        trashSprites.push(sprite);
        layer.appendChild(sprite);
    }

    while (trashSprites.length > targetCount) {
        const sprite = trashSprites.pop();
        if (sprite) sprite.remove();
    }
}

function createLivestockSprite(species) {
    const zone = livestockZones[species] ?? livestockZones.vacas;
    const sprite = document.createElement("img");
    const initialFlip = Math.random() < 0.5 ? -1 : 1;
    sprite.className = `animal-sprite animal-${species}`;
    sprite.src = livestockSpriteMap[species];
    sprite.alt = "";
    sprite.style.left = `${randomInRange(zone.xMin, zone.xMax).toFixed(2)}%`;
    sprite.style.top = `${randomInRange(zone.yMin, zone.yMax).toFixed(2)}%`;
    sprite.style.setProperty("--animal-size", `${zone.baseSize + Math.random() * zone.sizeJitter}px`);
    sprite.style.setProperty("--animal-scale", `${(0.92 + Math.random() * 0.02).toFixed(2)}`);
    sprite.style.setProperty("--animal-flip", String(initialFlip));
    sprite.style.setProperty("--animal-offset-x", "0px");
    livestockMotionState.set(sprite, {
        offsetX: 0,
        direction: initialFlip,
        nextMoveAt: performance.now() + randomInRange(livestockMotionConfig.minIntervalMs, livestockMotionConfig.maxIntervalMs)
    });
    sprite.onerror = () => {
        sprite.style.display = "none";
    };
    return sprite;
}

function syncLivestockPool(species, targetCount) {
    if (!animalLayer) return;
    const pool = livestockSprites[species];
    if (!pool) return;

    while (pool.length < targetCount) {
        const sprite = createLivestockSprite(species);
        pool.push(sprite);
        animalLayer.appendChild(sprite);
    }

    while (pool.length > targetCount) {
        const sprite = pool.pop();
        if (sprite) sprite.remove();
    }
}

function updateLivestockSprites(state) {
    if (!animalLayer) return;
    livestockControls.forEach((species) => {
        const ratio = sliderRatio(species, state[species]);
        const targetCount = livestockCountFromRatio(ratio);
        syncLivestockPool(species, targetCount);
    });
}

function updateLivestockMotion(now) {
    livestockControls.forEach((species) => {
        const pool = livestockSprites[species];
        if (!pool) return;

        pool.forEach((sprite) => {
            const motion = livestockMotionState.get(sprite);
            if (!motion || now < motion.nextMoveAt) return;

            const step = randomInRange(livestockMotionConfig.minStepPx, livestockMotionConfig.maxStepPx);
            let nextOffset = motion.offsetX + step * motion.direction;

            if (nextOffset >= livestockMotionConfig.maxOffsetPx) {
                nextOffset = livestockMotionConfig.maxOffsetPx;
                motion.direction = -1;
                sprite.style.setProperty("--animal-flip", "-1");
            } else if (nextOffset <= -livestockMotionConfig.maxOffsetPx) {
                nextOffset = -livestockMotionConfig.maxOffsetPx;
                motion.direction = 1;
                sprite.style.setProperty("--animal-flip", "1");
            } else {
                sprite.style.setProperty("--animal-flip", motion.direction > 0 ? "1" : "-1");
            }

            motion.offsetX = nextOffset;
            motion.nextMoveAt = now + randomInRange(livestockMotionConfig.minIntervalMs, livestockMotionConfig.maxIntervalMs);
            sprite.style.setProperty("--animal-offset-x", `${motion.offsetX.toFixed(2)}px`);
        });
    });
}

function initializeLightRays() {
    if (!lightRaysLayer || activeLightRays.length > 0) return;
    for (let i = 0; i < maxLightRaysOnScene; i += 1) {
        spawnLightRay(pendingLightRayProfile, i * 250);
    }
}

function cleanupLightRays() {
    activeLightRays = activeLightRays.filter((entry) => entry.node && entry.node.isConnected);
}

function buildLightRayProfile(metrics, visual) {
    const luz = clamp(Number(visual?.luz ?? model.internalState?.luz ?? 1), 0, 1);
    const turbidityNorm = clamp(map(metrics.turbidez, 5, 250, 0, 1), 0, 1);
    const clarity = clamp(1 - turbidityNorm, 0, 1);
    const lightStrength = clamp(0.2 + luz * 0.8, 0, 1);
    const qualityLabel = visual?.qualityLabel || "intermedia";

    let coreRgb = "232, 246, 255";
    let edgeRgb = "160, 210, 232";
    if (qualityLabel === "intermedia") {
        coreRgb = "221, 238, 222";
        edgeRgb = "152, 188, 162";
    } else if (qualityLabel === "turbia") {
        coreRgb = "214, 206, 168";
        edgeRgb = "144, 128, 90";
    }

    return {
        coreRgb,
        edgeRgb,
        peakOpacity: clamp(0.2 + lightStrength * 0.65 * (0.55 + clarity * 0.45), 0.16, 0.9),
        swayMin: clamp(8.3 + (1 - lightStrength) * 2.0, 7.8, 11.5),
        swayMax: clamp(13.8 + (1 - lightStrength) * 2.2, 12.6, 16.6),
        fadeMin: clamp(4.4 + (1 - clarity) * 0.8, 4.2, 5.8),
        fadeMax: clamp(7 + (1 - clarity) * 1.4, 6.5, 8.8)
    };
}

function spawnLightRay(profile, delayMs = 0) {
    if (!lightRaysLayer) return;
    cleanupLightRays();
    if (activeLightRays.length >= maxLightRaysOnScene) return;

    const create = () => {
        cleanupLightRays();
        if (activeLightRays.length >= maxLightRaysOnScene) return;

        const ray = document.createElement("div");
        ray.className = "light-ray";
        ray.style.setProperty("--ray-left", `${6 + Math.random() * 88}%`);
        ray.style.setProperty("--ray-width", `${6 + Math.random() * 9}%`);
        ray.style.setProperty("--ray-angle", `${-17 + Math.random() * 14}deg`);
        ray.style.setProperty("--ray-speed", `${(profile.swayMin + Math.random() * (profile.swayMax - profile.swayMin)).toFixed(2)}s`);
        ray.style.setProperty("--ray-fade-speed", `${(profile.fadeMin + Math.random() * (profile.fadeMax - profile.fadeMin)).toFixed(2)}s`);
        ray.style.setProperty("--ray-delay", `${(Math.random() * 1.4).toFixed(2)}s`);
        ray.style.setProperty("--ray-fade-delay", `${(Math.random() * 1.8).toFixed(2)}s`);
        ray.style.setProperty("--ray-core-rgb-local", profile.coreRgb);
        ray.style.setProperty("--ray-edge-rgb-local", profile.edgeRgb);
        ray.style.setProperty("--ray-peak-opacity", profile.peakOpacity.toFixed(3));
        lightRaysLayer.appendChild(ray);

        const lifespanMs = 10000 + Math.random() * 7000;
        const entry = { node: ray };
        activeLightRays.push(entry);

        setTimeout(() => {
            ray.remove();
            cleanupLightRays();
            spawnLightRay(pendingLightRayProfile);
        }, lifespanMs);
    };

    if (delayMs > 0) {
        setTimeout(create, delayMs);
    } else {
        create();
    }
}

function applyLightToScene(metrics, visual) {
    const luz = clamp(Number(visual?.luz ?? model.internalState?.luz ?? 1), 0, 1);
    const turbidityNorm = clamp(map(metrics.turbidez, 5, 250, 0, 1), 0, 1);
    const clarity = clamp(1 - turbidityNorm, 0, 1);
    const lightStrength = clamp(0.2 + luz * 0.8, 0, 1);
    const bedLift = clamp(0.18 + clarity * 0.55 + luz * 0.27, 0, 1);
    const bedTop = mixRgb([58, 43, 31], [125, 104, 80], bedLift);
    const bedMid = mixRgb([44, 32, 24], [96, 74, 55], bedLift);
    const bedBottom = mixRgb([27, 17, 12], [68, 49, 35], bedLift * 0.9);

    document.documentElement.style.setProperty("--light-level", lightStrength.toFixed(3));
    document.documentElement.style.setProperty("--clarity-level", clarity.toFixed(3));
    document.documentElement.style.setProperty("--bed-top-color", bedTop);
    document.documentElement.style.setProperty("--bed-mid-color", bedMid);
    document.documentElement.style.setProperty("--bed-bottom-color", bedBottom);

    pendingLightRayProfile = buildLightRayProfile(metrics, visual);
}

function syncVisualElements(collection, targetCount, factory) {
    while (collection.length < targetCount) {
        const node = factory();
        collection.push(node);
        river.appendChild(node);
    }

    while (collection.length > targetCount) {
        const node = collection.pop();
        if (node) node.remove();
    }
}

function createBubbleElement() {
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    const size = Math.random() * 14 + 5;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 100}%`;
    bubble.style.bottom = `${Math.random() * -120}px`;
    bubble.style.setProperty("--drift", `${(Math.random() - 0.5) * 95}px`);
    bubble.style.animationDuration = `${Math.random() * 9 + 6}s`;
    bubble.style.animationDelay = `${Math.random() * 4}s`;
    return bubble;
}

function createPlantElement() {
    const plant = document.createElement("div");
    plant.className = "plant";
    plant.style.height = `${Math.random() * 100 + 60}px`;
    plant.style.left = `${Math.random() * 100}%`;
    plant.style.animationDuration = `${Math.random() * 3 + 2}s`;
    return plant;
}

function createAlgaeElement() {
    const algae = document.createElement("div");
    algae.className = "algae";
    algae.style.left = `${Math.random() * 100}%`;
    algae.style.top = `${Math.random() * 46 + 20}%`;
    algae.style.animationDuration = `${Math.random() * 3 + 3}s`;
    return algae;
}

function setBubbleCount(count) {
    syncVisualElements(bubbles, count, createBubbleElement);
}

function setPlantCount(count) {
    syncVisualElements(plants, count, createPlantElement);
}

function setAlgaeCount(count) {
    syncVisualElements(algaeElements, count, createAlgaeElement);
}

function createRocks() {
    for (let i = 0; i < 8; i += 1) {
        const rock = document.createElement("div");
        rock.className = "rock";
        const size = Math.random() * 70 + 35;
        rock.style.width = `${size}px`;
        rock.style.height = `${size * 0.68}px`;
        rock.style.left = `${Math.random() * 100}%`;
        rock.style.bottom = `${Math.random() * 8}px`;
        river.appendChild(rock);
    }
}

function isNavigablePixel(sceneX, sceneY) {
    if (!collisionMap) return true;

    const pixelX = Math.floor(sceneX);
    const pixelY = Math.floor(sceneY);

    if (pixelX < 0 || pixelX >= collisionCanvas.width || pixelY < 0 || pixelY >= collisionCanvas.height) {
        return false;
    }

    const index = (pixelY * collisionCanvas.width + pixelX) * 4;
    const r = collisionMap.data[index];
    const g = collisionMap.data[index + 1];
    const b = collisionMap.data[index + 2];

    return r > 200 && g > 200 && b > 200;
}

function getRiverOffsetInScene() {
    const sceneRect = sceneFrame.getBoundingClientRect();
    const riverRect = river.getBoundingClientRect();
    return {
        x: riverRect.left - sceneRect.left,
        y: riverRect.top - sceneRect.top
    };
}

function getFishVerticalLimits(species) {
    const globalMin = river.offsetHeight * 0.11;
    const globalMax = river.offsetHeight * 0.8;

    if (species === "bagre") {
        return {
            minY: river.offsetHeight * 0.6,
            maxY: globalMax
        };
    }

    return { minY: globalMin, maxY: globalMax };
}

function canFishMoveTo(newX, newY, width, height, species = "tilapia") {
    const limits = getFishVerticalLimits(species);
    const minY = limits.minY;
    const maxY = limits.maxY;

    if (newX < 0 || newX + width > river.offsetWidth || newY < minY || newY + height > maxY) {
        return false;
    }

    const offset = getRiverOffsetInScene();
    const checkpoints = [
        { x: newX + width / 2, y: newY + height / 2 },
        { x: newX + 10, y: newY + height / 2 },
        { x: newX + width - 10, y: newY + height / 2 },
        { x: newX + width / 2, y: newY + 6 },
        { x: newX + width / 2, y: newY + height - 6 }
    ];

    return checkpoints.every((point) => isNavigablePixel(point.x + offset.x, point.y + offset.y));
}

function findRandomValidFishPosition(width, height, species = "tilapia") {
    const limits = getFishVerticalLimits(species);
    const minY = limits.minY;
    const maxY = limits.maxY;

    for (let attempts = 0; attempts < 320; attempts += 1) {
        const candidateX = Math.random() * Math.max(1, river.offsetWidth - width);
        const candidateY = minY + Math.random() * Math.max(1, maxY - minY);

        if (canFishMoveTo(candidateX, candidateY, width, height, species)) {
            return { x: candidateX, y: candidateY };
        }
    }

    return null;
}

function refreshCollisionMap() {
    if (!collisionImageLoaded) return;

    collisionCanvas.width = sceneFrame.offsetWidth;
    collisionCanvas.height = sceneFrame.offsetHeight;
    collisionContext.clearRect(0, 0, collisionCanvas.width, collisionCanvas.height);
    collisionContext.drawImage(collisionImage, 0, 0, collisionCanvas.width, collisionCanvas.height);
    collisionMap = collisionContext.getImageData(0, 0, collisionCanvas.width, collisionCanvas.height);

    aliveFishes.forEach((fish) => {
        if (!canFishMoveTo(fish.x, fish.y, fish.width, fish.height, fish.species)) {
            fish.recoverFromInvalidPosition();
            fish.updateElement();
        }
    });
}

function mixColor(from, to, ratio) {
    return {
        r: Math.round(from.r + (to.r - from.r) * ratio),
        g: Math.round(from.g + (to.g - from.g) * ratio),
        b: Math.round(from.b + (to.b - from.b) * ratio),
        a: Number((from.a + (to.a - from.a) * ratio).toFixed(3))
    };
}

function toRgba(color) {
    return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

function resolveWaterColors(indiceGlobal) {
    const boundedQuality = clamp(indiceGlobal, 0, 100);

    for (let i = 0; i < waterStops.length - 1; i += 1) {
        const start = waterStops[i];
        const end = waterStops[i + 1];

        if (boundedQuality >= start.quality && boundedQuality <= end.quality) {
            const ratio = (boundedQuality - start.quality) / (end.quality - start.quality);
            return {
                light: toRgba(mixColor(start.light, end.light, ratio)),
                mid: toRgba(mixColor(start.mid, end.mid, ratio)),
                dark: toRgba(mixColor(start.dark, end.dark, ratio))
            };
        }
    }

    const fallback = waterStops[waterStops.length - 1];
    return {
        light: toRgba(fallback.light),
        mid: toRgba(fallback.mid),
        dark: toRgba(fallback.dark)
    };
}

function getState() {
    return {
        numCasas: Number(document.getElementById("numCasas")?.value ?? 200),
        ducha: Number(document.getElementById("ducha").value),
        inodoro: Number(document.getElementById("inodoro").value),
        manos: Number(document.getElementById("manos").value),
        loza: Number(document.getElementById("loza").value),
        lavadora: Number(document.getElementById("lavadora").value),
        dientes: document.querySelector('input[name="dientes"]:checked').value,
        riego: document.getElementById("riego").checked,
        detergentes: ["det-ropa", "lavaloza", "cloro", "desinfectante", "shampoo", "suavizante"].reduce(
            (acc, id) => acc + (document.getElementById(id).checked ? 1 : 0),
            0
        ),
        tratamiento: document.getElementById("tratamiento").value,
        fertilizantes: Number(document.getElementById("fertilizantes").value),
        pollos: Number(document.getElementById("pollos").value),
        ovejas: Number(document.getElementById("ovejas").value),
        vacas: Number(document.getElementById("vacas").value),
        cerdos: Number(document.getElementById("cerdos").value),
        separacion: document.getElementById("separacion").checked,
        botadero: document.getElementById("botadero").checked,
        quema: document.getElementById("quema").checked
    };
}

function computeWaterQuality(state) {
    const helpers = { clamp, map };
    const parameters = model.parameters;

    const components = {
        usoDomestico: model.formulas.usoDomestico(state, helpers),
        detergentes: model.formulas.detergentes(state, parameters),
        saneamientoFactor: model.formulas.saneamientoFactor(state, parameters),
        agro: model.formulas.agro(state, parameters),
        residuos: model.formulas.residuos(state, parameters)
    };

    const pollutantLoadLegacy = model.formulas.pollutantLoad(components, helpers, parameters);
    const indiceGlobalLegacy = model.formulas.indiceGlobal(pollutantLoadLegacy, helpers);

    const metricas = model.formulas.metricas(
        state,
        { pollutantLoad: pollutantLoadLegacy, indiceGlobal: indiceGlobalLegacy, components, parameters },
        helpers
    );

    const pollutantLoad = Number.isFinite(Number(metricas.pollutantLoad))
        ? Number(metricas.pollutantLoad)
        : pollutantLoadLegacy;
    const indiceGlobal = Number.isFinite(Number(metricas.indiceGlobal))
        ? Number(metricas.indiceGlobal)
        : indiceGlobalLegacy;

    return {
        ...metricas,
        pollutantLoad,
        indiceGlobal,
        pollutantLoadLegacy,
        indiceGlobalLegacy,
        components
    };
}

function applyWaterVisual(metrics) {
    const colors = resolveWaterColors(metrics.indiceGlobal);
    const visual = model.formulas.visuales(
        metrics,
        { indiceGlobal: metrics.indiceGlobal, parameters: model.parameters },
        { clamp, map }
    );

    document.documentElement.style.setProperty("--water-light", colors.light);
    document.documentElement.style.setProperty("--water-mid", colors.mid);
    document.documentElement.style.setProperty("--water-dark", colors.dark);
    applyLightToScene(metrics, visual);

    setFishPopulation(visual);
    setAlgaeCount(visual.algaeCount);
    setPlantCount(visual.plantCount);
    setBubbleCount(visual.bubbleCount);

    return visual;
}

function updateOutputBadges() {
    document.querySelectorAll("[data-out]").forEach((node) => {
        const target = document.getElementById(node.dataset.out);
        node.textContent = target.value;
    });
}

function setMetricText(id, value) {
    const node = document.getElementById(id);
    if (node) node.textContent = value;
}

function updateTreatmentOverlay(tratamiento) {
    if (!treatmentOverlay) return;
    const nextSrc = treatmentOverlayMap[tratamiento] || treatmentOverlayMap.planta;
    treatmentOverlay.style.display = "";
    if (treatmentOverlay.dataset.currentSrc === nextSrc) return;
    treatmentOverlay.src = nextSrc;
    treatmentOverlay.dataset.currentSrc = nextSrc;
}

function updateSimulation() {
    updateOutputBadges();
    const state = getState();
    updateTreatmentOverlay(state.tratamiento);
    const metrics = computeWaterQuality(state);
    const visual = applyWaterVisual(metrics);
    const exportMetrics = calculateExportMetrics(metrics, state);
    updateLivestockSprites(state);
    updateTrashSprites(state);
    latestExportMetrics = exportMetrics;
    syncHiddenExportMetrics(exportMetrics);

    setMetricText("metric-ph", metrics.ph.toFixed(1));
    updateMetricVisual("ph", metrics.ph);
    setMetricText("metric-od", metrics.od.toFixed(1));
    updateMetricVisual("od", metrics.od);
    setMetricText("metric-dbo", metrics.dbo.toFixed(1));
    updateMetricVisual("dbo", metrics.dbo);
    setMetricText("metric-turbidez", Math.round(metrics.turbidez));
    updateMetricVisual("turbidez", metrics.turbidez);
    setMetricText("metric-nitratos", metrics.nitratos.toFixed(1));
    updateMetricVisual("nitratos", metrics.nitratos);
    setMetricText("metric-fosfatos", metrics.fosfatos.toFixed(2));
    updateMetricVisual("fosfatos", metrics.fosfatos);
    setMetricText("metric-conductividad", Math.round(metrics.conductividad));
    updateMetricVisual("conductividad", metrics.conductividad);
    setMetricText("metric-icg", metrics.indiceGlobal);
    updateMetricVisual("icg", metrics.indiceGlobal);
    setMetricText("metric-caudal", (metrics.caudalEfectivo_Ls ?? 0).toFixed(2));
    setMetricText("metric-load", Math.round(metrics.pollutantLoad));
    setMetricText("metric-color", visual.qualityLabel);
    setMetricText("metric-fish", visual.fishCount);
    setMetricText("metric-algae", visual.algaeCount);
    setMetricText("metric-plants", visual.plantCount);
    setMetricText("metric-bubbles", visual.bubbleCount);
}

document.getElementById("controlsPanel").addEventListener("input", updateSimulation);
document.getElementById("controlsPanel").addEventListener("change", updateSimulation);
window.addEventListener("resize", refreshCollisionMap);

if (downloadWaterCsvButton) {
    downloadWaterCsvButton.addEventListener("click", () => {
        if (!latestExportMetrics) {
            updateSimulation();
        }
        if (!latestExportMetrics) return;
        downloadExportCsv(latestExportMetrics);
    });
}

collisionImage.onload = () => {
    collisionImageLoaded = true;
    refreshCollisionMap();
};

collisionImage.onerror = () => {
    collisionMap = null;
    console.warn("No se pudo cargar assets/collision-map.png. Se usara colision por limites del rio.");
};

collisionImage.src = "assets/collision-map.png";

renderMetricsPanel();
createRocks();
animateFishes();
updateSimulation();
initializeLightRays();
