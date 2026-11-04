# 🤖 Equipo de Agentes Especializados • Brain Up Clockify
### Suite Corporativa: Brain Up Grup

Este documento define la estructura, responsabilidades, herramientas y flujos de trabajo del equipo de **agentes especializados** configurados para el desarrollo continuo de **Brain Up Clockify**, asegurando la alineación total con el [`README.md`](./README.md) y el [`REGISTRO_MAESTRO.md`](./REGISTRO_MAESTRO.md).

---

## 👥 Estructura del Equipo de Agentes

```
                                     ┌────────────────────────────────────────┐
                                     │               EL JEFE                  │
                                     │     (Tech Lead & Orquestador Maestro)  │
                                     └───────────────────┬────────────────────┘
                                                         │
         ┌───────────────────┬───────────────────────────┼───────────────────┬───────────────────┐
         ▼                   ▼                           ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐ ┌────────────────────┐ ┌──────────────────────┐
│    FRONTEND     │ │     BACKEND     │ │   REVISOR USABILIDAD    │ │ REVISOR SEGURIDAD  │ │       SEGURATA       │
│ (UI & Next.js)  │ │(Supabase & SQL) │ │   (UX & Zero-Scroll)    │ │  (RLS & Permisos)  │ │(Centinela Ciberseg.) │
└─────────────────┘ └─────────────────┘ └─────────────────────────┘ └────────────────────┘ └──────────────────────┘
```

| Agente | Nombre en el Sistema | Archivo de Especificación | Rol Principal | Herramientas Clave |
| :--- | :--- | :--- | :--- | :--- |
| **El Jefe** | `jefe` | [`.agents/jefe.md`](./.agents/jefe.md) | Tech Lead, planificación, delegación a subagentes, arbitraje arquitectónico y actualización de `REGISTRO_MAESTRO.md`. | Subagentes, MCP, Edición/Terminal |
| **Frontend** | `frontend` | [`.agents/frontend.md`](./.agents/frontend.md) | Especialista en Next.js 14 App Router, React 18, Tailwind CSS, componentes in-app (`AppSelect`, `AppCalendar`), Zero-Scroll y diseño "La Abuela". | MCP, Edición/Terminal |
| **Backend** | `backend` | [`.agents/backend.md`](./.agents/backend.md) | Arquitecto de Base de Datos (Supabase PostgreSQL 15, Auth, RLS con `SECURITY DEFINER`), Realtime, Server Actions, API routes y exportaciones (.xlsx, .pdf). | MCP, Edición/Terminal |
| **Revisor Usabilidad**| `revisor-usabilidad` | [`.agents/revisor-usabilidad.md`](./.agents/revisor-usabilidad.md) | Auditor implacable de UX/UI, política Zero-Scroll (DM-15, modales <420px), Cero Emojis (DM-01), atajos de teclado y fidelidad con los estudios de usabilidad (`docs/usability/`). | Edición/Terminal, Auditoría |
| **Revisor Seguridad** | `revisor-seguridad` | [`.agents/revisor-seguridad.md`](./.agents/revisor-seguridad.md) | Auditor de protección de datos, aislamiento estricto de usuarios en RLS (`auth.uid() = user_id`), RBAC, prevención de inyecciones y flujo seguro de `/register`. | Edición/Terminal, Auditoría |
| **Segurata** | `segurata` | [`.agents/segurata.md`](./.agents/segurata.md) | Centinela activo de ciberseguridad, monitoreo continuo de RLS, mitigación de escalada de privilegios, zero-trust edge gates y prevención de fugas. | Edición/Terminal, Auditoría |

---

## 📜 Directrices Maestras Compartidas (Matriz Inmutable)

Todos los agentes comparten el compromiso inviolable de cumplir las directrices maestras del proyecto:

1. **DM-01 • CERO EMOJIS (TERMINANTEMENTE PROHIBIDO):** Prohibido el uso de caracteres emoji en código, interfaz, modales o base de datos. Solo iconos vectoriales SVG con Lucide React.
2. **DM-02 • Controles In-App Propios:** Ningún desplegable nativo `<select>` ni datepickers por defecto de Windows. Se usan `AppSelect` y `AppCalendar`.
3. **DM-03 • Diseño Líquido al 100% de Pantalla:** Interfaces sin topes rígidos (`w-full`), fluidas en cualquier resolución o nivel de zoom.
4. **DM-04 • Modelo Exclusivo por Empresa (Sin Proyectos):** Todo se asocia directamente a la Empresa/Cliente (`company_id`).
5. **DM-05 • Rol Dual Perpetuo:** El Coordinador tiene acceso simultáneo a su faceta de Trabajador y Coordinador.
6. **DM-06 • Shorthands de Velocidad:** `3` = 3h, `330` = 3h 30m, `145` = 1h 45m.
7. **DM-07 • Edición Directa Inline:** Modificación en vivo al hacer clic sobre texto o tiempo + papelera de seguridad.
8. **DM-08 • Seguridad Aislada mediante RLS:** Empleados solo leen y editan sus registros (`auth.uid() = user_id`). Bypass auditado mediante `is_coordinator()` con `SECURITY DEFINER`.
9. **DM-09 • Clientes Cuota vs Puntuales:** Cálculo matemático al minuto de bolsas mensuales (faltantes, sobrantes, cuota cumplida al milímetro).
10. **DM-10 • Estadísticas en 3 Perspectivas:** General, por Empresa y por Empleado.
11. **DM-11 • Informes PDF Vertical A4 y Excel Humano:** Maquetación vertical elegante y hojas `.xlsx` organizadas por pestañas.
12. **DM-12 • Registro vía Enlace y Aprobación:** Nuevos empleados ingresan por `/register` y requieren aprobación del coordinador.
13. **DM-13 • Identidad Corporativa "La Abuela":** Blanco puro `#FFFFFF`, fondos `#F8F6FC`, bordes `#D8CFF0`, ciruela `#8E0E75`, degradado índigo-ciruela `from-[#191654] to-[#8E0E75]`, verde éxito `#3BB54A`, tipografía Montserrat y números en `tabular-nums`. Sin modo oscuro.
14. **DM-14 • TaskFlow & Calendario Nativo:** Calendario interactivo Lu-Vie, tiras de colores RGB, auto-desplazamiento y conexión directa al cronómetro Clockify.
15. **DM-15 • POLÍTICA ZERO-SCROLL / VIEWPORT COMPACTO:** Mínimo scroll vertical posible en todas las vistas. Modales en rejilla multi-columna compacta (`grid md:grid-cols-12`) con altura acotada (< 420px). Acordeones colapsables para listados extensos.
16. **DM-16 • Brain Up Comms:** Mensajería por clientes estilo Slack anti-ruido, tareas accionables y Supabase Realtime.

---

## 🔄 Flujo de Trabajo y Colaboración

### Paso 1: Recepción del Requerimiento
El **Jefe** analiza la petición del usuario, consulta el [`README.md`](./README.md) y el [`REGISTRO_MAESTRO.md`](./REGISTRO_MAESTRO.md), y formula el plan de implementación.

### Paso 2: Ejecución Técnica
- Si el cambio involucra base de datos, APIs o exportaciones: delega en **Backend**.
- Si el cambio involucra componentes visuales, páginas o maquetación: delega en **Frontend**.

### Paso 3: Auditorías de Calidad (Doble Filtro)
- **Revisor de Usabilidad** audita que se respete la política Zero-Scroll (DM-15), la ausencia total de emojis (DM-01), los controles in-app (DM-02) y la coherencia con los estudios de `docs/usability/`.
- **Revisor de Seguridad** audita que no se hayan abierto brechas de seguridad, que las políticas RLS aíslen los datos y que no se expongan credenciales maestras.

### Paso 4: Validación y Registro Maestro
El **Jefe** ejecuta `npx tsc --noEmit`, confirma la compilación exitosa y redacta el registro formal de la versión en [`REGISTRO_MAESTRO.md`](./REGISTRO_MAESTRO.md).

---

## 🚀 Cómo Invocar a los Agentes en Antigravity

Los 5 agentes están dados de alta como subagentes del sistema y pueden invocarse mediante la herramienta `invoke_subagent`:

```json
{
  "TypeName": "jefe",
  "Role": "Tech Lead y Orquestador",
  "Prompt": "Planifica y coordina la implementación del nuevo módulo..."
}
```

O para tareas específicas:
- `frontend`: "Maqueta el nuevo modal de filtros en 2 columnas compactas sin scroll vertical..."
- `backend`: "Crea la migración SQL para añadir el campo de notificación escalonada y actualiza RLS..."
- `revisor-usabilidad`: "Audita la vista de coordinación para confirmar que cumple DM-15 y Cero Emojis..."
- `revisor-seguridad`: "Revisa la Server Action de actualización de usuario para prevenir IDOR y validar roles..."

