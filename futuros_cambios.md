# Futuros Cambios Pendientes

Tareas de refactorización arquitectónica diferidas por alto riesgo. Requieren testing visual o entorno de staging para implementarse de forma segura.

---

## 2.3 — Unificar los 2 `index.php` en uno solo

### Contexto
Existen dos archivos `index.php` casi idénticos (~380 líneas cada uno):
- `apache2/index.php` — usa clases CSS para el header
- `apache2/sistema/index.php` — usa inline styles para el header

### Ventajas
- Elimina duplicación de ~380 líneas de JS inline idénticas
- Un solo archivo para mantener cuando cambies algo del dashboard
- Menos confusión para desarrolladores nuevos ("¿cuál es el index correcto?")
- Las correcciones de seguridad (CSRF, XSS) solo se aplican una vez

### Desventajas
- `sistema/index.php` tiene inline styles que difieren del CSS de la raíz (grid layout diferente en el header, distintos tamaños de logo, colores distintos en badges)
- Fusionar implica elegir un diseño y perder el otro, o rehacer el header de `sistema/` para que use las clases CSS del root
- Riesgo de romper la UI en pantallas mobile (los breakpoints y estilos del header son distintos)
- Sin poder probar visualmente, es fácil dejar algo roto

---

## 2.4 — Separar `app.js` en módulos (search, forms, crud, export, users)

### Contexto
`app.js` tiene 2047 líneas con toda la lógica de la aplicación: búsqueda, formularios, CRUD, exportación, gestión de usuarios, menú móvil, etc.

### Ventajas
- `app.js` pasa de 2047 líneas a ~5-6 archivos de ~350 líneas cada uno
- Más fácil encontrar y editar una funcionalidad específica (search, forms, crud, export, users)
- Tests más granulares (testear search.js sin cargar forms.js)
- Menos conflictos en Git cuando dos personas editen funcionalidades distintas
- Mejor rendimiento de carga inicial si se usa lazy loading

### Desventajas
- Las funciones comparten estado global (`tablaSeleccionada`, `VistaSeleccionada`, `paginaActual`, `cursosDisponibles`, etc.)
- Hay muchas llamadas cruzadas: `cargarFormulario()` llama a `fetchDataTable()`, `editarRegistro()` llama a `cargarFormulario()`, etc.
- Separar requiere definir una API clara entre módulos (qué funciones se exportan, cómo se pasa el estado)
- Actualmente todo está en `window.*` para los `onclick` inline del HTML — separar en módulos ES rompe esos handlers
- Hay ~50+ funciones que interactúan entre sí; el grafo de dependencias es denso

---

## 2.5 — Mover JS inline de `index.php` a archivos `.js` separados

### Contexto
Ambos `index.php` tienen ~380 líneas de JavaScript embebidas directamente en template strings PHP. Este JS maneja la gestión de usuarios (loadUsers, addUser, updateUserRol, deleteUser).

### Ventajas
- Elimina ~380 líneas de JS embebido en PHP template strings
- Permite cache del navegador para el JS (el inline se descarga con cada carga de página)
- Permite usar ESLint y herramientas de análisis estático
- Mejor separación de concerns (PHP solo renderiza, JS solo maneja interacción)

### Desventajas
- El JS inline tiene variables PHP embebidas: `rol = '<?php echo $_SESSION['rol']; ?>'`, `userId = '<?php echo $_SESSION['user_id']; ?>'`
- Para sacarlo a un archivo externo, esas variables deben pasarse por `<meta>` tags o `data-*` attributes
- Requiere refactorizar toda la lógica de usuario (loadUsers, addUser, updateUserRol, etc.) que depende de esas variables PHP
- Ligada a la tarea 2.3 — si no se unifican los index.php, se duplica el trabajo

---

## 2.6 — Eliminar estilos inline de JS, mover a `styles.css`

### Contexto
`app.js` tiene ~200+ asignaciones `style.cssText = '...'` y `style="..."` que generan estilos dinámicamente para modales, formularios, acordeones, tablas, etc. El archivo `styles.css` ya tiene reglas dark-mode que intentan override con `!important` sobre estos inline styles.

### Ventajas
- `styles.css` ya tiene reglas dark-mode que intentan overrides con `!important` sobre los inline styles — eliminar los inline hace que el dark mode funcione correctamente
- Un solo lugar para mantener estilos (en vez de CSS + JS + HTML inline)
- Mejor rendimiento (el navegador puede cachear y aplicar CSS de forma más eficiente)
- Más fácil personalizar el tema (cambiar colores en un solo archivo)

### Desventajas
- Hay ~200+ asignaciones `style.cssText = '...'` y `style="..."` en `app.js`
- Muchos estilos son dinámicos: `modal.style.display = 'block'`, `element.style.background = color`
- Los estáticos (modales, formularios, acordeones) se pueden mover a clases CSS, pero los dinámicos requieren lógica JS
- Requiere crear ~50-80 clases CSS nuevas y reemplazar cada `style.cssText` por `classList.add()`
- Riesgo de regresiones visuales en cada reemplazo

---

## Resumen comparativo

| Tarea | Impacto positivo | Riesgo de romper UI | Esfuerzo estimado | Dependencias |
|-------|-----------------|---------------------|-------------------|--------------|
| 2.3 Unificar index.php | Medio | **Alto** | Medio (4-6h) | Ninguna |
| 2.4 Separar app.js | **Alto** | **Muy alto** | **Muy alto** (2-3 días) | 2.3 ideal |
| 2.5 Mover JS inline | Medio | Medio | Medio (4-6h) | Ligada a 2.3 |
| 2.6 Eliminar estilos inline | **Alto** (mejora dark mode) | **Alto** | **Muy alto** (1-2 días) | Ninguna |

## Recomendación de implementación

Si se decides a implementar estas tareas, el orden sugerido es:

1. **2.6 (estilos inline)** — Mayor beneficio porque arregla el dark mode que actualmente está roto por los overrides con `!important`. Pero es el trabajo más grande.
2. **2.3 + 2.5 juntas** — Unificar index.php Y mover su JS inline a archivo externo como un solo paquete.
3. **2.4 (separar app.js)** — Solo si el proyecto va a crecer significativamente o van a trabajar varios desarrolladores en paralelo. Es la de mayor riesgo y esfuerzo.
