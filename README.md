# 🏰 Quest del Equipo

Juego web de gamificación para fomentar la planificación semanal en equipos de trabajo.

**URL:** [https://batoc.github.io/weekly_game/](https://batoc.github.io/weekly_game/)

---

## 🎮 Cómo jugar

1. Abrir el link del juego
2. Ingresar la contraseña del equipo
3. Seleccionar tu personaje
4. Definir tus metas semanales en "🎯 Misiones"

### Flujo semanal
- **Lunes:** Cada miembro define metas (proyectos + casos)
- **Durante la semana:** Poderes, menciones, avances en proyectos
- **Viernes:** El líder verifica avances → puntos → votaciones → ranking

### Puntos
| Acción | Puntos |
|--------|--------|
| Meta cumplida 100% | +10 |
| Meta cumplida 50-99% | +5 |
| Cada caso resuelto | +2 |
| Proyecto completado | +20 |

---

## 🔗 Sincronización GitHub

Los datos se sincronizan automáticamente con `data.json` en este repositorio usando la GitHub API.

**Para conectar:** Configuración → Configurar GitHub → ingresar usuario, repositorio y token (PAT).

### Crear Token (PAT)
1. [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta) → Generate new token
2. Seleccionar solo este repositorio
3. Permissions → Contents: Read and Write
4. Copiar y pegar en el juego

---

## 📁 Estructura
```
index.html          # Página principal
data.json           # Base de datos (sync con GitHub)
css/style.css       # Estilos
js/github-api.js    # GitHub API
js/store.js         # Capa de datos
js/app.js           # Lógica del juego
```

## ⚙️ Personalización
En Configuración se pueden editar: miembros, premios, poderes, categorías de votación y contraseña del equipo.