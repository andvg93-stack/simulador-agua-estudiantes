(function () {
    const model = {
        descripcion: "Modelo editable de calidad de agua y visuales del rio.",
        variablesImpactadas: {
            calidadFisicoquimica: ["ph", "od", "dbo", "turbidez", "nitratos", "fosfatos", "conductividad"],
            calidadGlobal: ["pollutantLoad", "indiceGlobal"],
            visuales: ["colorAgua", "fishCount", "fishMode", "fishAlive", "fishDead", "algaeCount", "plantCount", "bubbleCount"]
        },
        formulasTexto: {
            usoDomestico: "map(ducha,5,40,4,22)+map(inodoro,1,10,1,10)+map(manos,1,10,1,8)+map(loza,1,6,1,8)+map(lavadora,1,7,2,12)+(dientes==='abierta'?4:0)+(riego?3:0)",
            households: "households=clamp(round(state.numCasas || householdsDefault), minHouseholds, maxHouseholds)",
            consumoAgua_Lday: "ducha*10 + inodoro*8 + manos*2 + loza*20 + (lavadora/7)*90 + (dientes==='abierta'?10:1) + (riego?60:0)",
            caudalEfectivo_Ls: "Qeff = clamp(Q_rio_base + (consumoAgua_Lday*returnFraction)/86400, minQ, maxQ)",
            caudalMezcla_Ls: "Qmix = max(minMixingFlow_Ls, riverBaseFlow_Ls*mixingFlowFactor)",
            detergentes: "detergentes * 3.8",
            saneamientoFactor: "saneamientoFactor[tratamiento] // planta:-11, pozo:3, descarga:14",
            agro: "(pollos*0.03)+(ovejas*0.06)+(vacas*0.08)+(cerdos*0.07)",
            residuos: "(separacion?-7:5)+(botadero?9:0)+(quema?6:0)",
            pollutantLoad: "clamp(0.32*N(usoDomestico,9,67)+0.18*N(detergentes,0,22.8)+0.20*N(saneamientoFactor,-11,14)+0.15*N(agro,0,48)+0.15*N(residuos,-7,20),0,100)",
            indiceGlobal: "Math.round(clamp(100 - pollutantLoad, 0, 100))",
            ph: "clamp(7.45 - pollutantLoad * 0.009, 6.0, 8.5)",
            od: "clamp(4.2 + indiceGlobal * 0.058, 3.5, 10)",
            dbo: "dbo=clamp(background.dbo_mgL + (DBO_out_gday*1000)/(Qeff_Ls*86400), lim.dbo.min, lim.dbo.max)",
            turbidez: "clamp(15 + pollutantLoad * 2.2, 5, 250)",
            nitratos: "nitratos=clamp(background.no3_mgL + (N_out_gday*1000)/(Qeff_Ls*86400), lim.nitratos.min, lim.nitratos.max)",
            fosfatos: "fosfatos=clamp(background.po4_mgL + (P_out_gday*1000)/(Qeff_Ls*86400), lim.fosfatos.min, lim.fosfatos.max)",
            conductividad: "clamp(160 + pollutantLoad * 8.5, 120, 1400)",
            peces: "fishSuit=clamp(0.55*odN + 0.25*(1-dboBad) + 0.20*(1-turbBad),0,1); bandas: excelente(>=0.75)=trucha+tilapia+bagre, media(>=0.45)=tilapia+bagre, baja(>=0.25)=bagre, muyMala(<0.25)=dead",
            claridad: "clarity = 1 - clamp(map(turbidez, 5, 250, 0, 1), 0, 1)",
            luz: "luz = clamp(pow(clarity,1.2) * (1 - clamp(map(algaeCount,0,maxAlgae,0,0.6),0,0.6)), 0, 1); EMA: luz=0.7*luzPrev+0.3*luzNueva",
            bloom: "bloom=clamp((algaeCount-3)/(maxAlgae-3),0,1)",
            algas: "algaeCount=clamp(round(5.5436*Math.exp(0.0559*(nitratos+fosfatos))),0,60)",
            plantasFondo: "plantSuit=clamp(0.6*clarity + 0.25*(1-dboBad) + 0.15*luz,0,1); plantCount=clamp(round(map(plantSuit,0,1,4,18)),0,maxPlants)",
            burbujas: "odN=clamp(map(od,3.5,10,0,1),0,1); bubbleCount=clamp(round(map(odN,0,1,2,50)),0,maxBubbles)",
            colorAgua: "turbidez<=40?'clara':turbidez<=120?'intermedia':'turbia'; bloom alto degrada etiqueta"
        },
        parameters: {
            saneamientoFactor: {
                planta: -11,
                pozo: 3,
                descarga: 14
            },
            ganadoFactor: {
                pollos: 0.03,
                ovejas: 0.06,
                vacas: 0.08,
                cerdos: 0.07
            },
            limites: {
                ph: { min: 6.0, max: 8.5 },
                od: { min: 3.5, max: 10 },
                dbo: { min: 2, max: 180 },
                turbidez: { min: 5, max: 250 },
                nitratos: { min: 1, max: 220 },
                fosfatos: { min: 0.2, max: 220 },
                conductividad: { min: 120, max: 1400 }
            },
            pollutantScale: {
                usoDomestico: { min: 9, max: 67, weight: 0.32 },
                detergentes: { min: 0, max: 22.8, weight: 0.18 },
                saneamientoFactor: { min: -11, max: 14, weight: 0.2 },
                agro: { min: 0, max: 48, weight: 0.15 },
                residuos: { min: -7, max: 20, weight: 0.15 }
            },
            hydrology: {
                riverBaseFlow_Ls: 40,
                dischargeReturnFraction: 0.9,
                householdsDefault: 10,
                minHouseholds: 1,
                maxHouseholds: 500,
                mixingFlowFactor: 0.08,
                minMixingFlow_Ls: 2,
                minEffectiveFlow_Ls: 5,
                maxEffectiveFlow_Ls: 500
            },
            waterUseLiters: {
                shower_L_per_min: 10,
                toilet_L_per_flush: 8,
                handwash_L_per_event: 2,
                dishwash_L_per_event: 20,
                washer_L_per_cycle: 90,
                teeth_open_L_per_event: 10,
                teeth_closed_L_per_event: 1,
                garden_irrigation_L_per_event: 60
            },
            background: {
                dbo_mgL: 2,
                no3_mgL: 1.5,
                po4_mgL: 0.08
            },
            treatmentEfficiency: {
                planta: { DBO: 0.75, N: 0.35, P: 0.45 },
                pozo: { DBO: 0.45, N: 0.15, P: 0.10 },
                descarga: { DBO: 0.00, N: 0.00, P: 0.00 }
            },
            loadFactors: {
              // Coeficientes pedagogicos (no equivalen a mediciones reales directas).
                DBO: { domestic_L: 1.2, agro: 12, residuos_pos: 25 },
                N: { fertilizantes: 180, agro: 60 },
                P: { detergentes: 70, fertilizantes: 35 }
            },
            globalIndexWeights: {
                dbo: 0.28,
                no3: 0.22,
                po4: 0.22,
                turb: 0.14,
                cond: 0.10,
                ph: 0.04
            },
            visual: {
                fishMaxTotal: 20,
                algaeMax: 60,
                plantsMax: 24,
                bubblesMax: 60
            }
        },
        waterStops: [
            {
                quality: 0,
                light: { r: 90, g: 120, b: 120, a: 1 },
                mid: { r: 60, g: 85, b: 80, a: 1 },
                dark: { r: 35, g: 55, b: 45, a: 1 }
            },
            {
                quality: 40,
                light: { r: 95, g: 160, b: 190, a: 1 },
                mid: { r: 55, g: 110, b: 145, a: 1 },
                dark: { r: 25, g: 65, b: 95, a: 1 }
            },
            {
                quality: 70,
                light: { r: 120, g: 210, b: 240, a: 1 },
                mid: { r: 75, g: 160, b: 210, a: 1 },
                dark: { r: 40, g: 95, b: 140, a: 1 }
            },
            {
                quality: 100,
                light: { r: 138, g: 229, b: 247, a: 1 },
                mid: { r: 82, g: 177, b: 223, a: 1 },
                dark: { r: 46, g: 106, b: 152, a: 1 }
            }
        ],
        internalState: {
            luz: 1,
            lastAlgaeCount: 1,
            fish: {
                mode: "alive",
                band: "excellent",
                alive: { tilapia: 3, bagre: 2, trucha: 5 },
                dead: { tilapia: 0, bagre: 0, trucha: 0 }
            }
        },
        formulas: {
            usoDomestico(state, helpers) {
                const { map } = helpers;
                return (
                    map(state.ducha, 5, 40, 4, 22) +
                    map(state.inodoro, 1, 10, 1, 10) +
                    map(state.manos, 1, 10, 1, 8) +
                    map(state.loza, 1, 6, 1, 8) +
                    map(state.lavadora, 1, 7, 2, 12) +
                    (state.dientes === "abierta" ? 4 : 0) +
                    (state.riego ? 3 : 0)
                );
            },
            detergentes(state) {
                return state.detergentes * 3.8;
            },
            saneamientoFactor(state, parameters) {
                return parameters.saneamientoFactor[state.tratamiento] ?? 0;
            },
            agro(state, parameters) {
                const g = parameters.ganadoFactor;
                return (
                    state.pollos * g.pollos +
                    state.ovejas * g.ovejas +
                    state.vacas * g.vacas +
                    state.cerdos * g.cerdos
                );
            },
            residuos(state) {
                return (state.separacion ? -7 : 5) + (state.botadero ? 9 : 0) + (state.quema ? 6 : 0);
            },
            households(state, parameters, helpers) {
                const hydro = parameters?.hydrology ?? {};
                const raw =
                    state?.numCasas != null
                        ? Number(state.numCasas)
                        : Number(hydro.householdsDefault ?? 10);
                const rounded = Math.round(Number.isFinite(raw) ? raw : Number(hydro.householdsDefault ?? 10));
                return helpers.clamp(
                    rounded,
                    Number(hydro.minHouseholds ?? 1),
                    Number(hydro.maxHouseholds ?? 500)
                );
            },
            consumoAgua_Lday(state, parameters, helpers) {
                const w = parameters?.waterUseLiters ?? {};
                const asNonNegative = (value) => Math.max(0, Number(value) || 0);
                const lavadoraPerDay = asNonNegative(state.lavadora) / 7;
                const teethLiters =
                    state.dientes === "abierta"
                        ? asNonNegative(w.teeth_open_L_per_event)
                        : asNonNegative(w.teeth_closed_L_per_event);

                const liters =
                    asNonNegative(state.ducha) * asNonNegative(w.shower_L_per_min) +
                    asNonNegative(state.inodoro) * asNonNegative(w.toilet_L_per_flush) +
                    asNonNegative(state.manos) * asNonNegative(w.handwash_L_per_event) +
                    asNonNegative(state.loza) * asNonNegative(w.dishwash_L_per_event) +
                    lavadoraPerDay * asNonNegative(w.washer_L_per_cycle) +
                    teethLiters +
                    (state.riego ? asNonNegative(w.garden_irrigation_L_per_event) : 0);

                return helpers.clamp(liters, 0, 1_000_000);
            },
            caudalEfectivo_Ls(state, parameters, helpers) {
                const hydro = parameters?.hydrology ?? {};
                const consumo_Lday = model.formulas.consumoAgua_Lday(state, parameters, helpers);
                const qDescarga_Lday = consumo_Lday * Number(hydro.dischargeReturnFraction ?? 0.9);
                const qDescarga_Ls = qDescarga_Lday / 86400;
                const qEfectivo_Ls = Number(hydro.riverBaseFlow_Ls ?? 40) + qDescarga_Ls;
                return helpers.clamp(
                    qEfectivo_Ls,
                    Number(hydro.minEffectiveFlow_Ls ?? 5),
                    Number(hydro.maxEffectiveFlow_Ls ?? 500)
                );
            },
            caudalMezcla_Ls(parameters, helpers) {
                const hydro = parameters?.hydrology ?? {};
                const qmix = Number(hydro.riverBaseFlow_Ls ?? 40) * Number(hydro.mixingFlowFactor ?? 0.08);
                return Math.max(
                    Number(hydro.minMixingFlow_Ls ?? 2),
                    helpers.clamp(qmix, Number(hydro.minMixingFlow_Ls ?? 2), Number(hydro.maxEffectiveFlow_Ls ?? 500))
                );
            },
            cargas(state, components, parameters, helpers) {
                const factors = parameters?.loadFactors ?? {};
                const dboFactors = factors.DBO ?? {};
                const nFactors = factors.N ?? {};
                const pFactors = factors.P ?? {};
                const consumoPerHouse_Lday = model.formulas.consumoAgua_Lday(state, parameters, helpers);
                const nCasas = model.formulas.households(state, parameters, helpers);              
              
     
                const rawLoads = {
                    DBO_gday:
                        consumoPerHouse_Lday * Number(dboFactors.domestic_L ?? 1.2) +
                        Math.max(0, Number(state.fertilizantes ?? 0)) * Number(nFactors.fertilizantes ?? 180) +
                        Math.max(0, Number(components?.agro ?? 0)) * Number(nFactors.agro ?? 60),
                    N_gday:
                        Math.max(0, Number(state.fertilizantes ?? 0)) * Number(nFactors.fertilizantes ?? 180) +
                        Math.max(0, Number(components?.agro ?? 0)) * Number(nFactors.agro ?? 60),
                    P_gday:
                        Math.max(0, Number(state.detergentes ?? 0)) * Number(pFactors.detergentes ?? 70) +
                        Math.max(0, Number(state.fertilizantes ?? 0)) * Number(pFactors.fertilizantes ?? 35)
                };

                const scaledLoads = {
                    DBO_gday: rawLoads.DBO_gday * nCasas,
                    N_gday: rawLoads.N_gday * nCasas,
                    P_gday: rawLoads.P_gday * nCasas
                };

                return {
                    DBO_gday: helpers.clamp(scaledLoads.DBO_gday, 0, 500_000),
                    N_gday: helpers.clamp(scaledLoads.N_gday, 0, 500_000),
                    P_gday: helpers.clamp(scaledLoads.P_gday, 0, 500_000),
                    households: nCasas,
                    consumo_Lday_perHouse: consumoPerHouse_Lday,
                    consumo_Lday_total: consumoPerHouse_Lday * nCasas,
                    Qeff_Ls: model.formulas.caudalEfectivo_Ls(state, parameters, helpers),
                    Qmix_Ls: model.formulas.caudalMezcla_Ls(parameters, helpers)                  
                };
            },
            applyTreatment(loads, state, parameters) {
                const effDefault = { DBO: 0, N: 0, P: 0 };
                const eff = parameters?.treatmentEfficiency?.[state.tratamiento] ?? effDefault;
                const asFraction = (value) => Math.max(0, Math.min(1, Number(value) || 0));
                return {
                    DBO_gday: Math.max(0, Number(loads.DBO_gday || 0) * (1 - asFraction(eff.DBO))),
                    N_gday: Math.max(0, Number(loads.N_gday || 0) * (1 - asFraction(eff.N))),
                    P_gday: Math.max(0, Number(loads.P_gday || 0) * (1 - asFraction(eff.P)))
                };
            },
            pollutantLoad(components, helpers, parameters) {
                const scale =
                    parameters?.pollutantScale ?? {
                        usoDomestico: { min: 9, max: 67, weight: 0.32 },
                        detergentes: { min: 0, max: 22.8, weight: 0.18 },
                        saneamientoFactor: { min: -11, max: 14, weight: 0.2 },
                        agro: { min: 0, max: 48, weight: 0.15 },
                        residuos: { min: -7, max: 20, weight: 0.15 }
                    };

                const normalized = (key, value) =>
                    helpers.clamp(helpers.map(value, scale[key].min, scale[key].max, 0, 100), 0, 100);

                const weightedLoad =
                    normalized("usoDomestico", components.usoDomestico) * scale.usoDomestico.weight +
                    normalized("detergentes", components.detergentes) * scale.detergentes.weight +
                    normalized("saneamientoFactor", components.saneamientoFactor) * scale.saneamientoFactor.weight +
                    normalized("agro", components.agro) * scale.agro.weight +
                    normalized("residuos", components.residuos) * scale.residuos.weight;

                return helpers.clamp(weightedLoad, 0, 100);
            },
            indiceGlobal(pollutantLoad, helpers) {
                return Math.round(helpers.clamp(100 - pollutantLoad, 0, 100));
            },
            pollutantLoadFromMetrics(metrics, helpers, parameters) {
                const lim = parameters?.limites ?? {};
                const weights = parameters?.globalIndexWeights ?? { dbo: 0.28, no3: 0.22, po4: 0.22, turb: 0.14, cond: 0.10, ph: 0.04 };
                const dboN = helpers.clamp(helpers.map(metrics.dbo, lim.dbo.min, lim.dbo.max, 0, 100), 0, 100);
                const no3N = helpers.clamp(helpers.map(metrics.nitratos, lim.nitratos.min, lim.nitratos.max, 0, 100), 0, 100);
                const po4N = helpers.clamp(helpers.map(metrics.fosfatos, lim.fosfatos.min, lim.fosfatos.max, 0, 100), 0, 100);
                const turbN = helpers.clamp(helpers.map(metrics.turbidez, lim.turbidez.min, lim.turbidez.max, 0, 100), 0, 100);
                const condN = helpers.clamp(helpers.map(metrics.conductividad, lim.conductividad.min, lim.conductividad.max, 0, 100), 0, 100);
                const phDeviation = Math.abs(Number(metrics.ph) - 7);
                const phN = helpers.clamp((phDeviation / 1.5) * 100, 0, 100);

                return helpers.clamp(
                    dboN * Number(weights.dbo ?? 0.28) +
                    no3N * Number(weights.no3 ?? 0.22) +
                    po4N * Number(weights.po4 ?? 0.22) +
                    turbN * Number(weights.turb ?? 0.14) +
                    condN * Number(weights.cond ?? 0.10) +
                    phN * Number(weights.ph ?? 0.04),
                    0,
                    100
                );
            },
            metricas(state, context, helpers) {
                const { pollutantLoad, indiceGlobal, parameters } = context;
                const components =
                    context?.components ??
                    {
                        usoDomestico: model.formulas.usoDomestico(state, helpers),
                        detergentes: model.formulas.detergentes(state, parameters),
                        saneamientoFactor: model.formulas.saneamientoFactor(state, parameters),
                        agro: model.formulas.agro(state, parameters),
                        residuos: model.formulas.residuos(state, parameters)
                    };
                const lim = parameters.limites;
                const background = parameters?.background ?? { dbo_mgL: 2, no3_mgL: 1.5, po4_mgL: 0.08 };                
                const cargas = model.formulas.cargas(state, components, parameters, helpers);
                const tratadas = model.formulas.applyTreatment(cargas, state, parameters);
                const qmix_Ls = model.formulas.caudalMezcla_Ls(parameters, helpers);
                const qForConcentration_Lday = Math.max(1, qmix_Ls * 86400);
                const cDbo_mgL = (tratadas.DBO_gday * 1000) / qForConcentration_Lday;
                const cN_mgL = (tratadas.N_gday * 1000) / qForConcentration_Lday;
                const cP_mgL = (tratadas.P_gday * 1000) / qForConcentration_Lday;

                const result = {
                    ph: helpers.clamp(7.45 - pollutantLoad * 0.009, lim.ph.min, lim.ph.max),
                    od: helpers.clamp(4.2 + indiceGlobal * 0.058, lim.od.min, lim.od.max),
                    dbo: helpers.clamp(Number(background.dbo_mgL ?? 2) + cDbo_mgL, lim.dbo.min, lim.dbo.max),
                    turbidez: helpers.clamp(15 + pollutantLoad * 2.2, lim.turbidez.min, lim.turbidez.max),
                    nitratos: helpers.clamp(Number(background.no3_mgL ?? 1) + cN_mgL, lim.nitratos.min, lim.nitratos.max),
                    fosfatos: helpers.clamp(Number(background.po4_mgL ?? 0.05) + cP_mgL, lim.fosfatos.min, lim.fosfatos.max),
                    conductividad: helpers.clamp(
                        160 + pollutantLoad * 8.5,
                        lim.conductividad.min,
                        lim.conductividad.max
                    ),
                    pollutantLoadLegacy: pollutantLoad,
                    indiceGlobalLegacy: indiceGlobal,
                    households: cargas.households,
                    consumo_Lday_perHouse: cargas.consumo_Lday_perHouse,
                    consumo_Lday_total: cargas.consumo_Lday_total,
                    caudalEfectivo_Ls: cargas.Qeff_Ls,
                    flowForConcentration_Ls: qmix_Ls,
                    Qmix_Ls: qmix_Ls
                };

                result.pollutantLoad = model.formulas.pollutantLoadFromMetrics(result, helpers, parameters);
                result.indiceGlobal = model.formulas.indiceGlobal(result.pollutantLoad, helpers);

                return result;
            },
            visuales(metrics, context, helpers) {
                const asNumber = (value, fallback = 0) => {
                    const n = Number(value);
                    return Number.isFinite(n) ? n : fallback;
                };
                const safePow = (value, exp) => Math.pow(Math.max(0, value), exp);
                const internal = model.internalState ?? (model.internalState = { luz: 1, lastAlgaeCount: 1 });
                const max = context?.parameters?.visual ?? { algaeMax: 60, plantsMax: 24, bubblesMax: 60 };
                const lim =
                    context?.parameters?.limites ??
                    { od: { min: 3.5, max: 10 }, dbo: { min: 2, max: 30 }, turbidez: { min: 5, max: 250 }, nitratos: { min: 1, max: 80 }, fosfatos: { min: 0.2, max: 14 } };

                const od = asNumber(metrics?.od, lim.od.min);
                const dbo = asNumber(metrics?.dbo, lim.dbo.max);
                const turbidez = asNumber(metrics?.turbidez, lim.turbidez.max);
                const nitratos = asNumber(metrics?.nitratos, lim.nitratos.min);
                const fosfatos = asNumber(metrics?.fosfatos, lim.fosfatos.min);
                const turbN = helpers.clamp(helpers.map(turbidez, 5, 250, 0, 1), 0, 1);
                const clarity = helpers.clamp(1 - turbN, 0, 1);
                const clarityFactor = safePow(clarity, 1.2);

                const prevLuz = helpers.clamp(asNumber(internal.luz, 1), 0, 1);
                const algaeRenderMax = Math.min(60, asNumber(max.algaeMax, 60));
                const algaeRaw = 5.5436 * Math.exp(0.0559 * (nitratos + fosfatos));
                const algaeCount = helpers.clamp(Math.round(algaeRaw), 0, algaeRenderMax);
                const sombraMax = 0.6;
                const algaeShade =
                    1 -
                    helpers.clamp(
                        algaeRenderMax > 0 ? helpers.map(algaeCount, 0, algaeRenderMax, 0, sombraMax) : 0,
                        0,
                        sombraMax
                    );
                const luzNueva = helpers.clamp(clarityFactor * algaeShade, 0, 1);
                const luz = helpers.clamp(prevLuz * 0.7 + luzNueva * 0.3, 0, 1);
                const bloom =
                    algaeRenderMax > 3
                        ? helpers.clamp((algaeCount - 3) / (algaeRenderMax - 3), 0, 1)
                        : 0;

                const odN = helpers.clamp(helpers.map(od, 3.5, 10, 0, 1), 0, 1);
                const dboBad = helpers.clamp(helpers.map(dbo, 2, 30, 0, 1), 0, 1);
                const turbBad = turbN;
                const fishSuit = helpers.clamp(0.55 * odN + 0.25 * (1 - dboBad) + 0.20 * (1 - turbBad), 0, 1);
                const fishState =
                    internal.fish ??
                    (internal.fish = {
                        mode: "alive",
                        band: "excellent",
                        alive: { tilapia: 3, bagre: 2, trucha: 5 },
                        dead: { tilapia: 0, bagre: 0, trucha: 0 }
                    });

                const safeFishCounts = (counts) => ({
                    tilapia: Math.max(0, Math.round(asNumber(counts?.tilapia, 0))),
                    bagre: Math.max(0, Math.round(asNumber(counts?.bagre, 0))),
                    trucha: Math.max(0, Math.round(asNumber(counts?.trucha, 0)))
                });

                fishState.alive = safeFishCounts(fishState.alive);
                fishState.dead = safeFishCounts(fishState.dead);

                const fishThresholds = {
                    veryBadEnter: 0.25,
                    veryBadExit: 0.35,
                    lowToMedium: 0.45,
                    mediumToExcellent: 0.75,
                    bandMargin: 0.04
                };

                const resolveAliveBand = (suit, previousBand) => {
                    const margin = fishThresholds.bandMargin;
                    if (previousBand === "excellent") {
                        if (suit >= fishThresholds.mediumToExcellent - margin) return "excellent";
                        if (suit >= fishThresholds.lowToMedium) return "medium";
                        if (suit >= fishThresholds.veryBadEnter) return "low";
                        return "very_bad";
                    }
                    if (previousBand === "medium") {
                        if (suit >= fishThresholds.mediumToExcellent + margin) return "excellent";
                        if (suit >= fishThresholds.lowToMedium - margin) return "medium";
                        if (suit >= fishThresholds.veryBadEnter) return "low";
                        return "very_bad";
                    }
                    if (previousBand === "low") {
                        if (suit >= fishThresholds.mediumToExcellent) return "excellent";
                        if (suit >= fishThresholds.lowToMedium + margin) return "medium";
                        if (suit >= fishThresholds.veryBadEnter - margin) return "low";
                        return "very_bad";
                    }
                    if (suit >= fishThresholds.mediumToExcellent) return "excellent";
                    if (suit >= fishThresholds.lowToMedium) return "medium";
                    if (suit >= fishThresholds.veryBadEnter) return "low";
                    return "very_bad";
                };

                const aliveForBand = (band, suit) => {
                    if (band === "excellent") return { trucha: 5, tilapia: 3, bagre: 2 };
                    if (band === "medium") return { trucha: 0, tilapia: 4, bagre: 3 };
                    if (band === "low") {
                        return {
                            trucha: 0,
                            tilapia: 0,
                            bagre: Math.round(helpers.map(suit, fishThresholds.veryBadEnter, fishThresholds.lowToMedium, 5, 4))
                        };
                    }
                    return { trucha: 0, tilapia: 0, bagre: 0 };
                };

                if (fishState.mode === "dead") {
                    if (fishSuit > fishThresholds.veryBadExit) {
                        fishState.mode = "alive";
                        fishState.dead = { tilapia: 0, bagre: 0, trucha: 0 };
                    }
                } else if (fishSuit < fishThresholds.veryBadEnter) {
                    fishState.mode = "dead";
                    fishState.dead = { ...fishState.alive };
                    fishState.alive = { tilapia: 0, bagre: 0, trucha: 0 };
                    fishState.band = "very_bad";
                }

                if (fishState.mode === "alive") {
                    const nextBand = resolveAliveBand(fishSuit, fishState.band);
                    fishState.band = nextBand;
                    fishState.alive = safeFishCounts(aliveForBand(nextBand, fishSuit));
                }

                const fishAlive = safeFishCounts(fishState.alive);
                const fishDead = safeFishCounts(fishState.dead);
                const fishMode = fishState.mode;
                const fishBand = fishMode === "dead" ? "very_bad" : fishState.band;
                const fishCount = fishMode === "alive" ? fishAlive.tilapia + fishAlive.bagre + fishAlive.trucha : 0;
                const bubbleCount = helpers.clamp(Math.round(helpers.map(odN, 0, 1, 2, 50)), 0, max.bubblesMax);
                const plantSuit = helpers.clamp(0.6 * clarity + 0.25 * (1 - dboBad) + 0.15 * luz, 0, 1);
                const plantCount = helpers.clamp(Math.round(helpers.map(plantSuit, 0, 1, 4, 18)), 0, max.plantsMax);

                let qualityLabel = turbidez <= 40 ? "clara" : turbidez <= 120 ? "intermedia" : "turbia";
                if (bloom > 0.75 && qualityLabel === "clara") qualityLabel = "intermedia";
                if (bloom > 0.85 && qualityLabel === "intermedia") qualityLabel = "turbia";

                internal.luz = luz;
                internal.lastAlgaeCount = algaeCount;

                return {
                    fishCount,
                    fishSuit,
                    fishBand,
                    fishMode,
                    fishAlive,
                    fishDead,
                    fishSprites: {
                        tilapia: "fish_1.webp",
                        bagre: "fish_2.webp",
                        trucha: "fish_3.webp"
                    },
                    algaeCount,
                    plantCount,
                    bubbleCount,
                    qualityLabel,
                    bloom,
                    luz
                };
            }
        },
        runScenarioTests() {
            const helpers = {
                clamp(value, min, max) {
                    return Math.max(min, Math.min(max, value));
                },
                map(value, inMin, inMax, outMin, outMax) {
                    const normalized = (value - inMin) / (inMax - inMin);
                    return outMin + normalized * (outMax - outMin);
                }
            };

            const scenarios = {
                bueno: {
                    ducha: 7, inodoro: 3, manos: 3, loza: 2, lavadora: 1,
                    dientes: "cerrada", riego: false, detergentes: 1, tratamiento: "planta",
                    fertilizantes: 0, pollos: 5, ovejas: 2, vacas: 1, cerdos: 0,
                    separacion: true, botadero: false, quema: false
                },
                medio: {
                    ducha: 15, inodoro: 5, manos: 5, loza: 3, lavadora: 3,
                    dientes: "abierta", riego: false, detergentes: 3, tratamiento: "pozo",
                    fertilizantes: 1, pollos: 30, ovejas: 18, vacas: 8, cerdos: 10,
                    separacion: true, botadero: false, quema: false
                },
                malo: {
                    ducha: 35, inodoro: 9, manos: 9, loza: 6, lavadora: 6,
                    dientes: "abierta", riego: true, detergentes: 6, tratamiento: "descarga",
                    fertilizantes: 3, pollos: 150, ovejas: 120, vacas: 70, cerdos: 80,
                    separacion: false, botadero: true, quema: true
                }
            };

            Object.entries(scenarios).forEach(([name, state]) => {
                model.internalState = {
                    luz: 1,
                    lastAlgaeCount: 1,
                    fish: {
                        mode: "alive",
                        band: "excellent",
                        alive: { tilapia: 3, bagre: 2, trucha: 5 },
                        dead: { tilapia: 0, bagre: 0, trucha: 0 }
                    }
                };
                const components = {
                    usoDomestico: model.formulas.usoDomestico(state, helpers),
                    detergentes: model.formulas.detergentes(state, model.parameters),
                    saneamientoFactor: model.formulas.saneamientoFactor(state, model.parameters),
                    agro: model.formulas.agro(state, model.parameters),
                    residuos: model.formulas.residuos(state, model.parameters)
                };
                const pollutantLoad = model.formulas.pollutantLoad(components, helpers, model.parameters);
                const indiceGlobal = model.formulas.indiceGlobal(pollutantLoad, helpers);
                const metricas = model.formulas.metricas(
                    state,
                    { pollutantLoad, indiceGlobal, parameters: model.parameters, components },
                    helpers
                );
                const visuales = model.formulas.visuales(
                    { ...metricas },
                    { indiceGlobal: metricas.indiceGlobal, parameters: model.parameters },
                    helpers
                );

                console.log(
                    `[${name}]`,
                    {
                        pollutantLoadLegacy: Number(pollutantLoad.toFixed(2)),
                        pollutantLoad: Number((metricas.pollutantLoad ?? 0).toFixed(2)),
                        indiceGlobalLegacy: indiceGlobal,
                        indiceGlobal: metricas.indiceGlobal,
                        nitratos: Number(metricas.nitratos.toFixed(2)),
                        fosfatos: Number(metricas.fosfatos.toFixed(2)),
                        od: Number(metricas.od.toFixed(2)),
                        dbo: Number(metricas.dbo.toFixed(2)),
                        households: metricas.households,
                        consumo_Lday_perHouse: Number((metricas.consumo_Lday_perHouse ?? 0).toFixed(1)),
                        consumo_Lday_total: Number((metricas.consumo_Lday_total ?? 0).toFixed(1)),
                        Qeff_Ls: Number((metricas.caudalEfectivo_Ls ?? 0).toFixed(3)),
                        Qmix_Ls: Number((metricas.flowForConcentration_Ls ?? 0).toFixed(3)),
                        bloom: Number((visuales.bloom ?? 0).toFixed(3)),
                        luz: Number((model.internalState?.luz ?? visuales.luz ?? 0).toFixed(3)),
                        fishSuit: Number((visuales.fishSuit ?? 0).toFixed(3)),
                        fishBand: visuales.fishBand,
                        fishMode: visuales.fishMode,
                        fishAlive: visuales.fishAlive,
                        fishDead: visuales.fishDead,
                        visuales
                    }
                );
            });

            const sequence = [
                {
                    name: "seq-1-alta",
                    state: {
                        ducha: 7, inodoro: 3, manos: 3, loza: 2, lavadora: 1,
                        dientes: "cerrada", riego: false, detergentes: 1, tratamiento: "planta",
                        fertilizantes: 0, pollos: 5, ovejas: 2, vacas: 1, cerdos: 0,
                        separacion: true, botadero: false, quema: false
                    }
                },
                {
                    name: "seq-2-media",
                    state: {
                        ducha: 16, inodoro: 5, manos: 5, loza: 3, lavadora: 3,
                        dientes: "abierta", riego: false, detergentes: 3, tratamiento: "pozo",
                        fertilizantes: 1, pollos: 40, ovejas: 20, vacas: 10, cerdos: 14,
                        separacion: true, botadero: false, quema: false
                    }
                },
                {
                    name: "seq-3-baja",
                    state: {
                        ducha: 28, inodoro: 8, manos: 8, loza: 5, lavadora: 5,
                        dientes: "abierta", riego: true, detergentes: 5, tratamiento: "pozo",
                        fertilizantes: 2, pollos: 90, ovejas: 70, vacas: 40, cerdos: 50,
                        separacion: false, botadero: true, quema: false
                    }
                },
                {
                    name: "seq-4-muy-mala",
                    state: {
                        ducha: 36, inodoro: 10, manos: 10, loza: 6, lavadora: 7,
                        dientes: "abierta", riego: true, detergentes: 6, tratamiento: "descarga",
                        fertilizantes: 3, pollos: 180, ovejas: 170, vacas: 150, cerdos: 180,
                        separacion: false, botadero: true, quema: true
                    }
                },
                {
                    name: "seq-5-recupera",
                    state: {
                        ducha: 10, inodoro: 4, manos: 4, loza: 2, lavadora: 2,
                        dientes: "cerrada", riego: false, detergentes: 2, tratamiento: "planta",
                        fertilizantes: 0, pollos: 15, ovejas: 8, vacas: 3, cerdos: 6,
                        separacion: true, botadero: false, quema: false
                    }
                }
            ];

            model.internalState = {
                luz: 1,
                lastAlgaeCount: 1,
                fish: {
                    mode: "alive",
                    band: "excellent",
                    alive: { tilapia: 3, bagre: 2, trucha: 5 },
                    dead: { tilapia: 0, bagre: 0, trucha: 0 }
                }
            };

            sequence.forEach((item) => {
                const state = item.state;
                const components = {
                    usoDomestico: model.formulas.usoDomestico(state, helpers),
                    detergentes: model.formulas.detergentes(state, model.parameters),
                    saneamientoFactor: model.formulas.saneamientoFactor(state, model.parameters),
                    agro: model.formulas.agro(state, model.parameters),
                    residuos: model.formulas.residuos(state, model.parameters)
                };
                const pollutantLoad = model.formulas.pollutantLoad(components, helpers, model.parameters);
                const indiceGlobal = model.formulas.indiceGlobal(pollutantLoad, helpers);
                const metricas = model.formulas.metricas(
                    state,
                    { pollutantLoad, indiceGlobal, parameters: model.parameters, components },
                    helpers
                );
                const visuales = model.formulas.visuales(
                    { ...metricas },
                    { indiceGlobal: metricas.indiceGlobal, parameters: model.parameters },
                    helpers
                );

                console.log(`[${item.name}]`, {
                    fishSuit: Number((visuales.fishSuit ?? 0).toFixed(3)),
                    fishBand: visuales.fishBand,
                    fishMode: visuales.fishMode,
                    fishAlive: visuales.fishAlive,
                    fishDead: visuales.fishDead,
                    households: metricas.households,
                    consumo_Lday_perHouse: Number((metricas.consumo_Lday_perHouse ?? 0).toFixed(1)),
                    consumo_Lday_total: Number((metricas.consumo_Lday_total ?? 0).toFixed(1)),
                    Qeff_Ls: Number((metricas.caudalEfectivo_Ls ?? 0).toFixed(3)),
                    Qmix_Ls: Number((metricas.flowForConcentration_Ls ?? 0).toFixed(3)),                    
                    dbo: Number(metricas.dbo.toFixed(2)),
                    nitratos: Number(metricas.nitratos.toFixed(2)),
                    fosfatos: Number(metricas.fosfatos.toFixed(2))
                });
            });

            const baseHydroCase = {
                ducha: 12, inodoro: 4, manos: 4, loza: 2, lavadora: 2,
                dientes: "abierta", riego: false, detergentes: 3, tratamiento: "pozo",
                fertilizantes: 1, pollos: 25, ovejas: 12, vacas: 6, cerdos: 10,
                separacion: true, botadero: false, quema: false
            };

            const highUseCase = {
                ...baseHydroCase,
                ducha: 34,
                loza: 6
            };

            [baseHydroCase, highUseCase].forEach((state, idx) => {
                const tag = idx === 0 ? "consumo-base" : "consumo-alto";
                const components = {
                    usoDomestico: model.formulas.usoDomestico(state, helpers),
                    detergentes: model.formulas.detergentes(state, model.parameters),
                    saneamientoFactor: model.formulas.saneamientoFactor(state, model.parameters),
                    agro: model.formulas.agro(state, model.parameters),
                    residuos: model.formulas.residuos(state, model.parameters)
                };
                const pollutantLoad = model.formulas.pollutantLoad(components, helpers, model.parameters);
                const indiceGlobal = model.formulas.indiceGlobal(pollutantLoad, helpers);
                const metricas = model.formulas.metricas(
                    state,
                    { pollutantLoad, indiceGlobal, parameters: model.parameters, components },
                    helpers
                );
                console.log(`[${tag}]`, {
                    households: metricas.households,
                    consumo_Lday_perHouse: Number((metricas.consumo_Lday_perHouse ?? 0).toFixed(1)),
                    consumo_Lday_total: Number((metricas.consumo_Lday_total ?? 0).toFixed(1)),
                    Qeff_Ls: Number((metricas.caudalEfectivo_Ls ?? 0).toFixed(3)),
                    Qmix_Ls: Number((metricas.flowForConcentration_Ls ?? 0).toFixed(3)),
                    dbo: Number(metricas.dbo.toFixed(2)),
                    nitratos: Number(metricas.nitratos.toFixed(2)),
                    fosfatos: Number(metricas.fosfatos.toFixed(2))
                });
            });

            ["descarga", "planta"].forEach((tratamiento) => {
                const state = {
                    ...baseHydroCase,
                    tratamiento
                };
                const components = {
                    usoDomestico: model.formulas.usoDomestico(state, helpers),
                    detergentes: model.formulas.detergentes(state, model.parameters),
                    saneamientoFactor: model.formulas.saneamientoFactor(state, model.parameters),
                    agro: model.formulas.agro(state, model.parameters),
                    residuos: model.formulas.residuos(state, model.parameters)
                };
                const pollutantLoad = model.formulas.pollutantLoad(components, helpers, model.parameters);
                const indiceGlobal = model.formulas.indiceGlobal(pollutantLoad, helpers);
                const metricas = model.formulas.metricas(
                    state,
                    { pollutantLoad, indiceGlobal, parameters: model.parameters, components },
                    helpers
                );

                console.log(`[tratamiento-${tratamiento}]`, {
                    households: metricas.households,
                    consumo_Lday_perHouse: Number((metricas.consumo_Lday_perHouse ?? 0).toFixed(1)),
                    consumo_Lday_total: Number((metricas.consumo_Lday_total ?? 0).toFixed(1)),
                    Qeff_Ls: Number((metricas.caudalEfectivo_Ls ?? 0).toFixed(3)),
                    Qmix_Ls: Number((metricas.flowForConcentration_Ls ?? 0).toFixed(3)),
                    dbo: Number(metricas.dbo.toFixed(2)),
                    nitratos: Number(metricas.nitratos.toFixed(2)),
                    fosfatos: Number(metricas.fosfatos.toFixed(2))
                });
            });

            const hogaresBase = { ...baseHydroCase, tratamiento: "descarga" };
            [1, 50, 200, 500].forEach((numCasas) => {
                const state = { ...hogaresBase, numCasas };
                const components = {
                    usoDomestico: model.formulas.usoDomestico(state, helpers),
                    detergentes: model.formulas.detergentes(state, model.parameters),
                    saneamientoFactor: model.formulas.saneamientoFactor(state, model.parameters),
                    agro: model.formulas.agro(state, model.parameters),
                    residuos: model.formulas.residuos(state, model.parameters)
                };
                const pollutantLoadLegacy = model.formulas.pollutantLoad(components, helpers, model.parameters);
                const indiceGlobalLegacy = model.formulas.indiceGlobal(pollutantLoadLegacy, helpers);
                const metricas = model.formulas.metricas(
                    state,
                    { pollutantLoad: pollutantLoadLegacy, indiceGlobal: indiceGlobalLegacy, parameters: model.parameters, components },
                    helpers
                );
                console.log(`[casas-${numCasas}]`, {
                    households: metricas.households,
                    dbo: Number(metricas.dbo.toFixed(2)),
                    nitratos: Number(metricas.nitratos.toFixed(2)),
                    fosfatos: Number(metricas.fosfatos.toFixed(2)),
                    pollutantLoad: Number((metricas.pollutantLoad ?? 0).toFixed(2)),
                    indiceGlobal: metricas.indiceGlobal,
                    Qmix_Ls: Number((metricas.flowForConcentration_Ls ?? 0).toFixed(3))
                });
            });

            ["descarga", "planta"].forEach((tratamiento) => {
                const state = { ...baseHydroCase, numCasas: 200, tratamiento };
                const components = {
                    usoDomestico: model.formulas.usoDomestico(state, helpers),
                    detergentes: model.formulas.detergentes(state, model.parameters),
                    saneamientoFactor: model.formulas.saneamientoFactor(state, model.parameters),
                    agro: model.formulas.agro(state, model.parameters),
                    residuos: model.formulas.residuos(state, model.parameters)
                };
                const pollutantLoadLegacy = model.formulas.pollutantLoad(components, helpers, model.parameters);
                const indiceGlobalLegacy = model.formulas.indiceGlobal(pollutantLoadLegacy, helpers);
                const metricas = model.formulas.metricas(
                    state,
                    { pollutantLoad: pollutantLoadLegacy, indiceGlobal: indiceGlobalLegacy, parameters: model.parameters, components },
                    helpers
                );
                console.log(`[casas-200-tratamiento-${tratamiento}]`, {
                    households: metricas.households,
                    dbo: Number(metricas.dbo.toFixed(2)),
                    nitratos: Number(metricas.nitratos.toFixed(2)),
                    fosfatos: Number(metricas.fosfatos.toFixed(2)),
                    pollutantLoad: Number((metricas.pollutantLoad ?? 0).toFixed(2)),
                    indiceGlobal: metricas.indiceGlobal
                });
            });
        }
    };

    window.WATER_QUALITY_MODEL = model;
})();
