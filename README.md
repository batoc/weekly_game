# 🏰 Quest del Equipo — Juego de Gamificación Semanal

Juego 2D web para fomentar la cultura de planificación en equipos de trabajo (5-6 integrantes).
**100% gratis** usando GitHub Pages + GitHub API como base de datos.

---

## 🚀 GUÍA COMPLETA DE DESPLIEGUE (Paso a Paso)

### Paso 1: Crear cuenta de GitHub (si no tienes)
1. Ve a [github.com/signup](https://github.com/signup)
2. Crea tu cuenta gratuita

### Paso 2: Crear el repositorio
1. Ve a [github.com/new](https://github.com/new)
2. **Repository name:** `juego-planificacion` (o el nombre que quieras)
3. **Description:** Quest del Equipo - Gamificación Semanal
4. Selecciona **Public** (necesario para GitHub Pages gratis)
5. **NO** marques "Add a README file" (ya tenemos uno)
6. Clic en **Create repository**

### Paso 3: Subir los archivos al repositorio
Abre una terminal en la carpeta `weekly_game` y ejecuta:

```bash
git init
git add .
git commit -m "🎮 Quest del Equipo - primera versión"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/juego-planificacion.git
git push -u origin main
```

> **Reemplaza `TU_USUARIO`** con tu usuario real de GitHub.

### Paso 4: Activar GitHub Pages
1. Ve a tu repo en GitHub → **Settings** (arriba a la derecha)
2. En el menú izquierdo → **Pages**
3. **Source:** selecciona `Deploy from a branch`
4. **Branch:** selecciona `main` → carpeta `/ (root)` → **Save**
5. Espera 1-2 minutos
6. Tu juego estará en: `https://TU_USUARIO.github.io/juego-planificacion/`

### Paso 5: Crear Token de Acceso (PAT) para escritura
Esto permite que el juego guarde datos en GitHub (metas, votos, puntos):

1. Ve a [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)
2. Clic en **Generate new token**
3. **Token name:** `Quest Equipo`
4. **Expiration:** 90 días (o el máximo que quieras)
5. **Repository access:** selecciona **Only select repositories** → elige `juego-planificacion`
6. **Permissions → Repository permissions:**
   - **Contents:** `Read and Write` ✅
   - Todo lo demás déjalo como está
7. Clic **Generate token**
8. **¡COPIA EL TOKEN!** (solo aparece una vez, empieza con `github_pat_...`)

### Paso 6: Conectar el juego con GitHub
1. Abre tu juego: `https://TU_USUARIO.github.io/juego-planificacion/`
2. Clic en **🔗 Conectar con GitHub**
3. Llena los datos:
   - **Usuario:** tu nombre de usuario de GitHub
   - **Repositorio:** `juego-planificacion`
   - **Token:** pega el token que copiaste
4. Clic **💾 Guardar y Conectar**
5. Si aparece ✅ → ¡listo! Los datos se sincronizan automáticamente

### Paso 7: Compartir con tu equipo
Envía a todos el link: `https://TU_USUARIO.github.io/juego-planificacion/`

Cada miembro deberá:
1. Abrir el link
2. Escribir la contraseña del equipo (por defecto: `quest2026`)
3. Clic en **🔗 Conectar con GitHub** e ingresar los mismos datos (usuario, repo, token)
4. Seleccionar su personaje y entrar

> 💡 **Tip:** Comparte el token con tu equipo por un canal seguro. Es un token limitado solo a ese repo.

---

## 🔄 ¿Cómo funciona la sincronización?

| Acción | Cómo funciona |
|--------|---------------|
| **Guardar datos** | Se guarda en localStorage (instantáneo) + se sube a GitHub en 2 segundos |
| **Cargar datos** | Al abrir, descarga desde GitHub → actualiza localStorage |
| **Sincronización** | Cada 30 segundos verifica si hay cambios en GitHub |
| **Conflictos** | Si dos personas guardan al mismo tiempo, GitHub maneja el conflicto con reintentos automáticos (3 intentos) |
| **Historial** | Cada cambio crea un commit en GitHub → puedes revertir cualquier cambio |

### ¿Y si guardan al mismo tiempo?
- El sistema usa el SHA del archivo para detectar si alguien más lo cambió
- Si hay conflicto: recarga los datos actuales, aplica el cambio encima, y reintenta
- En práctica con 5-6 personas: los conflictos son rarísimos

### Límites (más que suficientes)
- 5,000 requests/hora con token → tus 6 personas usan ~200/hora como máximo
- Delay de ~2-30 segundos entre cambios (perfecto para metas semanales)

---

## 🎮 Cómo usar el juego

### Flujo Semanal (Viernes)

1. **Inicio de semana**: Cada miembro entra y define sus metas en "🎯 Misiones"
2. **Durante la semana**: Poderes, menciones anónimas, registro de avances en proyectos
3. **Viernes**: El líder verifica avances → asigna puntos → votaciones → ranking → avanzar semana

### Sistema de Puntos
| Acción | Puntos |
|--------|--------|
| Meta cumplida al 100% | +10 pts |
| Meta cumplida 50-99% | +5 pts |
| Cada caso resuelto | +2 pts |
| Proyecto completado | +20 pts |
| Poder "Doble XP" | Puntos x2 |

### Contraseña
- Por defecto: `quest2026`
- Cambiar en ⚙️ Configuración → 🔑 Contraseña del Equipo
- Todos los miembros usan la misma contraseña

---

## 📁 Estructura del Proyecto
```
weekly_game/
├── index.html              # Página principal
├── data.json               # Base de datos (sincronizada con GitHub)
├── css/
│   └── style.css           # Estilos del juego
├── js/
│   ├── github-api.js       # Comunicación con GitHub API
│   ├── store.js            # Capa de datos (localStorage + GitHub sync)
│   └── app.js              # Lógica del juego y pantallas
└── README.md               # Este archivo
```

## 💾 Respaldos
- **Automático:** Cada cambio crea un commit en GitHub (historial completo)
- **Manual:** ⚙️ Config → 📥 Exportar Backup → descarga JSON local
- **Restaurar:** ⚙️ Config → 📤 Importar Backup

## 🛠️ Personalización
En ⚙️ Configuración puedes editar premios, poderes, categorías de votación, miembros, y contraseña.

## 📱 Compatibilidad
- ✅ Chrome, Firefox, Edge, Safari
- ✅ Funciona en móvil (responsive)
- ✅ Funciona offline (localStorage como caché)
- ✅ 100% GRATIS
