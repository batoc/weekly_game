/* =========================================================
   STORE.JS - Data Management Layer
   localStorage + GitHub Sync automático
   ========================================================= */

const Store = (() => {
    const STORAGE_KEY = 'quest_equipo_data';
    let _syncTimeout = null;   // Debounce para sync a GitHub
    let _isSyncing = false;    // Flag para evitar loops
    const SYNC_DEBOUNCE_MS = 2000; // Esperar 2s después del último cambio antes de sync

    const AVATARS = ['🦸‍♀️','🧙‍♂️','🦹‍♀️','🧝‍♂️','🤖','🦊','🐱','🦁','🐸','🦄','🧛','🧜‍♀️','🥷','🧑‍🚀','🧑‍🎤','🦸','🧟','🐺','🦅','🐲'];

    const PLAYER_COLORS = ['#ff6b35','#7b2ff7','#00d4aa','#ffd700','#ff4757','#1e90ff'];

    const DEFAULT_DATA = {
        config: {
            semana_actual: 1,
            anio: 2026,
            nombre_equipo: "Dream Team",
            premios: [
                { id: 1, nombre: "Dulce Grupal", desc: "Todos le llevan un dulce 🍬", icono: "🍬" },
                { id: 2, nombre: "Frase Motivacional", desc: "Cada uno le dedica una frase 💬", icono: "💬" },
                { id: 3, nombre: "Corona Semanal", desc: "Porta la corona toda la semana 👑", icono: "👑" },
                { id: 4, nombre: "Café Gratis", desc: "Un café invitado por el equipo ☕", icono: "☕" },
                { id: 5, nombre: "Meme Dedicado", desc: "Le hacen un meme gracioso 😂", icono: "😂" }
            ],
            categorias_voto: [
                { id: 1, nombre: "Mejor Compañero", icono: "🤝", tipo: "positivo" },
                { id: 2, nombre: "Líder Natural", icono: "🦁", tipo: "positivo" },
                { id: 3, nombre: "Más Divertido", icono: "😄", tipo: "positivo" },
                { id: 4, nombre: "Más Ordenado", icono: "📋", tipo: "positivo" },
                { id: 5, nombre: "Mejor Comunicador", icono: "🗣️", tipo: "positivo" },
                { id: 6, nombre: "Más Afectuoso", icono: "💖", tipo: "positivo" },
                { id: 7, nombre: "Segundo al Mando", icono: "🥈", tipo: "positivo" },
                { id: 8, nombre: "Más Regañón", icono: "😤", tipo: "divertido" }
            ],
            poderes: [
                { id: 1, nombre: "Pedir Refuerzo", desc: "Un compañero aleatorio te ayuda esta semana", icono: "🤝", tipo: "ayuda" },
                { id: 2, nombre: "Dividir y Conquistar", desc: "Divide una tarea con otro compañero", icono: "⚔️", tipo: "ayuda" },
                { id: 3, nombre: "Transferir Caso", desc: "Transfiere un caso retrasado a un voluntario", icono: "📦", tipo: "asignacion" },
                { id: 4, nombre: "Consultoría Express", desc: "30 min de acompañamiento para decidir", icono: "🧠", tipo: "ayuda" },
                { id: 5, nombre: "Escudo Protector", desc: "No pierde puntos esta semana si no cumple", icono: "🛡️", tipo: "defensa" },
                { id: 6, nombre: "Doble XP", desc: "Puntos dobles por las metas cumplidas", icono: "⚡", tipo: "boost" }
            ],
            badges_definiciones: [
                { id: "primer_logro", nombre: "Primer Logro", icono: "🌟", desc: "Completó su primera meta al 100%", condicion: "primera_meta_100" },
                { id: "racha_3", nombre: "Racha Imparable", icono: "🔥", desc: "3 semanas consecutivas al 100%", condicion: "racha_3" },
                { id: "cazador_10", nombre: "Cazador de Casos", icono: "🎯", desc: "10 casos resueltos", condicion: "casos_10" },
                { id: "cazador_50", nombre: "Maestro de Casos", icono: "💎", desc: "50 casos resueltos", condicion: "casos_50" },
                { id: "equipo", nombre: "Trabajo en Equipo", icono: "🤝", desc: "Usó un poder de ayuda", condicion: "uso_poder" },
                { id: "proyecto_done", nombre: "Proyecto Terminado", icono: "🏁", desc: "Completó un proyecto", condicion: "proyecto_completado" },
                { id: "emp_mes", nombre: "Empleado del Mes", icono: "🏆", desc: "Más puntos en el mes", condicion: "empleado_mes" },
                { id: "popular", nombre: "Favorito del Equipo", icono: "❤️", desc: "Más votos positivos en una semana", condicion: "mas_votos" },
                { id: "nivel_5", nombre: "Veterano", icono: "⭐", desc: "Alcanzó nivel 5", condicion: "nivel_5" },
                { id: "nivel_10", nombre: "Leyenda", icono: "👑", desc: "Alcanzó nivel 10", condicion: "nivel_10" }
            ]
        },
        jugadores: [
            { id: "ana", nombre: "Ana María Rubiano", avatar: "🦸‍♀️", color: "#ff6b35", pts: 0, nivel: 1, xp: 0, badges: [], stats: { proyectos_completados: 0, casos_resueltos: 0, semanas_100: 0, racha_actual: 0, poderes_usados: 0, votos_recibidos: 0 }},
            { id: "magda", nombre: "Magda Medina", avatar: "🧙‍♂️", color: "#7b2ff7", pts: 0, nivel: 1, xp: 0, badges: [], stats: { proyectos_completados: 0, casos_resueltos: 0, semanas_100: 0, racha_actual: 0, poderes_usados: 0, votos_recibidos: 0 }},
            { id: "monica", nombre: "Monica Muñoz", avatar: "🦹‍♀️", color: "#00d4aa", pts: 0, nivel: 1, xp: 0, badges: [], stats: { proyectos_completados: 0, casos_resueltos: 0, semanas_100: 0, racha_actual: 0, poderes_usados: 0, votos_recibidos: 0 }},
            { id: "jugador4", nombre: "Jugador 4", avatar: "🧝‍♂️", color: "#ffd700", pts: 0, nivel: 1, xp: 0, badges: [], stats: { proyectos_completados: 0, casos_resueltos: 0, semanas_100: 0, racha_actual: 0, poderes_usados: 0, votos_recibidos: 0 }},
            { id: "jugador5", nombre: "Jugador 5", avatar: "🤖", color: "#ff4757", pts: 0, nivel: 1, xp: 0, badges: [], stats: { proyectos_completados: 0, casos_resueltos: 0, semanas_100: 0, racha_actual: 0, poderes_usados: 0, votos_recibidos: 0 }},
            { id: "jugador6", nombre: "Jugador 6", avatar: "🦊", color: "#1e90ff", pts: 0, nivel: 1, xp: 0, badges: [], stats: { proyectos_completados: 0, casos_resueltos: 0, semanas_100: 0, racha_actual: 0, poderes_usados: 0, votos_recibidos: 0 }}
        ],
        semanas: [],
        proyectos: [],
        menciones: [],
        historial_poderes: [],
        historial_premios: []
    };

    function getData() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_DATA));
            return JSON.parse(JSON.stringify(DEFAULT_DATA));
        }
        return JSON.parse(raw);
    }

    function saveData(data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        // Encolar sync a GitHub (debounced)
        scheduleSyncToGitHub();
    }

    // ===== GITHUB SYNC =====
    function scheduleSyncToGitHub() {
        if (_syncTimeout) clearTimeout(_syncTimeout);
        _syncTimeout = setTimeout(() => syncToGitHub(), SYNC_DEBOUNCE_MS);
    }

    async function syncToGitHub(commitMsg) {
        if (!GitHubAPI.isConfigured() || _isSyncing) return;
        _isSyncing = true;
        try {
            const data = getData();
            const msg = commitMsg || `${data.config?.nombre_equipo || 'Equipo'} - auto sync`;
            await GitHubAPI.saveData(data, msg);
            console.log('[Sync] ✅ Datos guardados en GitHub');
        } catch (err) {
            console.warn('[Sync] ⚠️ Error al sincronizar:', err.message);
        } finally {
            _isSyncing = false;
        }
    }

    async function loadFromGitHub() {
        if (!GitHubAPI.isConfigured()) return false;
        try {
            const remoteData = await GitHubAPI.fetchData();
            if (remoteData && remoteData.jugadores) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteData));
                console.log('[Sync] ✅ Datos cargados desde GitHub');
                return true;
            }
        } catch (err) {
            console.warn('[Sync] ⚠️ No se pudo cargar desde GitHub:', err.message);
        }
        return false;
    }

    async function initGitHubSync() {
        if (!GitHubAPI.isConfigured()) return;
        // Cargar datos desde GitHub al inicio
        const loaded = await loadFromGitHub();
        if (!loaded) {
            // Si no hay data en GitHub, subir la local
            const localData = getData();
            if (localData.jugadores) {
                await GitHubAPI.initDataFile(localData);
            }
        }
        // Iniciar polling: recargar datos cada 30s
        GitHubAPI.startPolling((remoteData) => {
            if (remoteData && !_isSyncing) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteData));
                // Emitir evento para que app.js actualice UI
                window.dispatchEvent(new CustomEvent('github-data-updated', { detail: remoteData }));
            }
        }, 30000);
    }

    function stopGitHubSync() {
        GitHubAPI.stopPolling();
    }

    function resetData() {
        localStorage.removeItem(STORAGE_KEY);
        return getData();
    }

    // ===== JUGADORES =====
    function getJugadores() { return getData().jugadores; }

    function getJugador(id) { return getData().jugadores.find(j => j.id === id); }

    function updateJugador(id, updates) {
        const data = getData();
        const idx = data.jugadores.findIndex(j => j.id === id);
        if (idx === -1) return;
        Object.assign(data.jugadores[idx], updates);
        saveData(data);
        return data.jugadores[idx];
    }

    function addJugador(jugador) {
        const data = getData();
        const id = jugador.nombre.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        const newPlayer = {
            id,
            nombre: jugador.nombre,
            avatar: jugador.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)],
            color: PLAYER_COLORS[data.jugadores.length % PLAYER_COLORS.length],
            pts: 0, nivel: 1, xp: 0, badges: [],
            stats: { proyectos_completados: 0, casos_resueltos: 0, semanas_100: 0, racha_actual: 0, poderes_usados: 0, votos_recibidos: 0 }
        };
        data.jugadores.push(newPlayer);
        saveData(data);
        return newPlayer;
    }

    function removeJugador(id) {
        const data = getData();
        data.jugadores = data.jugadores.filter(j => j.id !== id);
        saveData(data);
    }

    // ===== SEMANAS =====
    function getSemanaActual() {
        const data = getData();
        const num = data.config.semana_actual;
        return data.semanas.find(s => s.numero === num);
    }

    function getSemana(num) {
        return getData().semanas.find(s => s.numero === num);
    }

    function crearSemana(numero) {
        const data = getData();
        if (data.semanas.find(s => s.numero === numero)) return;
        const hoy = new Date();
        const lunes = new Date(hoy);
        lunes.setDate(hoy.getDate() - hoy.getDay() + 1);
        const viernes = new Date(lunes);
        viernes.setDate(lunes.getDate() + 4);
        const semana = {
            numero,
            fecha_inicio: lunes.toISOString().split('T')[0],
            fecha_fin: viernes.toISOString().split('T')[0],
            metas: {},
            votos: {},
            poderes_activados: [],
            verificada: false,
            premio_otorgado: null
        };
        data.jugadores.forEach(j => {
            semana.metas[j.id] = {
                proyectos: [],
                casos_meta: 0,
                casos_cumplidos: 0,
                avance_general: 0,
                puntos_ganados: 0,
                cumplida: false
            };
            semana.votos[j.id] = {};
        });
        data.semanas.push(semana);
        data.config.semana_actual = numero;
        saveData(data);
        return semana;
    }

    function updateMeta(semanaNum, jugadorId, metaData) {
        const data = getData();
        const sem = data.semanas.find(s => s.numero === semanaNum);
        if (!sem) return;
        if (!sem.metas[jugadorId]) {
            sem.metas[jugadorId] = { proyectos: [], casos_meta: 0, casos_cumplidos: 0, avance_general: 0, puntos_ganados: 0, cumplida: false };
        }
        Object.assign(sem.metas[jugadorId], metaData);
        saveData(data);
    }

    function verificarSemana(semanaNum) {
        const data = getData();
        const sem = data.semanas.find(s => s.numero === semanaNum);
        if (!sem) return;
        sem.verificada = true;

        Object.keys(sem.metas).forEach(jId => {
            const meta = sem.metas[jId];
            const jugador = data.jugadores.find(j => j.id === jId);
            if (!jugador) return;

            let ptsGanados = 0;
            let tieneDoblePts = sem.poderes_activados.some(p => p.poder_id === 6 && p.jugador_id === jId);
            let tieneEscudo = sem.poderes_activados.some(p => p.poder_id === 5 && p.jugador_id === jId);
            let mult = tieneDoblePts ? 2 : 1;

            if (meta.avance_general >= 100) {
                ptsGanados += 10 * mult;
                jugador.stats.semanas_100 = (jugador.stats.semanas_100 || 0) + 1;
                jugador.stats.racha_actual = (jugador.stats.racha_actual || 0) + 1;
                meta.cumplida = true;
            } else if (meta.avance_general >= 50) {
                ptsGanados += 5 * mult;
                jugador.stats.racha_actual = tieneEscudo ? jugador.stats.racha_actual : 0;
            } else {
                if (!tieneEscudo) jugador.stats.racha_actual = 0;
            }

            ptsGanados += (meta.casos_cumplidos || 0) * 2 * mult;
            jugador.stats.casos_resueltos = (jugador.stats.casos_resueltos || 0) + (meta.casos_cumplidos || 0);

            meta.puntos_ganados = ptsGanados;
            jugador.pts = (jugador.pts || 0) + ptsGanados;
            jugador.xp = (jugador.xp || 0) + ptsGanados;

            // Level up check
            const xpParaNivel = (n) => n * 100;
            while (jugador.xp >= xpParaNivel(jugador.nivel)) {
                jugador.xp -= xpParaNivel(jugador.nivel);
                jugador.nivel++;
            }

            // Badge checks
            checkBadges(jugador, data);
        });

        saveData(data);
        return sem;
    }

    function checkBadges(jugador, data) {
        const badges = jugador.badges || [];
        const addBadge = (id) => { if (!badges.includes(id)) badges.push(id); };

        if (jugador.stats.semanas_100 >= 1) addBadge('primer_logro');
        if (jugador.stats.racha_actual >= 3) addBadge('racha_3');
        if (jugador.stats.casos_resueltos >= 10) addBadge('cazador_10');
        if (jugador.stats.casos_resueltos >= 50) addBadge('cazador_50');
        if (jugador.stats.poderes_usados >= 1) addBadge('equipo');
        if (jugador.stats.proyectos_completados >= 1) addBadge('proyecto_done');
        if (jugador.nivel >= 5) addBadge('nivel_5');
        if (jugador.nivel >= 10) addBadge('nivel_10');

        jugador.badges = badges;
    }

    // ===== VOTOS =====
    function submitVoto(semanaNum, votanteId, categoriaId, votadoId) {
        const data = getData();
        const sem = data.semanas.find(s => s.numero === semanaNum);
        if (!sem) return;
        if (!sem.votos[votanteId]) sem.votos[votanteId] = {};
        sem.votos[votanteId][categoriaId] = votadoId;
        saveData(data);
    }

    function getVotosResultados(semanaNum) {
        const data = getData();
        const sem = data.semanas.find(s => s.numero === semanaNum);
        if (!sem) return {};
        const resultados = {};
        data.config.categorias_voto.forEach(cat => {
            resultados[cat.id] = {};
            data.jugadores.forEach(j => { resultados[cat.id][j.id] = 0; });
        });
        Object.values(sem.votos).forEach(votosDeJugador => {
            Object.entries(votosDeJugador).forEach(([catId, votadoId]) => {
                if (resultados[catId] && resultados[catId][votadoId] !== undefined) {
                    resultados[catId][votadoId]++;
                }
            });
        });
        return resultados;
    }

    // ===== PODERES =====
    function activarPoder(semanaNum, poderId, jugadorId) {
        const data = getData();
        const sem = data.semanas.find(s => s.numero === semanaNum);
        if (!sem) return;
        const otrosJugadores = data.jugadores.filter(j => j.id !== jugadorId);
        const helper = otrosJugadores[Math.floor(Math.random() * otrosJugadores.length)];
        const activacion = {
            poder_id: poderId,
            jugador_id: jugadorId,
            helper_id: helper ? helper.id : null,
            fecha: new Date().toISOString(),
            activo: true
        };
        sem.poderes_activados.push(activacion);
        const jugador = data.jugadores.find(j => j.id === jugadorId);
        if (jugador) jugador.stats.poderes_usados = (jugador.stats.poderes_usados || 0) + 1;
        data.historial_poderes.push({ ...activacion, semana: semanaNum });
        saveData(data);
        return activacion;
    }

    // ===== PROYECTOS =====
    function getProyectos() { return getData().proyectos; }

    function addProyecto(proyecto) {
        const data = getData();
        const id = 'proy_' + Date.now();
        const newProy = {
            id,
            nombre: proyecto.nombre,
            descripcion: proyecto.descripcion || '',
            responsables: proyecto.responsables || [],
            estado: 'activo',
            avance: 0,
            fecha_inicio: new Date().toISOString().split('T')[0],
            fecha_estimada: proyecto.fecha_estimada || '',
            entregables: proyecto.entregables || [],
            registros: []
        };
        data.proyectos.push(newProy);
        saveData(data);
        return newProy;
    }

    function updateProyecto(id, updates) {
        const data = getData();
        const idx = data.proyectos.findIndex(p => p.id === id);
        if (idx === -1) return;
        Object.assign(data.proyectos[idx], updates);
        saveData(data);
        return data.proyectos[idx];
    }

    function addRegistroProyecto(proyId, registro) {
        const data = getData();
        const proy = data.proyectos.find(p => p.id === proyId);
        if (!proy) return;
        proy.registros.push({
            semana: data.config.semana_actual,
            fecha: new Date().toISOString().split('T')[0],
            avance: registro.avance,
            nota: registro.nota,
            autor: registro.autor
        });
        proy.avance = registro.avance;
        if (registro.avance >= 100) {
            proy.estado = 'completado';
            (proy.responsables || []).forEach(rId => {
                const j = data.jugadores.find(jj => jj.id === rId);
                if (j) {
                    j.pts += 20;
                    j.xp += 20;
                    j.stats.proyectos_completados++;
                    checkBadges(j, data);
                    while (j.xp >= j.nivel * 100) { j.xp -= j.nivel * 100; j.nivel++; }
                }
            });
        }
        saveData(data);
    }

    // ===== MENCIONES =====
    function addMencion(mencion) {
        const data = getData();
        data.menciones.push({
            id: Date.now(),
            texto: mencion.texto,
            para: mencion.para,
            anonimo: true,
            semana: data.config.semana_actual,
            fecha: new Date().toISOString()
        });
        saveData(data);
    }

    function getMenciones(jugadorId) {
        return getData().menciones.filter(m => m.para === jugadorId);
    }

    // ===== CONFIG =====
    function getConfig() { return getData().config; }

    function updateConfig(updates) {
        const data = getData();
        Object.assign(data.config, updates);
        saveData(data);
    }

    function avanzarSemana() {
        const data = getData();
        const nueva = data.config.semana_actual + 1;
        data.config.semana_actual = nueva;
        saveData(data);
        crearSemana(nueva);
        return nueva;
    }

    // ===== RANKINGS =====
    function getRanking(tipo) {
        const data = getData();
        const jugadores = JSON.parse(JSON.stringify(data.jugadores));
        if (tipo === 'semanal') {
            const sem = data.semanas.find(s => s.numero === data.config.semana_actual);
            if (sem) {
                jugadores.forEach(j => { j._pts_periodo = sem.metas[j.id]?.puntos_ganados || 0; });
            } else {
                jugadores.forEach(j => { j._pts_periodo = 0; });
            }
        } else if (tipo === 'mensual') {
            const semActual = data.config.semana_actual;
            const desde = Math.max(1, semActual - 3);
            jugadores.forEach(j => {
                j._pts_periodo = data.semanas
                    .filter(s => s.numero >= desde && s.numero <= semActual)
                    .reduce((sum, s) => sum + (s.metas[j.id]?.puntos_ganados || 0), 0);
            });
        } else if (tipo === 'trimestral') {
            const semActual = data.config.semana_actual;
            const desde = Math.max(1, semActual - 11);
            jugadores.forEach(j => {
                j._pts_periodo = data.semanas
                    .filter(s => s.numero >= desde && s.numero <= semActual)
                    .reduce((sum, s) => sum + (s.metas[j.id]?.puntos_ganados || 0), 0);
            });
        } else {
            jugadores.forEach(j => { j._pts_periodo = j.pts; });
        }
        return jugadores.sort((a, b) => b._pts_periodo - a._pts_periodo);
    }

    // ===== EXPORT / IMPORT =====
    function exportData() {
        const data = getData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quest_equipo_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function importData(jsonString) {
        const data = JSON.parse(jsonString);
        if (!data.jugadores || !data.config) throw new Error('Formato inválido');
        saveData(data);
        return data;
    }

    return {
        AVATARS, PLAYER_COLORS, getData, saveData, resetData,
        getJugadores, getJugador, updateJugador, addJugador, removeJugador,
        getSemanaActual, getSemana, crearSemana, updateMeta, verificarSemana,
        submitVoto, getVotosResultados,
        activarPoder,
        getProyectos, addProyecto, updateProyecto, addRegistroProyecto,
        addMencion, getMenciones,
        getConfig, updateConfig, avanzarSemana,
        getRanking, exportData, importData, checkBadges,
        // GitHub Sync
        syncToGitHub, loadFromGitHub, initGitHubSync, stopGitHubSync
    };
})();
