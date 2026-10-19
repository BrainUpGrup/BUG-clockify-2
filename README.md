# Brain Up Clockify - Sistema de Control Horario por Empresa
### Identidad Corporativa: "La Abuela" - Brain Up Grup

Aplicación web interna de alto rendimiento para Brain Up Grup, desarrollada con Next.js (App Router), TypeScript, Tailwind CSS y Supabase (PostgreSQL, Auth y Row Level Security). Diseñada con arquitectura líquida al 100% del ancho de pantalla, modelo centrado exclusivamente en Empresas/Clientes, control al milímetro de **Clientes Cuota vs. Clientes Puntuales** y el sistema de diseño visual corporativo de **La Abuela**.

![Brain Up Clockify Logo](./public/logo.png)

---

## Directrices Matriz de la Aplicación

Todas las futuras modificaciones y desarrollos sobre esta base de código deben cumplir obligatoriamente las siguientes directrices maestras:

| # | Directriz Matriz | Descripción y Cumplimiento Técnico |
|---|---|---|
| **DM-01** | **CERO EMOJIS (Norma Indispensable)** | **Queda terminantemente prohibido el uso de caracteres emoji** en código, interfaces, botones, desplegables, títulos y notificaciones. Toda iconografía debe implementarse exclusivamente mediante **iconos vectoriales SVG** (Lucide React). |
| **DM-02** | **Controles Propios In-App (Cero Controles de Windows OS)** | **Todos los desplegables, selectores y calendarios son componentes de interfaz propios de la aplicación** (`AppSelect`, `AppCalendar`). Se erradica por completo la apariencia de controles del sistema operativo Windows (`<select>` con menús OS, `<input type="number">` con flechas/spinners y calendarios por defecto del navegador). Todos los controles cuentan con transiciones suaves, elevación, cierres por clic exterior o Escape, y estética premium integrada en Tailwind CSS. |
| **DM-03** | **Diseño Líquido a Pantalla Completa (100% Width)** | La interfaz no posee barras laterales vacías ni límites rígidos (`max-w-7xl` deshabilitado). Utiliza un **layout líquido fluido al 100% del viewport** que se adapta dinámicamente a cualquier resolución de pantalla o nivel de zoom (100%, 80%, 125%, ultrawide, etc.). |
| **DM-04** | **Modelo Centrado Exclusivamente en Empresas** | **La agencia no trabaja por proyectos.** Todas las horas se clasifican e imputan directamente a la **Empresa / Cliente** (`company_id`), simplificando el flujo de registro, la matriz mensual, la gestión de clientes y las exportaciones. |
| **DM-05** | **Rol Dual: Coordinador & Trabajador** | El usuario Coordinador tiene acceso simultáneo a la faceta de **Trabajador** (para registrar y cronometrar sus propias horas de jornada) y a la faceta de **Coordinador** (para supervisión global, matriz de empleados, exportaciones y gestión de empresas). Sus horas personales se integran de forma transparente en los informes generales. |
| **DM-06** | **Shorthand de Agencia para Entrada de Tiempo** | El motor de análisis de tiempo (`parseDurationToMinutes`) prioriza la velocidad al teclear: <br>• Un número simple (`3`, `8`) se interpreta automáticamente como **Horas** (`3h`, `8h`).<br>• Un número superior a 8 horas con 3 o 4 dígitos (ej. `330`, `145`, `830`) se descompone en formato HMM/HHMM: **`330` = 3h 30m**, **`145` = 1h 45m**.<br>• Decimales con punto o coma (`2.5`, `2,5`, `3,30`) se interpretan como horas fraccionadas.<br>• Minutos explícitos requieren `m` (ej. `45m`). |
| **DM-07** | **Edición Directa y Eliminación Segura con Papelera** | La duración y descripción se editan **directamente haciendo clic encima del texto** en la lista (edición inline rápida con guardado automático al pulsar `Enter` o perder el foco). Cada registro horario dispone además de un botón de papelera (`Trash2`) situado a la derecha con confirmación de seguridad para eliminar registros erróneos o duplicados. |
| **DM-08** | **Seguridad Aislada mediante RLS (Supabase)** | Cada trabajador solo puede consultar y modificar sus propios registros (`auth.uid() = user_id`). El coordinador cuenta con bypass de lectura global auditado mediante la función SQL `public.is_coordinator()` con atributo `SECURITY DEFINER`. |
| **DM-09** | **Gestión de Clientes Cuota y Clientes Puntuales** | Los clientes se clasifican en: <br>1. **Cliente Cuota:** Con bolsa mensual de horas pactada (ej. 15h/mes). Alerta estricta al milímetro: <br>&nbsp;&nbsp;• Si horas < cuota: **"Horas faltantes: Xh Ym"**.<br>&nbsp;&nbsp;• Si horas > cuota: **"Horas sobrantes: Xh Ym"**.<br>&nbsp;&nbsp;• Si horas == cuota: **"Cuota cumplida al milímetro"**.<br>&nbsp;&nbsp;• Al imputar para un cliente cuota, el empleado puede elegir entre **Horas de Cuota** (computan a la bolsa) o **Trabajos Puntuales / Extras** (no computan a la cuota pero sí al trabajo general).<br>2. **Cliente Puntual:** Facturación bajo demanda sin cuota fija. |
| **DM-10** | **Estadísticas Profesionales en 3 Perspectivas** | El panel de coordinación ofrece 3 vistas especializadas:<br>1. **Estadísticas Generales:** KPIs globales, cuota vs puntual, y monitor de cuotas con barras y alertas.<br>2. **Por Empresa / Cliente:** Ficha de cliente, balance exacto, equipo asignado y tareas.<br>3. **Por Empleado:** Rendimiento individual, porcentaje de dedicación por cliente y desglose cronológico. |
| **DM-11** | **Informes PDF Nativos en Vertical (Portrait) con Ficha Detallada del Cliente y Excel con Sentido Humano** | **PDF Nativos en Vertical A4 (210 x 297 mm):** Maquetación vertical elegante y sin solapamientos. Todos los informes incorporan **información detallada del cliente** (Razón Social, NIF/CIF, Persona de Contacto, Email, Modelo Comercial, Account Manager asignado y Estado de Cuenta). Incluye gráfico vectorial de horas sobrantes y faltantes al milímetro.<br>**Excel Humano:** Libros `.xlsx` estructurados con pestañas independientes ("Balance Cuotas Clientes", "Registro Detallado", "Rendimiento por Empleado"), anchos calibrados y columnas de horas legibles. |
| **DM-12** | **Registro de Empleados vía Enlace de Empresa y Aprobación del Coordinador** | Se suprime el alta manual de empleados en el panel de coordinación. El coordinador dispone de un **Enlace Oficial de Empresa** copiable con 1 clic (`/register`) para compartir con los nuevos miembros. Tras enviar la solicitud, el perfil queda en estado pendiente hasta que el coordinador pulsa **"Aceptar Empleado"** para activarlo en el equipo de la agencia. |
| **DM-13** | **Identidad Visual "La Abuela" - Brain Up Grup** | **Diseño luminoso sobre fondo blanco puro (`#FFFFFF`) sin modo oscuro.** Secciones secundarias en tono lila/gris (`#F8F6FC`, inspirado en el jersey pastel de La Abuela `#D8CFF0`). Color primario en Púrpura/Ciruela `#8E0E75` (hover `#700B5C`), Degradado de marca `bg-gradient-to-r from-[#191654] to-[#8E0E75]`, tipografía Google Font `Montserrat`, botones secundarios editoriales (`border: 1.5px solid #8E0E75`), contadores horarios con `tabular-nums` y color de éxito `#3BB54A` para "Exportar Excel". |
| **DM-14** | **Brain Up TaskFlow: Calendario Nativo, Google Calendar y Colaboración** | **Módulo integral de gestión de entregables y reuniones interconectado con el HUB y Clockify.** Dispone de: <br>• **Calendario Nativo Interactivo:** Vista mensual/semanal con cuadrícula fluida, inspector de día y píldoras de eventos codificadas por prioridad.<br>• **Exportación Directa a Google Calendar e iCal (.ics):** Generación de enlaces con 1 clic para añadir eventos pre-rellenados a Google Calendar y descarga de archivos `.ics` compatibles con Apple Calendar y Outlook.<br>• **Semántica de Prioridades Brain Up:** Rojo (`#DC2626`) para Urgente/Alta; Ámbar (`#D97706`) para Media; Verde (`#10B981`) para Baja o tareas completadas/bien.<br>• **Colaboración y Permisos de Equipo:** Posibilidad de crear tareas privadas o compartirlas con compañeros asignados.<br>• **Conexión Directa con Clockify:** Botón de 1 clic para arrancar el cronómetro en vivo vinculado directamente a la empresa y la tarea seleccionada. |
| **DM-15** | **MÍNIMO SCROLL POSIBLE EN TODAS LAS PÁGINAS (POLÍTICA ZERO-SCROLL / VIEWPORT COMPACTO)** | **MANDATO ESTRICTO: Se exige el mínimo scroll posible en TODAS las páginas, vistas y modales de la aplicación.** Toda la plataforma (Control Horario de Trabajador, Panel de Coordinación, TaskFlow Calendario, Hub de Aplicaciones y ventanas modales de creación/edición) debe concebirse bajo una estricta **arquitectura compacta de pantalla única (Zero-Scroll Viewport)**: <br>• **Modales en Rejilla Multi-columna:** Las ventanas emergentes y modales con múltiples datos (ej. "Crear en TaskFlow") deben distribuirse obligatoriamente en 2 o más columnas paralelas compactas (`grid md:grid-cols-12`) para que la totalidad de los campos (título, cliente, prioridad, fecha, horas, listas, selector RGB libre, swatches de colores, auto-desplazamiento y botones de acción) quepan en pantalla simultáneamente sin que el usuario tenga que hacer scroll vertical.<br>• **Densidad Visual y Paddings Calibrados:** Espaciados controlados (`p-2.5` / `p-3`), alturas compactas de botones (`py-1` / `py-1.5`), swatches en una sola fila (`grid-cols-10`), cabeceras en una sola línea con toggles integrados y tipografías jerárquicas optimizadas.<br>• **Acordeones y Contención de Desbordamiento:** En listados extensos, los días y registros deben contar con acordeones colapsables (`Accordion / Disclosure`) y scroll interno confinado para que el marco global de la página nunca desborde el alto del monitor. |
| **DM-16** | **Brain Up Comms: Chat por Clientes, Tiempo Real & Resumen Anti-Ruido** | **Plataforma de comunicación interna estilo Slack adaptada a la identidad corporativa de La Abuela.** Incorpora: <br>• **Doble Columna Izquierda + Lienzo Blanco:** Rail estrecho (64px) en fondo índigo `#191654` con accesos rápidos y estado de usuario online en verde `#3BB54A`; Sidebar de navegación (260px) con degradado corporativo `from-[#191654] to-[#8E0E75]` estructurado en *Mi Resumen*, *Clientes*, *Grupos Internos* y *Mensajes Directos*.<br>• **Panel Anti-Ruido ("Mi Resumen / Lo Importante de Hoy"):** Vista de aterrizaje inmediata al entrar a cualquier hora con las tareas pendientes por revisar asignadas al usuario, agrupadas por cliente con botón directo `Completar / Revisado`, novedades en canales y mensajes fijados clave.<br>• **Mensajes Accionables (Tareas):** Cualquier mensaje puede marcarse como tarea para un compañero o para uno mismo (`is_action_item`), destacándose en el chat con borde ciruela `#8E0E75`, fondo suave `#F8F6FC` y estado `Pendiente`/`Hecho` en `#3BB54A`.<br>• **Tiempo Real con Supabase Realtime:** Publicación activa en la tabla `messages` con suscripción WebSocket instantánea y fallback reactivo local.<br>• **Cero Emojis:** Cumplimiento total de DM-01 mediante iconografía SVG pura de Lucide React. |

---

## Sistema de Diseño e Identidad Gráfica

| Elemento Visual | Valor y Especificación Técnica |
|---|---|
| **Fondo Principal** | Blanco Puro `#FFFFFF` (sin modo oscuro) |
| **Fondos Secundarios** | Lila / Gris casi blanco `#F8F6FC` y Borde `#D8CFF0` (inspirado en el jersey de La Abuela) |
| **Color Primario** | Púrpura / Ciruela Corporativo `#8E0E75` (hover `#700B5C`) |
| **Degradado de Marca** | `linear-gradient(to right, #191654, #8E0E75)` (del índigo al ciruela del cronómetro) |
| **Titulares** | Gris Carbón `#292929` en combinación con palabras clave en `#8E0E75` (ExtraBold Mayúsculas) |
| **Cuerpo y Tablas** | `#4A4A4A` sobre blanco |
| **Color de Éxito** | Verde `#3BB54A` (hover `#32993E`) para "Exportar Excel" |
| **Alertas de Horas Faltantes** | Ámbar suave `#D97706` / `#FEF3C7` con icono de reloj/alerta |
| **Alertas de Horas Sobrantes** | Ciruela Corporativo `#8E0E75` / `#F3E8FF` con icono de exceso |
| **Tipografía** | `Montserrat` (Google Fonts) en toda la aplicación |
| **Botón Editorial** | `border: 1.5px solid #8E0E75`, fondo blanco, texto en mayúsculas `#8E0E75`, hover `#8E0E75` con texto blanco |
| **Alineación Horaria** | `font-variant-numeric: tabular-nums` en todos los contadores |
| **Logotipo** | Icono y avatar de "La Abuela" con el cronómetro Brain Up (`/public/logo.png`) |

---

## Stack Tecnológico

- **Frontend & Framework:** Next.js 14 (App Router), React 18, TypeScript (Modo Estricto).
- **Tipografía:** Montserrat (`next/font/google`).
- **Estilos:** Tailwind CSS con diseño líquido (`w-full`), sin márgenes laterales restrictivos.
- **Componentes Propios:** `AppSelect` (desplegables in-app con SVG) y `AppCalendar` (calendario interactivo in-app).
- **Iconografía:** Lucide React (Iconos SVG vectoriales limpios, sin emojis).
- **Base de Datos & Auth:** Supabase (PostgreSQL 15, Supabase Auth, Row Level Security - RLS).
- **Exportación de Datos:** `xlsx` (SheetJS con sentido humano) y `jspdf` + `jspdf-autotable` (con gráficos vectoriales de cuota).
- **Interoperabilidad de Calendario:** Generador nativo RFC 5545 iCalendar (`.ics`) e integración directa con plantillas URL de Google Calendar.
- **Despliegue:** Optimizado para la infraestructura Edge de Vercel.

---

## Módulo Brain Up TaskFlow & Calendario Nativo

El módulo **TaskFlow** (`/apps/taskflow`) constituye el centro operativo de planificación, reuniones y entregables de la agencia, complementando el control horario de Clockify:

1. **Vistas Conmutables de Calendario Nativo (Estilo Google Calendar / Asana):**
   - **Formato Tira de Colores con Selector RGB Libre:** Cada tarea o reunión se visualiza como una tira horizontal compacta. El usuario puede elegir libremente cualquier color mediante selector RGB / Hexadecimal nativo (`<input type="color">`), fila de "Colores más utilizados" o paleta corporativa, con vista previa en tiempo real.
   - **Listas de Tareas con Color Asignado:** Organización por listas temáticas (ej. *General*, *Creatividades & Diseño*, *Reuniones*, *Web & SEO*, *Cuotas*), creación de nuevas listas personalizadas y filtrado con 1 clic desde la barra superior.
   - **Auto-desplazamiento de Tareas No Completadas:** Opción configurable por tarea (`+1 día`, `+2 días`, etc.) para que los entregables pendientes que no se hayan finalizado se muevan automáticamente hacia adelante para conservarlos como recordatorio activo.
   - **Vista Semanal (`week`):** 7 columnas completas (Lun a Dom) idénticas al pantallazo de referencia, con resalte circular azul en el día de hoy, tiras apiladas y botón `+` para añadir tareas en cada día.
   - **Vista Diaria (`day`):** Enfoque detallado de jornada con resumen de horas estimadas, tiras de tareas del día y cronograma horario interactivo (08:00 a 20:00).
   - **Vista Mensual (`month`):** Cuadrícula mensual de 7 columnas con tiras de colores compactas, resalte de hoy y botón `+X más` para abrir el pop-up de desglose.
   - **Vista Anual (`year`):** Matriz panorámica de 12 mini-meses con indicadores de carga de trabajo y salto directo con un clic a cualquier fecha.
   - **Tablero Kanban y Vista Lista:** Modos adicionales para flujo ágil de tarjetas por columnas y auditoría en lista.
2. **Semántica de Prioridades (Limpia y Sin Etiquetas Redundantes):**
   - **Alta (`#DC2626`):** Entregables inmediatos, alertas críticas y reuniones prioritarias.
   - **Media (`#D97706`):** Tareas en curso y seguimiento habitual.
   - **Baja (`#10B981`):** Entregables completados con éxito y tareas de baja urgencia.
   - Erradicados textos redundantes como `(Rojo)` y `(Verde)` en botones, modales y popups.
3. **Exportación e Interoperabilidad:**
   - **Google Calendar:** Apertura en pestaña nueva de la plantilla oficial de Google Calendar pre-rellenada con asunto, horario, cliente y notas.
   - **iCalendar (.ics):** Descarga de archivo estándar para Outlook, Apple Calendar o sincronización móvil.
   - **Exportación Completa del Mes (.ics):** Descarga masiva de todas las tareas y citas del equipo con un solo clic.
4. **Colaboración y Espacio Privado:**
   - Posibilidad de marcar tareas como **Compartidas con el equipo** (seleccionando compañeros responsables) o **Personales / Privadas** (solo visibles para el creador).
   - Filtros de visualización: *Todas*, *Mis Tareas / Eventos*, *Compartidas con el Equipo* y *Solo Reuniones*.
5. **Conexión Directa con Clockify:**
   - Cada tarjeta e inspector incluye el botón **Clockify** para arrancar el cronómetro en vivo vinculado a la empresa y la descripción de la tarea de forma instantánea.

---

## Directriz Transversal: Mínimo Scroll Posible en Todas las Páginas (Zero-Scroll Viewport)

Siguiendo el mandato corporativo inmutable (**DM-15**), todas las interfaces de Brain Up Clockify están optimizadas para operar con el **mínimo scroll vertical posible**, priorizando la visibilidad integral de herramientas y métricas a pantalla completa:

1. **Modales de Creación y Edición Compactos (Zero-Scroll Modals):**
   - El modal de creación y edición en TaskFlow (`TaskModal`) está estructurado en **2 columnas paralelas compactas (`grid md:grid-cols-12`)**, integrando el conmutador de Tarea/Reunión en la cabecera y desplegando los datos de planificación (Título, Cliente, Prioridad, Fecha, Horas, Notas, Equipo) y personalización visual (Listas de tareas con selector rápido, selector libre RGB con código hex y pipeta, gama de 10 colores más utilizados en una sola fila compacta y auto-desplazamiento para tareas no completadas) a la vista simultánea.
   - Todo el modal se confina en menos de 420px de altura vertical, garantizando que tanto en pantallas estándar de portátiles (1366x768) como en monitores de alta resolución o con zoom del sistema operativo, el usuario visualice la totalidad del formulario y sus botones de guardado sin necesidad de desplazar la rueda del ratón ni usar barras de scroll.
2. **Control Horario de Trabajador (`/dashboard/employee`):**
   - El banner del cliente seleccionado, la barra de control de horas (`TimeTrackerBar`) con sus pop-ups desplegables in-app y el ticker de horas por cliente se organizan en un bloque vertical ultra-compacto que ocupa el tercio superior de la pantalla.
   - El historial de registros se agrupa por días con acordeones colapsables (`Accordion`), permitiendo al trabajador desplegar o plegar las jornadas pasadas según le convenga para mantener la pantalla despejada y sin scroll forzado.
3. **Panel de Coordinación (`/dashboard/coordinator`):**
   - Las tres perspectivas de análisis (Métricas Generales, Balance por Empresa y Rendimiento por Empleado) cuentan con selectores compactos en pestañas y controles integrados que evitan la sobrecarga vertical de la página.
4. **TaskFlow y Calendario Nativo (`/apps/taskflow`):**
   - La barra de navegación de vistas, el selector de listas temáticas con puntos de color y el calendario en cuadrícula líquida se ajustan dinámicamente al 100% del alto y ancho del viewport, con pop-ups emergentes semánticos para eventos extendidos sin alargar la página.

---

## Módulo Brain Up Comms & Chat por Clientes (Slack Style Anti-Ruido)

El módulo **Brain Up Comms** (`/apps/chat`) unifica la comunicación interna de la agencia eliminando el ruido y enfocando la conversación en las cuentas de clientes y tareas accionables:

1. **Arquitectura Visual de Tres Paneles (Slack Layout + La Abuela):**
   - **Rail 1 (64px):** `#191654` con avatar de La Abuela, selector de vista (Resumen, Clientes, Grupos, DMs), accesos cruzados a Clockify y TaskFlow, y avatar del usuario con indicador verde `#3BB54A` de conexión activa.
   - **Rail 2 (260px):** `bg-gradient-to-b from-[#191654] to-[#8E0E75]` con buscador rápido, acceso directo a *Mi Resumen (Lo Importante)* con badge de tareas pendientes, lista de canales de clientes (`# acme-marketing`, `# pont-assegurances`, etc.), grupos internos (`# general`, `# anuncios`) y DMs directos con compañeros.
   - **Lienzo Principal:** Fondo blanco puro `#FFFFFF`, títulos en gris carbón `#292929`, acentos en ciruela `#8E0E75` y acciones completadas en verde `#3BB54A`.

2. **Panel de Aterrizaje Anti-Ruido ("Mi Resumen / Lo Importante de Hoy"):**
   - **Para Hacer / Revisar por ti:** Lista consolidada de todos los mensajes con `is_action_item = true` asignados al usuario y no completados, con botón directo `Completar / Revisado` y salto al canal.
   - **Novedades en tus Clientes:** Tarjetas de empresas clientes con mensajes no leídos y contadores.
   - **Avisos Fijados Recientes:** Mensajes importantes con chincheta (`is_pinned`) para consulta rápida.

3. **Chat en Tiempo Real & Mensajes Accionables:**
   - Cabecera de canal con empresa vinculada y paneles deslizables de tareas pendientes y notas fijadas.
   - Tarjetas destacadas de tareas accionables dentro del propio flujo de conversación.
   - Caja de envío inteligente con selector de menciones `@compañero` y conmutador `Marcar como Tarea` con selector de responsable y prioridad (`Normal` o `Urgente`).
   - Sincronización automática con el motor de notificaciones global de la suite.

---

## Guía de Puesta en Marcha

### 1. Instalación de dependencias
```bash
npm install
```

### 2. Base de Datos en Supabase
1. Abre tu panel de control en [Supabase](https://supabase.com).
2. Entra en el **SQL Editor**.
3. Copia el contenido de [`schema.sql`](./schema.sql) para el módulo base de Clockify y pulsa **Run**.
4. Copia el contenido de [`schema_chat.sql`](./schema_chat.sql) para el módulo de chat en tiempo real y pulsa **Run**.
5. Configura tus claves en `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-clave-anon
   ```

### 3. Ejecución del Servidor Local
```bash
npm run dev
```
Accede desde tu navegador a [http://localhost:3000](http://localhost:3000).

---

## Historial y Modificaciones Futuras

Cualquier cambio, ampliación o ajuste debe documentarse inmediatamente en el archivo [`REGISTRO_MAESTRO.md`](./REGISTRO_MAESTRO.md) respetando la numeración y formato establecido.
