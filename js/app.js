/* =========================================================
   APP.JS - Quest del Equipo - Main Application Logic
   Pantallas, eventos, UI components, game loop
   ========================================================= */

const App = (() => {
    let currentPlayer = null;
    let currentScreen = 'dashboard';
    const TEAM_PASSWORD = 'quest2026'; // Contraseña por defecto, cámbiala

    // ===== INIT =====
    async function init() {
        updateGitHubStatusBar();
        // Intentar cargar desde GitHub primero
        if (GitHubAPI.isConfigured()) {
            try {
                showGitHubStatusMsg('Conectando con GitHub...');
                await Store.initGitHubSync();
                showGitHubStatusMsg('✅ Conectado a GitHub', 'success');
            } catch (e) {
                showGitHubStatusMsg('⚠️ Modo offline (localStorage)', 'warning');
            }
        }
        const data = Store.getData();
        if (data.semanas.length === 0) {
            Store.crearSemana(1);
        }
        populateLoginSelect();

        // Escuchar actualizaciones remotas
        window.addEventListener('github-data-updated', () => {
            if (currentPlayer) {
                currentPlayer = Store.getJugador(currentPlayer.id);
                const renderers = { dashboard: renderDashboard, misiones: renderMisiones, verificar: renderVerificar, poderes: renderPoderes, votos: renderVotos, rankings: renderRankings, proyectos: renderProyectos, perfil: renderPerfil };
                if (renderers[currentScreen]) renderers[currentScreen]();
                updateSidebarInfo();
            }
        });
    }

    function showGitHubStatusMsg(msg, type = 'info') {
        const bar = document.getElementById('github-status-bar');
        if (!bar) return;
        const colors = { info: 'var(--text-muted)', success: 'var(--success)', warning: 'var(--warning)', error: 'var(--danger)' };
        bar.innerHTML = `<div style="text-align:center;padding:8px;font-size:0.8rem;color:${colors[type] || colors.info};border:1px solid ${colors[type] || colors.info};border-radius:8px;margin-bottom:10px">${msg}</div>`;
    }

    function updateGitHubStatusBar() {
        const bar = document.getElementById('github-status-bar');
        if (!bar) return;
        if (GitHubAPI.isConfigured()) {
            const cfg = GitHubAPI.getGitHubConfig();
            bar.innerHTML = `<div style="text-align:center;padding:8px;font-size:0.8rem;color:var(--success);border:1px solid var(--success);border-radius:8px;margin-bottom:10px">🟢 Conectado: ${cfg.owner}/${cfg.repo}</div>`;
        } else {
            bar.innerHTML = `<div style="text-align:center;padding:8px;font-size:0.8rem;color:var(--text-muted);border:1px solid var(--border);border-radius:8px;margin-bottom:10px">🔴 Modo local — <a href="#" onclick="App.showGitHubSetup();return false" style="color:var(--primary)">Conectar GitHub</a></div>`;
        }
    }

    function populateLoginSelect() {
        const sel = document.getElementById('login-player-select');
        sel.innerHTML = '<option value="">-- Elige tu héroe --</option>';
        Store.getJugadores().forEach(j => {
            sel.innerHTML += `<option value="${j.id}">${j.avatar} ${j.nombre}</option>`;
        });
        sel.innerHTML += '<option value="__new__">➕ Agregar nuevo miembro</option>';
    }

    // ===== LOGIN / LOGOUT =====
    function login() {
        const sel = document.getElementById('login-player-select');
        const id = sel.value;
        const pwd = document.getElementById('login-password').value;

        if (!pwd) return toast('Ingresa la contraseña del equipo', 'warning');

        // Verificar contraseña (almacenada o por defecto)
        const storedPwd = localStorage.getItem('quest_team_password') || TEAM_PASSWORD;
        if (pwd !== storedPwd) return toast('Contraseña incorrecta', 'error');

        if (!id) return toast('Selecciona un personaje', 'warning');
        if (id === '__new__') return showAddPlayerModal();
        currentPlayer = Store.getJugador(id);
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-container').classList.remove('hidden');
        updateSidebarInfo();
        showScreen('dashboard');
        toast(`¡Bienvenido ${currentPlayer.nombre}!`, 'success');
    }

    function logout() {
        currentPlayer = null;
        Store.stopGitHubSync();
        document.getElementById('app-container').classList.add('hidden');
        document.getElementById('login-screen').classList.remove('hidden');
        document.getElementById('login-screen').classList.add('active');
        populateLoginSelect();
        updateGitHubStatusBar();
    }

    // ===== GITHUB SETUP =====
    function showGitHubSetup() {
        const cfg = GitHubAPI.getGitHubConfig() || {};
        showModal(`
            <div class="modal-title">🔗 Configurar Conexión GitHub</div>
            <p class="text-muted mb-20">Conecta tu juego con un repositorio de GitHub para que todos compartan los datos. 100% gratis.</p>

            <div style="background:var(--bg-dark);border-radius:10px;padding:16px;margin-bottom:20px;border:1px solid var(--border)">
                <strong style="color:var(--accent)">📋 Pasos previos (solo la primera vez):</strong>
                <ol style="margin:10px 0;padding-left:20px;color:var(--text-muted);font-size:0.9rem;line-height:1.8">
                    <li>Crea un repo en <a href="https://github.com/new" target="_blank" style="color:var(--primary)">github.com/new</a> → nombre: <code>juego-planificacion</code> → Público → Create</li>
                    <li>Ve a <a href="https://github.com/settings/tokens?type=beta" target="_blank" style="color:var(--primary)">Settings → Tokens (Fine-grained)</a></li>
                    <li>Generate new token → nombre: "Quest Equipo" → Repository: tu repo → Permissions: Contents = Read and Write → Generate</li>
                    <li>Copia el token y pégalo abajo</li>
                </ol>
            </div>

            <div class="form-group">
                <label>👤 Tu usuario de GitHub:</label>
                <input type="text" id="gh-owner" placeholder="Ej: mi-usuario" value="${sanitize(cfg.owner || '')}">
            </div>
            <div class="form-group">
                <label>📁 Nombre del repositorio:</label>
                <input type="text" id="gh-repo" placeholder="Ej: juego-planificacion" value="${sanitize(cfg.repo || '')}">
            </div>
            <div class="form-group">
                <label>🔑 Token de acceso personal (PAT):</label>
                <input type="password" id="gh-token" placeholder="github_pat_xxxx..." value="${cfg.token ? '••••••••••••' : ''}">
                <small class="text-muted">Este token se guarda solo en TU navegador (localStorage). Nunca sale de tu máquina excepto a GitHub.</small>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button class="btn btn-primary" onclick="App.saveGitHubConfig()">💾 Guardar y Conectar</button>
                <button class="btn btn-accent" onclick="App.testGitHubConnection()">🧪 Probar Conexión</button>
                ${cfg.owner ? '<button class="btn btn-danger btn-sm" onclick="App.disconnectGitHub()">🔌 Desconectar</button>' : ''}
            </div>
            <div id="gh-test-result" class="mt-20"></div>
        `);
    }

    async function saveGitHubConfig() {
        const owner = document.getElementById('gh-owner').value.trim();
        const repo = document.getElementById('gh-repo').value.trim();
        const tokenInput = document.getElementById('gh-token').value.trim();

        if (!owner || !repo) return toast('Completa usuario y repositorio', 'warning');

        const existingCfg = GitHubAPI.getGitHubConfig();
        const token = (tokenInput && !tokenInput.startsWith('••')) ? tokenInput : existingCfg?.token;

        if (!token) return toast('Ingresa el token de acceso', 'warning');

        GitHubAPI.saveGitHubConfig({ owner, repo, token });

        // Probar conexión
        const result = await GitHubAPI.testConnection();
        if (result.ok) {
            toast('✅ ¡Conectado a GitHub exitosamente!', 'success');
            closeModal();
            // Inicializar sync
            await Store.initGitHubSync();
            populateLoginSelect();
            updateGitHubStatusBar();
        } else {
            toast(`❌ ${result.error}`, 'error');
            document.getElementById('gh-test-result').innerHTML =
                `<div style="color:var(--danger);padding:12px;background:rgba(255,71,87,0.1);border-radius:8px">${result.error}</div>`;
        }
    }

    async function testGitHubConnection() {
        const owner = document.getElementById('gh-owner').value.trim();
        const repo = document.getElementById('gh-repo').value.trim();
        const tokenInput = document.getElementById('gh-token').value.trim();
        const existingCfg = GitHubAPI.getGitHubConfig();
        const token = (tokenInput && !tokenInput.startsWith('••')) ? tokenInput : existingCfg?.token;

        if (!owner || !repo || !token) {
            document.getElementById('gh-test-result').innerHTML =
                '<div style="color:var(--warning)">Completa todos los campos primero</div>';
            return;
        }

        // Temporarily save config for testing
        GitHubAPI.saveGitHubConfig({ owner, repo, token });
        const result = await GitHubAPI.testConnection();

        document.getElementById('gh-test-result').innerHTML = result.ok
            ? `<div style="color:var(--success);padding:12px;background:rgba(46,213,115,0.1);border-radius:8px">✅ Conexión exitosa! Usuario: ${result.user} | Repo: ${result.repo}</div>`
            : `<div style="color:var(--danger);padding:12px;background:rgba(255,71,87,0.1);border-radius:8px">❌ ${result.error}</div>`;
    }

    function disconnectGitHub() {
        if (!confirm('¿Desconectar de GitHub? Los datos seguirán en localStorage.')) return;
        Store.stopGitHubSync();
        GitHubAPI.removeGitHubConfig();
        closeModal();
        updateGitHubStatusBar();
        toast('Desconectado de GitHub', 'info');
    }

    function showAddPlayerModal() {
        showModal(`
            <div class="modal-title">➕ Nuevo Miembro del Equipo</div>
            <div class="form-group">
                <label>Nombre completo:</label>
                <input type="text" id="new-player-name" placeholder="Ej: Juan Pérez">
            </div>
            <div class="form-group">
                <label>Elige tu avatar:</label>
                <div id="avatar-picker" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;">
                    ${Store.AVATARS.map(a => `<span class="vote-option" onclick="App.pickAvatar(this,'${a}')" style="font-size:2rem;padding:8px 12px;cursor:pointer">${a}</span>`).join('')}
                </div>
                <input type="hidden" id="new-player-avatar" value="🦸‍♀️">
            </div>
            <button class="btn btn-primary" onclick="App.addNewPlayer()">Crear Personaje</button>
        `);
    }

    function pickAvatar(el, avatar) {
        document.querySelectorAll('#avatar-picker .vote-option').forEach(e => e.classList.remove('selected'));
        el.classList.add('selected');
        document.getElementById('new-player-avatar').value = avatar;
    }

    function addNewPlayer() {
        const name = document.getElementById('new-player-name').value.trim();
        const avatar = document.getElementById('new-player-avatar').value;
        if (!name) return toast('Ingresa un nombre', 'warning');
        Store.addJugador({ nombre: name, avatar });
        closeModal();
        populateLoginSelect();
        toast(`¡${name} se unió al equipo!`, 'success');
    }

    function updateSidebarInfo() {
        if (!currentPlayer) return;
        const j = Store.getJugador(currentPlayer.id);
        document.getElementById('sidebar-player-info').innerHTML = `
            <span style="font-size:1.5rem">${j.avatar}</span>
            <div>
                <div style="font-weight:700;font-size:0.85rem">${j.nombre.split(' ')[0]}</div>
                <div style="font-size:0.7rem;color:var(--accent)">Nv.${j.nivel} | ${j.pts}pts</div>
            </div>
        `;
    }

    // ===== NAVIGATION =====
    function showScreen(screenId) {
        if (screenId === 'config' && !currentPlayer) {
            // Allow config from login
        }
        currentScreen = screenId;
        document.querySelectorAll('.screen-content').forEach(s => s.classList.add('hidden'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const screen = document.getElementById(`screen-${screenId}`);
        if (screen) {
            screen.classList.remove('hidden');
            screen.classList.add('fade-in');
        }
        const navBtn = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
        if (navBtn) navBtn.classList.add('active');

        const renderers = {
            dashboard: renderDashboard,
            misiones: renderMisiones,
            verificar: renderVerificar,
            poderes: renderPoderes,
            votos: renderVotos,
            rankings: renderRankings,
            proyectos: renderProyectos,
            perfil: renderPerfil,
            config: renderConfig
        };
        if (renderers[screenId]) renderers[screenId]();
        updateSidebarInfo();
    }

    // ===== DASHBOARD =====
    function renderDashboard() {
        const config = Store.getConfig();
        const jugadores = Store.getJugadores();
        const semana = Store.getSemanaActual();
        const maxPts = Math.max(...jugadores.map(j => j.pts), 1);

        const el = document.getElementById('screen-dashboard');
        el.innerHTML = `
            <div class="screen-title">🏠 Dashboard</div>
            <div class="week-bar">
                <div class="week-number">📅 Semana ${config.semana_actual}</div>
                <div class="week-dates">${semana ? `${semana.fecha_inicio} → ${semana.fecha_fin}` : 'Sin fecha'}</div>
                <div>${config.nombre_equipo}</div>
            </div>

            <div class="card">
                <div class="card-title">🪜 La Escalera del Éxito</div>
                <div class="ladder-container" id="ladder-view">
                    ${jugadores.map((j, i) => {
                        const height = maxPts > 0 ? Math.max(20, (j.pts / maxPts) * 300) : 20;
                        return `
                        <div class="ladder-player">
                            <div class="ladder-avatar">${j.avatar}</div>
                            <div class="ladder-bar-container" style="height:320px">
                                <div class="ladder-bar" style="height:${height}px"></div>
                            </div>
                            <div class="ladder-name">${j.nombre.split(' ')[0]}</div>
                            <div class="ladder-pts">⭐ ${j.pts} pts</div>
                            <div class="ladder-level">Nv. ${j.nivel}</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>

            <div class="card-grid">
                <div class="card">
                    <div class="card-title">📊 Resumen Semanal</div>
                    ${semana && semana.verificada ? `
                        <div style="margin-top:10px">
                            ${jugadores.map(j => {
                                const meta = semana.metas[j.id];
                                const avance = meta ? meta.avance_general : 0;
                                const barColor = avance >= 100 ? 'var(--success)' : avance >= 50 ? 'var(--warning)' : 'var(--danger)';
                                return `
                                <div style="margin-bottom:12px">
                                    <div class="flex-between" style="margin-bottom:4px">
                                        <span>${j.avatar} ${j.nombre.split(' ')[0]}</span>
                                        <span style="font-weight:700;color:${barColor}">${avance}%</span>
                                    </div>
                                    <div class="progress-bar-container">
                                        <div class="progress-bar" style="width:${avance}%;background:${barColor}"></div>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                    ` : `
                        <div class="empty-state">
                            <div class="empty-state-icon">📋</div>
                            <div class="empty-state-text">Semana ${config.semana_actual} aún no verificada</div>
                        </div>
                    `}
                </div>

                <div class="card">
                    <div class="card-title">🏅 Campeones Recientes</div>
                    ${(() => {
                        const ranking = Store.getRanking('total');
                        const medallas = ['🥇','🥈','🥉'];
                        return ranking.slice(0,3).map((j, i) => `
                            <div style="display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid var(--border)">
                                <span style="font-size:1.5rem">${medallas[i]}</span>
                                <span style="font-size:1.5rem">${j.avatar}</span>
                                <div style="flex:1">
                                    <div style="font-weight:700">${j.nombre}</div>
                                    <div style="font-size:0.8rem;color:var(--text-muted)">Nivel ${j.nivel} | ${j.badges.length} badges</div>
                                </div>
                                <div style="font-family:var(--font-title);color:var(--gold)">${j.pts} pts</div>
                            </div>
                        `).join('');
                    })()}
                </div>
            </div>

            <div class="card">
                <div class="card-title">💬 Menciones Positivas Recientes</div>
                ${(() => {
                    const menciones = Store.getData().menciones.slice(-5).reverse();
                    if (menciones.length === 0) return '<div class="text-muted text-center mt-10">No hay menciones aún. ¡Sé el primero!</div>';
                    return menciones.map(m => {
                        const para = Store.getJugador(m.para);
                        return `<div class="mention-card">"${sanitize(m.texto)}" <div class="mention-from">Para ${para ? para.avatar + ' ' + para.nombre : 'Desconocido'} — Semana ${m.semana}</div></div>`;
                    }).join('');
                })()}
            </div>
        `;
    }

    // ===== MISIONES =====
    function renderMisiones() {
        const config = Store.getConfig();
        const jugadores = Store.getJugadores();
        const semana = Store.getSemanaActual();
        const el = document.getElementById('screen-misiones');

        el.innerHTML = `
            <div class="screen-title">🎯 Misiones Semanales — Semana ${config.semana_actual}</div>
            <p class="text-muted mb-20">Cada miembro define sus metas de la semana: proyectos a avanzar y casos a resolver.</p>

            <div id="misiones-list">
                ${jugadores.map(j => {
                    const meta = semana?.metas[j.id] || { proyectos: [], casos_meta: 0 };
                    return `
                    <div class="mission-card mb-20">
                        <div class="mission-player-header">
                            <span class="mission-player-avatar">${j.avatar}</span>
                            <span class="mission-player-name">${j.nombre}</span>
                            <span class="badge badge-special">Nv.${j.nivel}</span>
                        </div>
                        <div class="form-group">
                            <label>🎯 Metas de Proyecto (una por línea):</label>
                            <textarea id="meta-proy-${j.id}" placeholder="Ej: Terminar módulo de reportes&#10;Revisar diseño de base de datos">${sanitize((meta.proyectos || []).join('\n'))}</textarea>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>📋 Meta de casos a resolver:</label>
                                <input type="number" id="meta-casos-${j.id}" value="${meta.casos_meta || 0}" min="0" max="100">
                            </div>
                        </div>
                        <button class="btn btn-accent btn-sm" onclick="App.guardarMeta('${j.id}')">💾 Guardar Meta</button>
                    </div>`;
                }).join('')}
            </div>
        `;
    }

    function guardarMeta(jugadorId) {
        const config = Store.getConfig();
        const proyText = document.getElementById(`meta-proy-${jugadorId}`).value;
        const casosMeta = parseInt(document.getElementById(`meta-casos-${jugadorId}`).value) || 0;
        const proyectos = proyText.split('\n').map(p => p.trim()).filter(p => p.length > 0);

        Store.updateMeta(config.semana_actual, jugadorId, {
            proyectos,
            casos_meta: casosMeta
        });
        const j = Store.getJugador(jugadorId);
        toast(`Meta guardada para ${j.nombre}`, 'success');
    }

    // ===== VERIFICAR CUMPLIMIENTO =====
    function renderVerificar() {
        const config = Store.getConfig();
        const jugadores = Store.getJugadores();
        const semana = Store.getSemanaActual();
        const el = document.getElementById('screen-verificar');

        if (!semana) {
            el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><div>No hay semana activa</div></div>';
            return;
        }

        el.innerHTML = `
            <div class="screen-title">✅ Verificar Cumplimiento — Semana ${config.semana_actual}</div>
            <p class="text-muted mb-20">El líder verifica el avance de cada miembro y asigna puntajes.</p>

            ${semana.verificada ? '<div class="card" style="background:rgba(46,213,115,0.1);border-color:var(--success)"><div class="text-center">✅ Esta semana ya fue verificada</div></div>' : ''}

            ${jugadores.map(j => {
                const meta = semana.metas[j.id] || { proyectos: [], casos_meta: 0, casos_cumplidos: 0, avance_general: 0 };
                return `
                <div class="mission-card mb-20">
                    <div class="mission-player-header">
                        <span class="mission-player-avatar">${j.avatar}</span>
                        <span class="mission-player-name">${j.nombre}</span>
                        ${meta.cumplida ? '<span class="badge badge-gold">✅ Cumplida</span>' : ''}
                    </div>

                    <div style="margin-bottom:12px">
                        <strong>Metas de proyecto:</strong>
                        ${(meta.proyectos || []).length > 0
                            ? `<ul style="margin:8px 0;padding-left:20px">${meta.proyectos.map(p => `<li>${sanitize(p)}</li>`).join('')}</ul>`
                            : '<div class="text-muted">Sin metas definidas</div>'
                        }
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>📊 Avance General (%):</label>
                            <input type="number" id="avance-${j.id}" value="${meta.avance_general}" min="0" max="100" ${semana.verificada ? 'disabled' : ''}>
                        </div>
                        <div class="form-group">
                            <label>📋 Casos cumplidos (de ${meta.casos_meta}):</label>
                            <input type="number" id="casos-cumpl-${j.id}" value="${meta.casos_cumplidos}" min="0" max="${meta.casos_meta || 100}" ${semana.verificada ? 'disabled' : ''}>
                        </div>
                    </div>

                    ${!semana.verificada ? `<button class="btn btn-accent btn-sm" onclick="App.guardarAvance('${j.id}')">💾 Guardar Avance</button>` : ''}

                    ${meta.puntos_ganados ? `<div class="mt-10" style="font-family:var(--font-title);color:var(--gold)">+${meta.puntos_ganados} pts ganados</div>` : ''}
                </div>`;
            }).join('')}

            ${!semana.verificada ? `
                <div class="text-center mt-20">
                    <button class="btn btn-primary btn-lg" onclick="App.verificarSemana()">🏁 Verificar y Asignar Puntos</button>
                </div>
            ` : `
                <div class="text-center mt-20">
                    <button class="btn btn-secondary" onclick="App.nuevaSemana()">➡️ Avanzar a Siguiente Semana</button>
                </div>
            `}
        `;
    }

    function guardarAvance(jugadorId) {
        const config = Store.getConfig();
        const avance = parseInt(document.getElementById(`avance-${jugadorId}`).value) || 0;
        const casosCumpl = parseInt(document.getElementById(`casos-cumpl-${jugadorId}`).value) || 0;
        Store.updateMeta(config.semana_actual, jugadorId, {
            avance_general: Math.min(100, Math.max(0, avance)),
            casos_cumplidos: casosCumpl
        });
        toast('Avance guardado', 'success');
    }

    function verificarSemana() {
        const config = Store.getConfig();
        const jugadores = Store.getJugadores();

        // Save all avances first
        jugadores.forEach(j => {
            const avanceEl = document.getElementById(`avance-${j.id}`);
            const casosEl = document.getElementById(`casos-cumpl-${j.id}`);
            if (avanceEl && casosEl) {
                Store.updateMeta(config.semana_actual, j.id, {
                    avance_general: Math.min(100, Math.max(0, parseInt(avanceEl.value) || 0)),
                    casos_cumplidos: parseInt(casosEl.value) || 0
                });
            }
        });

        Store.verificarSemana(config.semana_actual);

        // Check for 100% achievers
        const semana = Store.getSemana(config.semana_actual);
        const heroes = jugadores.filter(j => semana.metas[j.id]?.avance_general >= 100);
        if (heroes.length > 0) {
            launchConfetti();
            toast(`🎉 ¡${heroes.map(h => h.nombre.split(' ')[0]).join(', ')} completaron al 100%!`, 'success');
        }

        // Award prize to top scorer
        const ranking = Store.getRanking('semanal');
        if (ranking.length > 0 && ranking[0]._pts_periodo > 0) {
            const premios = Store.getConfig().premios;
            const premioRandom = premios[Math.floor(Math.random() * premios.length)];
            toast(`🏆 ${ranking[0].nombre} gana: ${premioRandom.icono} ${premioRandom.nombre}!`, 'info');
        }

        renderVerificar();
    }

    function nuevaSemana() {
        const nueva = Store.avanzarSemana();
        toast(`¡Semana ${nueva} iniciada!`, 'success');
        showScreen('dashboard');
    }

    // ===== PODERES =====
    function renderPoderes() {
        const config = Store.getConfig();
        const semana = Store.getSemanaActual();
        const el = document.getElementById('screen-poderes');

        el.innerHTML = `
            <div class="screen-title">⚡ Poderes Especiales</div>
            <p class="text-muted mb-20">Activa un poder y el juego asignará ayuda aleatoriamente.</p>

            <div class="card-grid">
                ${config.poderes.map(p => `
                    <div class="power-card" onclick="App.usarPoder(${p.id})">
                        <div class="power-icon">${p.icono}</div>
                        <div class="power-name">${p.nombre}</div>
                        <div class="power-desc">${p.desc}</div>
                    </div>
                `).join('')}
            </div>

            <div class="card mt-20">
                <div class="card-title">📜 Poderes Activados esta Semana</div>
                ${semana && semana.poderes_activados.length > 0 ? `
                    <div>
                        ${semana.poderes_activados.map(pa => {
                            const poder = config.poderes.find(p => p.id === pa.poder_id);
                            const jugador = Store.getJugador(pa.jugador_id);
                            const helper = Store.getJugador(pa.helper_id);
                            return `
                            <div class="mission-item">
                                <span>${poder?.icono || '⚡'}</span>
                                <span><strong>${jugador?.nombre || '?'}</strong> activó <em>${poder?.nombre || '?'}</em></span>
                                ${helper ? `<span>→ Ayuda de <strong>${helper.avatar} ${helper.nombre.split(' ')[0]}</strong></span>` : ''}
                            </div>`;
                        }).join('')}
                    </div>
                ` : '<div class="text-muted text-center mt-10">Nadie ha activado poderes aún</div>'}
            </div>

            <div class="card mt-20">
                <div class="card-title">🏅 Premios Disponibles</div>
                <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px">
                    ${config.premios.map(p => `
                        <div class="badge badge-gold" style="padding:8px 14px;font-size:0.9rem">${p.icono} ${p.nombre}</div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    function usarPoder(poderId) {
        if (!currentPlayer) return;
        const config = Store.getConfig();
        const poder = config.poderes.find(p => p.id === poderId);
        const result = Store.activarPoder(config.semana_actual, poderId, currentPlayer.id);
        const helper = Store.getJugador(result.helper_id);

        showModal(`
            <div class="power-reveal">
                <div class="power-reveal-icon">${poder.icono}</div>
                <div class="power-reveal-text">¡${poder.nombre} Activado!</div>
                ${helper ? `
                    <div style="margin-top:20px;font-size:1rem;color:var(--text-muted)">Tu compañero asignado es:</div>
                    <div class="power-reveal-target">${helper.avatar} ${helper.nombre}</div>
                ` : ''}
                <button class="btn btn-primary mt-20" onclick="App.closeModal()">¡Genial! 🎉</button>
            </div>
        `);
        launchConfetti();
        renderPoderes();
    }

    // ===== VOTOS =====
    let currentVotos = {};

    function renderVotos() {
        const config = Store.getConfig();
        const jugadores = Store.getJugadores();
        const semana = Store.getSemanaActual();
        const el = document.getElementById('screen-votos');

        const votosExistentes = semana?.votos[currentPlayer?.id] || {};
        currentVotos = { ...votosExistentes };

        el.innerHTML = `
            <div class="screen-title">🗳️ Votaciones Anónimas — Semana ${config.semana_actual}</div>
            <p class="text-muted mb-20">Vota por tus compañeros en cada categoría. ¡Las votaciones son anónimas!</p>

            ${config.categorias_voto.map(cat => `
                <div class="vote-category">
                    <div class="vote-category-title">${cat.icono} ${cat.nombre} <span class="badge badge-special">${cat.tipo}</span></div>
                    <div class="vote-options">
                        ${jugadores.filter(j => j.id !== currentPlayer?.id).map(j => `
                            <div class="vote-option ${currentVotos[cat.id] === j.id ? 'selected' : ''}"
                                 onclick="App.selectVoto(${cat.id}, '${j.id}', this)">
                                <span style="font-size:1.3rem">${j.avatar}</span>
                                <span>${j.nombre.split(' ')[0]}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}

            <div class="text-center mt-20" style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
                <button class="btn btn-primary btn-lg" onclick="App.submitVotos()">🗳️ Enviar Votos</button>
                <button class="btn btn-secondary" onclick="App.verResultadosVotos()">📊 Ver Resultados</button>
            </div>

            <div class="card mt-20">
                <div class="card-title">💬 Enviar Mención Positiva Anónima</div>
                <div class="form-group">
                    <label>¿Para quién?</label>
                    <select id="mencion-para">
                        ${jugadores.map(j => `<option value="${j.id}">${j.avatar} ${j.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Tu mensaje (anónimo):</label>
                    <textarea id="mencion-texto" placeholder="Ej: ¡Gracias por ayudarme con el caso! Eres genial 💪"></textarea>
                </div>
                <button class="btn btn-accent" onclick="App.enviarMencion()">✉️ Enviar Mención</button>
            </div>
        `;
    }

    function selectVoto(categoriaId, jugadorId, el) {
        currentVotos[categoriaId] = jugadorId;
        const parent = el.closest('.vote-options');
        parent.querySelectorAll('.vote-option').forEach(o => o.classList.remove('selected'));
        el.classList.add('selected');
    }

    function submitVotos() {
        if (!currentPlayer) return;
        const config = Store.getConfig();
        Object.entries(currentVotos).forEach(([catId, votadoId]) => {
            Store.submitVoto(config.semana_actual, currentPlayer.id, parseInt(catId), votadoId);
        });
        toast('¡Votos enviados! Son anónimos 🤫', 'success');
    }

    function verResultadosVotos() {
        const config = Store.getConfig();
        const resultados = Store.getVotosResultados(config.semana_actual);
        const jugadores = Store.getJugadores();

        let html = '<div class="modal-title">📊 Resultados de Votación — Semana ' + config.semana_actual + '</div>';
        config.categorias_voto.forEach(cat => {
            const votos = resultados[cat.id] || {};
            const sorted = Object.entries(votos).sort((a, b) => b[1] - a[1]);
            const ganador = sorted[0];
            const ganadorJ = ganador ? Store.getJugador(ganador[0]) : null;

            html += `
                <div style="margin-bottom:16px;padding:12px;background:var(--bg-dark);border-radius:10px">
                    <div style="font-weight:700;margin-bottom:8px">${cat.icono} ${cat.nombre}</div>
                    ${sorted.map(([jId, count]) => {
                        const j = Store.getJugador(jId);
                        if (!j) return '';
                        return `<div style="display:flex;align-items:center;gap:8px;margin:4px 0">
                            <span>${j.avatar}</span>
                            <span style="flex:1">${j.nombre.split(' ')[0]}</span>
                            <span style="font-weight:700;color:var(--gold)">${count} votos</span>
                        </div>`;
                    }).join('')}
                </div>`;
        });
        showModal(html + '<button class="btn btn-primary mt-10" onclick="App.closeModal()">Cerrar</button>');
    }

    function enviarMencion() {
        const para = document.getElementById('mencion-para').value;
        const texto = document.getElementById('mencion-texto').value.trim();
        if (!texto) return toast('Escribe un mensaje', 'warning');
        if (texto.length > 500) return toast('Mensaje muy largo (máx 500 chars)', 'warning');
        Store.addMencion({ para, texto });
        document.getElementById('mencion-texto').value = '';
        toast('¡Mención enviada! Es anónima 😊', 'success');
    }

    // ===== RANKINGS =====
    let rankingTab = 'semanal';

    function renderRankings() {
        const el = document.getElementById('screen-rankings');
        el.innerHTML = `
            <div class="screen-title">🏆 Rankings</div>
            <div class="tabs">
                <button class="tab ${rankingTab === 'semanal' ? 'active' : ''}" onclick="App.changeRankingTab('semanal')">Semanal</button>
                <button class="tab ${rankingTab === 'mensual' ? 'active' : ''}" onclick="App.changeRankingTab('mensual')">Mensual</button>
                <button class="tab ${rankingTab === 'trimestral' ? 'active' : ''}" onclick="App.changeRankingTab('trimestral')">Trimestral</button>
                <button class="tab ${rankingTab === 'total' ? 'active' : ''}" onclick="App.changeRankingTab('total')">Total</button>
            </div>
            <div id="ranking-table"></div>
        `;
        renderRankingTable();
    }

    function changeRankingTab(tab) {
        rankingTab = tab;
        document.querySelectorAll('#screen-rankings .tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`#screen-rankings .tab:nth-child(${['semanal','mensual','trimestral','total'].indexOf(tab) + 1})`).classList.add('active');
        renderRankingTable();
    }

    function renderRankingTable() {
        const ranking = Store.getRanking(rankingTab);
        const medallas = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣'];
        const titulosPeriodo = { semanal: 'Esta Semana', mensual: 'Este Mes', trimestral: 'Este Trimestre', total: 'Acumulado Total' };

        document.getElementById('ranking-table').innerHTML = `
            <div class="card">
                <div class="card-title">🏅 ${titulosPeriodo[rankingTab]}</div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Jugador</th>
                                <th>Nivel</th>
                                <th>Pts Período</th>
                                <th>Pts Total</th>
                                <th>Badges</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${ranking.map((j, i) => `
                                <tr class="${i < 3 ? 'rank-' + (i+1) : ''}" style="cursor:pointer" onclick="App.verPerfilJugador('${j.id}')">
                                    <td style="font-size:1.3rem">${medallas[i] || (i+1)}</td>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:10px">
                                            <span style="font-size:1.5rem">${j.avatar}</span>
                                            <span style="font-weight:700">${j.nombre}</span>
                                        </div>
                                    </td>
                                    <td><span class="badge badge-special">Nv.${j.nivel}</span></td>
                                    <td style="font-weight:800;color:var(--gold)">${j._pts_periodo}</td>
                                    <td>${j.pts}</td>
                                    <td>
                                        <div class="badges-row">
                                            ${j.badges.slice(0, 4).map(bId => {
                                                const bd = Store.getConfig().badges_definiciones.find(b => b.id === bId);
                                                return bd ? `<span title="${bd.nombre}">${bd.icono}</span>` : '';
                                            }).join('')}
                                            ${j.badges.length > 4 ? `<span class="text-muted">+${j.badges.length - 4}</span>` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // ===== PROYECTOS =====
    function renderProyectos() {
        const proyectos = Store.getProyectos();
        const jugadores = Store.getJugadores();
        const el = document.getElementById('screen-proyectos');

        el.innerHTML = `
            <div class="screen-title">📊 Seguimiento de Proyectos</div>
            <button class="btn btn-primary mb-20" onclick="App.mostrarFormProyecto()">➕ Nuevo Proyecto</button>

            ${proyectos.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-state-icon">📁</div>
                    <div class="empty-state-text">No hay proyectos registrados</div>
                </div>
            ` : ''}

            ${proyectos.map(p => {
                const estadoClass = p.estado === 'activo' ? 'estado-activo' : p.estado === 'completado' ? 'estado-completado' : 'estado-pausado';
                return `
                <div class="proyecto-card">
                    <div class="proyecto-header">
                        <div>
                            <div class="proyecto-nombre">${sanitize(p.nombre)}</div>
                            <div class="text-muted" style="font-size:0.85rem;margin-top:4px">${sanitize(p.descripcion || '')}</div>
                        </div>
                        <div style="display:flex;gap:8px;align-items:center">
                            <span class="proyecto-estado ${estadoClass}">${p.estado.toUpperCase()}</span>
                        </div>
                    </div>

                    <div class="flex-between mb-10">
                        <span class="text-muted">Avance: ${p.avance}%</span>
                        <span class="text-muted">Inicio: ${p.fecha_inicio}</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width:${p.avance}%"></div>
                    </div>

                    <div style="margin-top:12px">
                        <strong>Responsables:</strong>
                        ${(p.responsables || []).map(rId => {
                            const j = Store.getJugador(rId);
                            return j ? `<span class="badge">${j.avatar} ${j.nombre.split(' ')[0]}</span>` : '';
                        }).join(' ')}
                    </div>

                    ${(p.entregables || []).length > 0 ? `
                        <div style="margin-top:12px">
                            <strong>Entregables:</strong>
                            ${p.entregables.map((ent, ei) => `
                                <div class="entregable-item">
                                    <input type="checkbox" ${ent.completado ? 'checked' : ''} onchange="App.toggleEntregable('${p.id}', ${ei}, this.checked)">
                                    <span style="${ent.completado ? 'text-decoration:line-through;opacity:0.6' : ''}">${sanitize(ent.nombre)}</span>
                                    ${ent.fecha_estimada ? `<span class="text-muted" style="margin-left:auto;font-size:0.8rem">${ent.fecha_estimada}</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}

                    <div style="margin-top:15px;display:flex;gap:8px;flex-wrap:wrap">
                        <button class="btn btn-accent btn-xs" onclick="App.registrarAvanceProyecto('${p.id}')">📝 Registrar Avance</button>
                        <button class="btn btn-ghost btn-xs" onclick="App.verHistorialProyecto('${p.id}')">📜 Historial</button>
                        <button class="btn btn-ghost btn-xs" onclick="App.agregarEntregable('${p.id}')">➕ Entregable</button>
                        ${p.estado === 'activo' ? `<button class="btn btn-ghost btn-xs" onclick="App.cambiarEstadoProyecto('${p.id}', 'pausado')">⏸️ Pausar</button>` : ''}
                        ${p.estado === 'pausado' ? `<button class="btn btn-ghost btn-xs" onclick="App.cambiarEstadoProyecto('${p.id}', 'activo')">▶️ Reactivar</button>` : ''}
                    </div>
                </div>`;
            }).join('')}
        `;
    }

    function mostrarFormProyecto() {
        const jugadores = Store.getJugadores();
        showModal(`
            <div class="modal-title">➕ Nuevo Proyecto</div>
            <div class="form-group">
                <label>Nombre del proyecto:</label>
                <input type="text" id="proy-nombre" placeholder="Ej: Migración Base de Datos">
            </div>
            <div class="form-group">
                <label>Descripción:</label>
                <textarea id="proy-desc" placeholder="Breve descripción del proyecto..."></textarea>
            </div>
            <div class="form-group">
                <label>Fecha estimada de entrega:</label>
                <input type="date" id="proy-fecha">
            </div>
            <div class="form-group">
                <label>Responsables:</label>
                <div id="proy-responsables" style="display:flex;flex-wrap:wrap;gap:8px">
                    ${jugadores.map(j => `
                        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:6px 12px;background:var(--bg-dark);border-radius:8px;border:1px solid var(--border)">
                            <input type="checkbox" value="${j.id}" class="proy-resp-check">
                            ${j.avatar} ${j.nombre.split(' ')[0]}
                        </label>
                    `).join('')}
                </div>
            </div>
            <div class="form-group">
                <label>Entregables (uno por línea):</label>
                <textarea id="proy-entregables" placeholder="Ej: Diseño de esquema&#10;Migración de datos&#10;Pruebas"></textarea>
            </div>
            <button class="btn btn-primary" onclick="App.crearProyecto()">Crear Proyecto</button>
        `);
    }

    function crearProyecto() {
        const nombre = document.getElementById('proy-nombre').value.trim();
        if (!nombre) return toast('Ingresa un nombre', 'warning');
        const desc = document.getElementById('proy-desc').value.trim();
        const fecha = document.getElementById('proy-fecha').value;
        const responsables = [...document.querySelectorAll('.proy-resp-check:checked')].map(c => c.value);
        const entregablesText = document.getElementById('proy-entregables').value;
        const entregables = entregablesText.split('\n').filter(e => e.trim()).map(e => ({
            nombre: e.trim(), completado: false, fecha_estimada: ''
        }));

        Store.addProyecto({ nombre, descripcion: desc, fecha_estimada: fecha, responsables, entregables });
        closeModal();
        renderProyectos();
        toast('Proyecto creado', 'success');
    }

    function registrarAvanceProyecto(proyId) {
        showModal(`
            <div class="modal-title">📝 Registrar Avance</div>
            <div class="form-group">
                <label>Porcentaje de avance:</label>
                <input type="number" id="reg-avance" min="0" max="100" placeholder="Ej: 60">
            </div>
            <div class="form-group">
                <label>Notas / Comentarios:</label>
                <textarea id="reg-nota" placeholder="¿Qué se avanzó esta semana?"></textarea>
            </div>
            <button class="btn btn-primary" onclick="App.guardarAvanceProyecto('${proyId}')">Guardar</button>
        `);
    }

    function guardarAvanceProyecto(proyId) {
        const avance = parseInt(document.getElementById('reg-avance').value) || 0;
        const nota = document.getElementById('reg-nota').value.trim();
        Store.addRegistroProyecto(proyId, {
            avance: Math.min(100, Math.max(0, avance)),
            nota,
            autor: currentPlayer?.id
        });
        closeModal();
        renderProyectos();
        if (avance >= 100) {
            launchConfetti();
            toast('🎉 ¡Proyecto completado! +20pts para los responsables', 'success');
        } else {
            toast('Avance registrado', 'success');
        }
    }

    function verHistorialProyecto(proyId) {
        const proy = Store.getProyectos().find(p => p.id === proyId);
        if (!proy) return;
        showModal(`
            <div class="modal-title">📜 Historial: ${sanitize(proy.nombre)}</div>
            ${(proy.registros || []).length === 0 ? '<div class="text-muted">Sin registros aún</div>' : ''}
            ${(proy.registros || []).reverse().map(r => {
                const autor = Store.getJugador(r.autor);
                return `
                <div style="padding:12px;background:var(--bg-dark);border-radius:10px;margin-bottom:8px">
                    <div class="flex-between">
                        <span>Sem. ${r.semana} | ${r.fecha}</span>
                        <span class="badge badge-special">${r.avance}%</span>
                    </div>
                    <div style="margin-top:6px">${sanitize(r.nota || 'Sin notas')}</div>
                    <div class="text-muted" style="font-size:0.8rem;margin-top:4px">Por: ${autor ? autor.avatar + ' ' + autor.nombre.split(' ')[0] : 'Desconocido'}</div>
                </div>`;
            }).join('')}
            <button class="btn btn-primary mt-10" onclick="App.closeModal()">Cerrar</button>
        `);
    }

    function toggleEntregable(proyId, index, checked) {
        const proy = Store.getProyectos().find(p => p.id === proyId);
        if (!proy || !proy.entregables[index]) return;
        proy.entregables[index].completado = checked;
        Store.updateProyecto(proyId, { entregables: proy.entregables });
    }

    function agregarEntregable(proyId) {
        showModal(`
            <div class="modal-title">➕ Nuevo Entregable</div>
            <div class="form-group">
                <label>Nombre del entregable:</label>
                <input type="text" id="ent-nombre" placeholder="Ej: Diseño de la BD">
            </div>
            <div class="form-group">
                <label>Fecha estimada:</label>
                <input type="date" id="ent-fecha">
            </div>
            <button class="btn btn-primary" onclick="App.guardarEntregable('${proyId}')">Agregar</button>
        `);
    }

    function guardarEntregable(proyId) {
        const nombre = document.getElementById('ent-nombre').value.trim();
        if (!nombre) return toast('Ingresa un nombre', 'warning');
        const fecha = document.getElementById('ent-fecha').value;
        const proy = Store.getProyectos().find(p => p.id === proyId);
        if (!proy) return;
        const entregables = [...(proy.entregables || []), { nombre, completado: false, fecha_estimada: fecha }];
        Store.updateProyecto(proyId, { entregables });
        closeModal();
        renderProyectos();
        toast('Entregable agregado', 'success');
    }

    function cambiarEstadoProyecto(proyId, estado) {
        Store.updateProyecto(proyId, { estado });
        renderProyectos();
        toast(`Proyecto ${estado}`, 'info');
    }

    // ===== PERFIL =====
    function renderPerfil(playerId) {
        const id = playerId || currentPlayer?.id;
        if (!id) return;
        const j = Store.getJugador(id);
        if (!j) return;
        const config = Store.getConfig();
        const xpParaNivel = j.nivel * 100;
        const xpPct = Math.min(100, (j.xp / xpParaNivel) * 100);
        const menciones = Store.getMenciones(id);
        const el = document.getElementById('screen-perfil');

        el.innerHTML = `
            <div class="screen-title">👤 Perfil de Jugador</div>
            <div class="card">
                <div class="profile-card">
                    <div class="profile-avatar" style="border-color:${j.color}">${j.avatar}</div>
                    <div class="profile-info">
                        <div class="profile-name">${j.nombre}</div>
                        <div class="profile-level">⭐ Nivel ${j.nivel}</div>
                        <div style="display:flex;align-items:center;gap:8px;margin:8px 0">
                            <div class="xp-bar-container" style="flex:1">
                                <div class="xp-bar" style="width:${xpPct}%"></div>
                            </div>
                            <span class="text-muted" style="font-size:0.8rem">${j.xp}/${xpParaNivel} XP</span>
                        </div>
                        <div style="font-family:var(--font-title);font-size:1.5rem;color:var(--gold)">${j.pts} puntos totales</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">📊 Estadísticas</div>
                <div class="stats-grid">
                    <div class="stat-card"><div class="stat-value">${j.stats.proyectos_completados}</div><div class="stat-label">Proyectos Completados</div></div>
                    <div class="stat-card"><div class="stat-value">${j.stats.casos_resueltos}</div><div class="stat-label">Casos Resueltos</div></div>
                    <div class="stat-card"><div class="stat-value">${j.stats.semanas_100}</div><div class="stat-label">Semanas al 100%</div></div>
                    <div class="stat-card"><div class="stat-value">${j.stats.racha_actual}</div><div class="stat-label">Racha Actual 🔥</div></div>
                    <div class="stat-card"><div class="stat-value">${j.stats.poderes_usados}</div><div class="stat-label">Poderes Usados</div></div>
                    <div class="stat-card"><div class="stat-value">${j.nivel}</div><div class="stat-label">Nivel</div></div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">🏅 Badges Obtenidos</div>
                ${j.badges.length === 0 ? '<div class="text-muted">Aún no tienes badges. ¡Sigue jugando!</div>' : ''}
                <div class="badges-row">
                    ${j.badges.map(bId => {
                        const bd = config.badges_definiciones.find(b => b.id === bId);
                        return bd ? `
                            <div class="badge badge-gold" style="padding:8px 14px;font-size:0.9rem" title="${bd.desc}">
                                ${bd.icono} ${bd.nombre}
                            </div>
                        ` : '';
                    }).join('')}
                </div>
                <div class="mt-20">
                    <div class="text-muted mb-10">Badges disponibles:</div>
                    <div class="badges-row">
                        ${config.badges_definiciones.filter(b => !j.badges.includes(b.id)).map(b => `
                            <div class="badge" style="padding:6px 12px;opacity:0.4" title="${b.desc}">
                                ${b.icono} ${b.nombre}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-title">💬 Menciones Recibidas</div>
                ${menciones.length === 0 ? '<div class="text-muted">No has recibido menciones aún</div>' : ''}
                ${menciones.slice(-10).reverse().map(m => `
                    <div class="mention-card">"${sanitize(m.texto)}" <div class="mention-from">Semana ${m.semana} — Anónimo</div></div>
                `).join('')}
            </div>

            <div class="card">
                <div class="card-title">🎨 Personalizar</div>
                <div class="form-group">
                    <label>Cambiar Avatar:</label>
                    <div style="display:flex;flex-wrap:wrap;gap:8px">
                        ${Store.AVATARS.map(a => `
                            <span style="font-size:2rem;cursor:pointer;padding:6px;border-radius:8px;${j.avatar === a ? 'background:var(--primary);' : ''}" onclick="App.cambiarAvatar('${id}', '${a}')">${a}</span>
                        `).join('')}
                    </div>
                </div>
                <div class="form-group">
                    <label>Cambiar Nombre:</label>
                    <div class="form-row">
                        <input type="text" id="edit-nombre" value="${sanitize(j.nombre)}">
                        <button class="btn btn-accent btn-sm" onclick="App.cambiarNombre('${id}')">Guardar</button>
                    </div>
                </div>
            </div>
        `;
    }

    function verPerfilJugador(id) {
        showScreen('perfil');
        renderPerfil(id);
    }

    function cambiarAvatar(id, avatar) {
        Store.updateJugador(id, { avatar });
        if (currentPlayer && currentPlayer.id === id) currentPlayer.avatar = avatar;
        renderPerfil(id);
        updateSidebarInfo();
        toast('Avatar actualizado', 'success');
    }

    function cambiarNombre(id) {
        const nombre = document.getElementById('edit-nombre').value.trim();
        if (!nombre) return toast('El nombre no puede estar vacío', 'warning');
        Store.updateJugador(id, { nombre });
        if (currentPlayer && currentPlayer.id === id) currentPlayer.nombre = nombre;
        renderPerfil(id);
        updateSidebarInfo();
        toast('Nombre actualizado', 'success');
    }

    // ===== CONFIG =====
    function renderConfig() {
        const config = Store.getConfig();
        const jugadores = Store.getJugadores();
        const el = document.getElementById('screen-config');

        el.innerHTML = `
            <div class="screen-title">⚙️ Configuración</div>

            <div class="card config-section">
                <div class="config-section-title">🏰 Equipo</div>
                <div class="form-group">
                    <label>Nombre del equipo:</label>
                    <div class="form-row">
                        <input type="text" id="cfg-team-name" value="${sanitize(config.nombre_equipo)}">
                        <button class="btn btn-accent btn-sm" onclick="App.guardarNombreEquipo()">Guardar</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>Semana actual: ${config.semana_actual}</label>
                </div>
            </div>

            <div class="card config-section">
                <div class="config-section-title">👥 Miembros del Equipo</div>
                <div class="editable-list">
                    ${jugadores.map(j => `
                        <div class="editable-item">
                            <span style="font-size:1.3rem">${j.avatar}</span>
                            <span style="flex:1;font-weight:700">${j.nombre}</span>
                            <span class="badge badge-special">Nv.${j.nivel} | ${j.pts}pts</span>
                            <button class="btn btn-danger btn-xs" onclick="App.eliminarJugador('${j.id}')">🗑️</button>
                        </div>
                    `).join('')}
                </div>
                <button class="btn btn-primary btn-sm mt-10" onclick="App.showAddPlayerModal()">➕ Agregar Miembro</button>
            </div>

            <div class="card config-section">
                <div class="config-section-title">🏅 Premios (editables)</div>
                <div id="premios-list" class="editable-list">
                    ${config.premios.map((p, i) => `
                        <div class="editable-item">
                            <input type="text" value="${sanitize(p.icono)}" style="width:50px;text-align:center" id="premio-icono-${i}">
                            <input type="text" value="${sanitize(p.nombre)}" id="premio-nombre-${i}">
                            <button class="btn btn-danger btn-xs" onclick="App.eliminarPremio(${i})">🗑️</button>
                        </div>
                    `).join('')}
                </div>
                <div class="form-row mt-10">
                    <input type="text" id="new-premio-icono" placeholder="🎁" style="width:60px">
                    <input type="text" id="new-premio-nombre" placeholder="Nuevo premio...">
                    <button class="btn btn-accent btn-sm" onclick="App.agregarPremio()">➕</button>
                </div>
                <button class="btn btn-primary btn-sm mt-10" onclick="App.guardarPremios()">💾 Guardar Premios</button>
            </div>

            <div class="card config-section">
                <div class="config-section-title">🗳️ Categorías de Votación</div>
                <div id="categorias-list" class="editable-list">
                    ${config.categorias_voto.map((c, i) => `
                        <div class="editable-item">
                            <input type="text" value="${sanitize(c.icono)}" style="width:50px;text-align:center" id="cat-icono-${i}">
                            <input type="text" value="${sanitize(c.nombre)}" id="cat-nombre-${i}">
                            <select id="cat-tipo-${i}" style="width:120px">
                                <option value="positivo" ${c.tipo === 'positivo' ? 'selected' : ''}>Positivo</option>
                                <option value="divertido" ${c.tipo === 'divertido' ? 'selected' : ''}>Divertido</option>
                            </select>
                            <button class="btn btn-danger btn-xs" onclick="App.eliminarCategoria(${i})">🗑️</button>
                        </div>
                    `).join('')}
                </div>
                <div class="form-row mt-10">
                    <input type="text" id="new-cat-icono" placeholder="🌟" style="width:60px">
                    <input type="text" id="new-cat-nombre" placeholder="Nueva categoría...">
                    <button class="btn btn-accent btn-sm" onclick="App.agregarCategoria()">➕</button>
                </div>
                <button class="btn btn-primary btn-sm mt-10" onclick="App.guardarCategorias()">💾 Guardar Categorías</button>
            </div>

            <div class="card config-section">
                <div class="config-section-title">⚡ Poderes</div>
                <div class="editable-list">
                    ${config.poderes.map((p, i) => `
                        <div class="editable-item">
                            <input type="text" value="${sanitize(p.icono)}" style="width:50px;text-align:center" id="poder-icono-${i}">
                            <input type="text" value="${sanitize(p.nombre)}" id="poder-nombre-${i}">
                            <input type="text" value="${sanitize(p.desc)}" id="poder-desc-${i}" style="flex:2">
                            <button class="btn btn-danger btn-xs" onclick="App.eliminarPoder(${i})">🗑️</button>
                        </div>
                    `).join('')}
                </div>
                <div class="form-row mt-10">
                    <input type="text" id="new-poder-icono" placeholder="⚡" style="width:60px">
                    <input type="text" id="new-poder-nombre" placeholder="Nuevo poder...">
                    <input type="text" id="new-poder-desc" placeholder="Descripción...">
                    <button class="btn btn-accent btn-sm" onclick="App.agregarPoder()">➕</button>
                </div>
                <button class="btn btn-primary btn-sm mt-10" onclick="App.guardarPoderes()">💾 Guardar Poderes</button>
            </div>

            <div class="card config-section">
                <div class="config-section-title">� Contraseña del Equipo</div>
                <p class="text-muted mb-10" style="font-size:0.85rem">Todos los miembros usan esta contraseña para entrar. Por defecto: <code>quest2026</code></p>
                <div class="form-row">
                    <input type="text" id="cfg-password" value="${sanitize(localStorage.getItem('quest_team_password') || TEAM_PASSWORD)}" placeholder="Contraseña del equipo">
                    <button class="btn btn-accent btn-sm" onclick="App.guardarPassword()">Guardar</button>
                </div>
            </div>

            <div class="card config-section">
                <div class="config-section-title">🔗 Conexión GitHub (datos en la nube)</div>
                ${GitHubAPI.isConfigured() ? (() => {
                    const cfg = GitHubAPI.getGitHubConfig();
                    return `
                        <div style="display:flex;align-items:center;gap:10px;margin-bottom:15px">
                            <span style="color:var(--success);font-size:1.3rem">🟢</span>
                            <span>Conectado a <strong>${cfg.owner}/${cfg.repo}</strong></span>
                        </div>
                        <div style="display:flex;gap:10px;flex-wrap:wrap">
                            <button class="btn btn-accent btn-sm" onclick="App.forceSyncGitHub()">🔄 Sincronizar Ahora</button>
                            <button class="btn btn-secondary btn-sm" onclick="App.showGitHubSetup()">⚙️ Modificar Conexión</button>
                            <button class="btn btn-ghost btn-sm" onclick="App.verCommitHistory()">📜 Ver Historial de Cambios</button>
                            <button class="btn btn-danger btn-sm" onclick="App.disconnectGitHub()">🔌 Desconectar</button>
                        </div>`;
                })() : `
                    <p class="text-muted mb-10" style="font-size:0.85rem">Conecta con GitHub para que todos los miembros compartan datos en tiempo real. 100% gratis.</p>
                    <button class="btn btn-primary" onclick="App.showGitHubSetup()">🔗 Configurar GitHub</button>
                `}
            </div>

            <div class="card config-section">
                <div class="config-section-title">💾 Datos</div>
                <div style="display:flex;gap:12px;flex-wrap:wrap">
                    <button class="btn btn-secondary" onclick="Store.exportData()">📥 Exportar Backup (JSON)</button>
                    <label class="btn btn-ghost" style="cursor:pointer">
                        📤 Importar Backup
                        <input type="file" accept=".json" style="display:none" onchange="App.handleImport(event)">
                    </label>
                    <button class="btn btn-danger" onclick="App.resetearDatos()">🗑️ Resetear Todo</button>
                </div>
            </div>
        `;
    }

    function guardarPassword() {
        const pwd = document.getElementById('cfg-password').value.trim();
        if (!pwd) return toast('La contraseña no puede estar vacía', 'warning');
        localStorage.setItem('quest_team_password', pwd);
        toast('Contraseña actualizada', 'success');
    }

    async function forceSyncGitHub() {
        toast('Sincronizando...', 'info');
        try {
            await Store.syncToGitHub('Sincronización manual');
            toast('✅ Datos sincronizados con GitHub', 'success');
        } catch (e) {
            toast('❌ Error: ' + e.message, 'error');
        }
    }

    async function verCommitHistory() {
        const commits = await GitHubAPI.getCommitHistory(15);
        showModal(`
            <div class="modal-title">📜 Historial de Cambios (GitHub)</div>
            ${commits.length === 0 ? '<div class="text-muted">Sin commits aún</div>' : ''}
            ${commits.map(c => `
                <div style="padding:10px;background:var(--bg-dark);border-radius:8px;margin-bottom:6px;font-size:0.85rem">
                    <div style="display:flex;justify-content:space-between">
                        <span style="color:var(--primary);font-weight:700">${sanitize(c.message)}</span>
                        <span class="text-muted">${c.sha}</span>
                    </div>
                    <div class="text-muted" style="font-size:0.8rem;margin-top:4px">${new Date(c.date).toLocaleString('es-CO')}</div>
                </div>
            `).join('')}
            <button class="btn btn-primary mt-10" onclick="App.closeModal()">Cerrar</button>
        `);
    }

    function guardarNombreEquipo() {
        const nombre = document.getElementById('cfg-team-name').value.trim();
        if (nombre) {
            Store.updateConfig({ nombre_equipo: nombre });
            toast('Nombre de equipo actualizado', 'success');
        }
    }

    function eliminarJugador(id) {
        if (!confirm('¿Seguro que quieres eliminar este jugador? Se perderán sus datos.')) return;
        Store.removeJugador(id);
        renderConfig();
        toast('Jugador eliminado', 'info');
    }

    function guardarPremios() {
        const config = Store.getConfig();
        config.premios.forEach((p, i) => {
            const iconoEl = document.getElementById(`premio-icono-${i}`);
            const nombreEl = document.getElementById(`premio-nombre-${i}`);
            if (iconoEl && nombreEl) {
                p.icono = iconoEl.value;
                p.nombre = nombreEl.value;
            }
        });
        Store.updateConfig({ premios: config.premios });
        toast('Premios guardados', 'success');
    }

    function agregarPremio() {
        const icono = document.getElementById('new-premio-icono').value || '🎁';
        const nombre = document.getElementById('new-premio-nombre').value.trim();
        if (!nombre) return toast('Ingresa un nombre', 'warning');
        const config = Store.getConfig();
        config.premios.push({ id: Date.now(), nombre, icono, desc: nombre });
        Store.updateConfig({ premios: config.premios });
        renderConfig();
        toast('Premio agregado', 'success');
    }

    function eliminarPremio(index) {
        const config = Store.getConfig();
        config.premios.splice(index, 1);
        Store.updateConfig({ premios: config.premios });
        renderConfig();
    }

    function guardarCategorias() {
        const config = Store.getConfig();
        config.categorias_voto.forEach((c, i) => {
            const iconoEl = document.getElementById(`cat-icono-${i}`);
            const nombreEl = document.getElementById(`cat-nombre-${i}`);
            const tipoEl = document.getElementById(`cat-tipo-${i}`);
            if (iconoEl && nombreEl && tipoEl) {
                c.icono = iconoEl.value;
                c.nombre = nombreEl.value;
                c.tipo = tipoEl.value;
            }
        });
        Store.updateConfig({ categorias_voto: config.categorias_voto });
        toast('Categorías guardadas', 'success');
    }

    function agregarCategoria() {
        const icono = document.getElementById('new-cat-icono').value || '🌟';
        const nombre = document.getElementById('new-cat-nombre').value.trim();
        if (!nombre) return toast('Ingresa un nombre', 'warning');
        const config = Store.getConfig();
        config.categorias_voto.push({ id: Date.now(), nombre, icono, tipo: 'positivo' });
        Store.updateConfig({ categorias_voto: config.categorias_voto });
        renderConfig();
        toast('Categoría agregada', 'success');
    }

    function eliminarCategoria(index) {
        const config = Store.getConfig();
        config.categorias_voto.splice(index, 1);
        Store.updateConfig({ categorias_voto: config.categorias_voto });
        renderConfig();
    }

    function guardarPoderes() {
        const config = Store.getConfig();
        config.poderes.forEach((p, i) => {
            const iconoEl = document.getElementById(`poder-icono-${i}`);
            const nombreEl = document.getElementById(`poder-nombre-${i}`);
            const descEl = document.getElementById(`poder-desc-${i}`);
            if (iconoEl && nombreEl && descEl) {
                p.icono = iconoEl.value;
                p.nombre = nombreEl.value;
                p.desc = descEl.value;
            }
        });
        Store.updateConfig({ poderes: config.poderes });
        toast('Poderes guardados', 'success');
    }

    function agregarPoder() {
        const icono = document.getElementById('new-poder-icono').value || '⚡';
        const nombre = document.getElementById('new-poder-nombre').value.trim();
        const desc = document.getElementById('new-poder-desc').value.trim();
        if (!nombre) return toast('Ingresa un nombre', 'warning');
        const config = Store.getConfig();
        config.poderes.push({ id: Date.now(), nombre, icono, desc: desc || nombre, tipo: 'ayuda' });
        Store.updateConfig({ poderes: config.poderes });
        renderConfig();
        toast('Poder agregado', 'success');
    }

    function eliminarPoder(index) {
        const config = Store.getConfig();
        config.poderes.splice(index, 1);
        Store.updateConfig({ poderes: config.poderes });
        renderConfig();
    }

    function handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                Store.importData(e.target.result);
                toast('Datos importados correctamente', 'success');
                renderConfig();
            } catch (err) {
                toast('Error al importar: formato inválido', 'error');
            }
        };
        reader.readAsText(file);
    }

    function resetearDatos() {
        if (!confirm('⚠️ ¿Seguro? Se perderán TODOS los datos del juego.')) return;
        if (!confirm('¿Realmente seguro? Esta acción no se puede deshacer.')) return;
        Store.resetData();
        toast('Datos reseteados', 'info');
        logout();
    }

    // ===== MODAL =====
    function showModal(html) {
        const overlay = document.getElementById('modal-overlay');
        const content = document.getElementById('modal-content');
        content.innerHTML = `<button class="modal-close" onclick="App.closeModal()">✕</button>${html}`;
        overlay.classList.remove('hidden');
        overlay.classList.add('scale-in');
    }

    function closeModal() {
        document.getElementById('modal-overlay').classList.add('hidden');
    }

    // Close modal on overlay click
    document.addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });

    // ===== TOAST =====
    function toast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const t = document.createElement('div');
        t.className = `toast toast-${type}`;
        t.textContent = message;
        container.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    // ===== CONFETTI =====
    function launchConfetti() {
        const canvas = document.getElementById('confetti-canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const pieces = [];
        const colors = ['#ff6b35','#7b2ff7','#00d4aa','#ffd700','#ff4757','#1e90ff','#2ed573'];

        for (let i = 0; i < 120; i++) {
            pieces.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                w: Math.random() * 10 + 5,
                h: Math.random() * 6 + 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                vy: Math.random() * 3 + 2,
                vx: Math.random() * 4 - 2,
                rot: Math.random() * 360,
                rotSpeed: Math.random() * 10 - 5
            });
        }

        let frames = 0;
        function animate() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pieces.forEach(p => {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
                p.y += p.vy;
                p.x += p.vx;
                p.rot += p.rotSpeed;
                p.vy += 0.05;
            });
            frames++;
            if (frames < 180) requestAnimationFrame(animate);
            else ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        animate();
    }

    // ===== SANITIZE =====
    function sanitize(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ===== INIT ON LOAD =====
    window.addEventListener('DOMContentLoaded', init);

    // ===== PUBLIC API =====
    return {
        login, logout, showScreen, showAddPlayerModal, pickAvatar, addNewPlayer,
        guardarMeta, guardarAvance, verificarSemana, nuevaSemana,
        usarPoder,
        selectVoto, submitVotos, verResultadosVotos, enviarMencion,
        changeRankingTab,
        mostrarFormProyecto, crearProyecto, registrarAvanceProyecto,
        guardarAvanceProyecto, verHistorialProyecto, toggleEntregable,
        agregarEntregable, guardarEntregable, cambiarEstadoProyecto,
        verPerfilJugador, cambiarAvatar, cambiarNombre,
        guardarNombreEquipo, eliminarJugador,
        guardarPremios, agregarPremio, eliminarPremio,
        guardarCategorias, agregarCategoria, eliminarCategoria,
        guardarPoderes, agregarPoder, eliminarPoder,
        handleImport, resetearDatos,
        showModal, closeModal, renderPerfil,
        // GitHub
        showGitHubSetup, saveGitHubConfig, testGitHubConnection, disconnectGitHub,
        forceSyncGitHub, verCommitHistory, guardarPassword
    };
})();
