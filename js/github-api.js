/* =========================================================
   GITHUB-API.JS - GitHub REST API Communication Layer
   Lee y escribe data.json en tu repo de GitHub
   100% gratis, sin base de datos externa
   ========================================================= */

const GitHubAPI = (() => {
    const CONFIG_KEY = 'quest_github_config';
    let _sha = null;       // SHA actual del archivo (para updates)
    let _polling = null;   // Interval de polling
    let _syncing = false;  // Flag para evitar writes simultáneos

    // ===== CONFIG =====
    function getGitHubConfig() {
        const raw = localStorage.getItem(CONFIG_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    }

    function saveGitHubConfig(config) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    }

    function removeGitHubConfig() {
        localStorage.removeItem(CONFIG_KEY);
        _sha = null;
    }

    function isConfigured() {
        const cfg = getGitHubConfig();
        return cfg && cfg.owner && cfg.repo && cfg.token;
    }

    function getApiUrl() {
        const cfg = getGitHubConfig();
        if (!cfg) return null;
        return `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/data.json`;
    }

    function getHeaders() {
        const cfg = getGitHubConfig();
        if (!cfg || !cfg.token) return {};
        return {
            'Authorization': `Bearer ${cfg.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
        };
    }

    // ===== READ =====
    async function fetchData() {
        const url = getApiUrl();
        if (!url) throw new Error('GitHub no configurado');

        const response = await fetch(url, { headers: getHeaders() });

        if (response.status === 404) {
            // data.json no existe → crearlo con datos por defecto
            return null;
        }

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`GitHub API Error ${response.status}: ${err.message || 'Error desconocido'}`);
        }

        const fileData = await response.json();
        _sha = fileData.sha;

        // Decodificar contenido base64
        const content = decodeBase64(fileData.content);
        return JSON.parse(content);
    }

    // ===== WRITE =====
    async function saveData(data, message = 'Actualización automática') {
        if (_syncing) {
            // Encolar para después
            return new Promise((resolve) => {
                setTimeout(() => resolve(saveData(data, message)), 1000);
            });
        }

        _syncing = true;
        const url = getApiUrl();
        if (!url) { _syncing = false; throw new Error('GitHub no configurado'); }

        const content = encodeBase64(JSON.stringify(data, null, 2));

        // Si no tenemos SHA, obtener primero
        if (!_sha) {
            try {
                await fetchData();
            } catch (e) {
                // Si el archivo no existe, _sha será null y se creará
            }
        }

        const body = {
            message: `🎮 ${message}`,
            content: content,
            branch: 'main'
        };

        if (_sha) {
            body.sha = _sha;
        }

        let retries = 3;
        while (retries > 0) {
            try {
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(body)
                });

                if (response.status === 409) {
                    // Conflicto: alguien más actualizó → re-fetch SHA y reintentar
                    retries--;
                    if (retries > 0) {
                        await fetchData(); // Obtener nuevo SHA
                        body.sha = _sha;
                        continue;
                    }
                    _syncing = false;
                    throw new Error('Conflicto al guardar. Recarga y reintenta.');
                }

                if (response.status === 422) {
                    // SHA desactualizado → re-fetch y reintentar
                    retries--;
                    if (retries > 0) {
                        await fetchData();
                        body.sha = _sha;
                        continue;
                    }
                    _syncing = false;
                    throw new Error('SHA desactualizado. Recarga.');
                }

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    _syncing = false;
                    throw new Error(`GitHub Error ${response.status}: ${err.message || ''}`);
                }

                const result = await response.json();
                _sha = result.content.sha; // Actualizar SHA para próximo write
                _syncing = false;
                return result;

            } catch (error) {
                if (retries <= 1 || !error.message.includes('Conflicto')) {
                    _syncing = false;
                    throw error;
                }
                retries--;
            }
        }
        _syncing = false;
    }

    // ===== INIT: Crear data.json si no existe =====
    async function initDataFile(defaultData) {
        try {
            const existing = await fetchData();
            if (existing) return existing; // Ya existe
        } catch (e) {
            // No existe, crear
        }

        _sha = null;
        await saveData(defaultData, 'Inicialización del juego');
        return defaultData;
    }

    // ===== POLLING =====
    function startPolling(callback, intervalMs = 30000) {
        stopPolling();
        _polling = setInterval(async () => {
            try {
                const data = await fetchData();
                if (data && callback) callback(data);
            } catch (e) {
                console.warn('Polling error:', e.message);
            }
        }, intervalMs);
    }

    function stopPolling() {
        if (_polling) {
            clearInterval(_polling);
            _polling = null;
        }
    }

    // ===== VERIFICAR CONEXIÓN =====
    async function testConnection() {
        const cfg = getGitHubConfig();
        if (!cfg) return { ok: false, error: 'No configurado' };

        try {
            // Verificar que el token funciona
            const resp = await fetch('https://api.github.com/user', {
                headers: getHeaders()
            });

            if (!resp.ok) {
                return { ok: false, error: 'Token inválido o expirado' };
            }

            const user = await resp.json();

            // Verificar que el repo existe
            const repoResp = await fetch(`https://api.github.com/repos/${cfg.owner}/${cfg.repo}`, {
                headers: getHeaders()
            });

            if (repoResp.status === 404) {
                return { ok: false, error: `Repo "${cfg.owner}/${cfg.repo}" no encontrado. ¿Lo creaste?`, user: user.login };
            }

            if (!repoResp.ok) {
                return { ok: false, error: 'Error al acceder al repo' };
            }

            return { ok: true, user: user.login, repo: `${cfg.owner}/${cfg.repo}` };

        } catch (e) {
            return { ok: false, error: `Error de conexión: ${e.message}` };
        }
    }

    // ===== BASE64 UTILS =====
    function encodeBase64(str) {
        // Manejar caracteres Unicode correctamente
        const bytes = new TextEncoder().encode(str);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    function decodeBase64(base64) {
        // Limpiar saltos de línea que GitHub agrega
        const clean = base64.replace(/\n/g, '');
        const binary = atob(clean);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new TextDecoder().decode(bytes);
    }

    // ===== GET COMMITS HISTORY =====
    async function getCommitHistory(limit = 20) {
        const cfg = getGitHubConfig();
        if (!cfg) return [];

        try {
            const resp = await fetch(
                `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/commits?path=data.json&per_page=${limit}`,
                { headers: getHeaders() }
            );
            if (!resp.ok) return [];
            const commits = await resp.json();
            return commits.map(c => ({
                sha: c.sha.substring(0, 7),
                message: c.commit.message,
                date: c.commit.author.date,
                author: c.commit.author.name
            }));
        } catch (e) {
            return [];
        }
    }

    return {
        getGitHubConfig, saveGitHubConfig, removeGitHubConfig, isConfigured,
        fetchData, saveData, initDataFile,
        startPolling, stopPolling,
        testConnection, getCommitHistory
    };
})();
