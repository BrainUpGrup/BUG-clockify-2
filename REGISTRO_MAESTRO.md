# REGISTRO MAESTRO DE CAMBIOS Y DECISIONES TÉCNICAS
## Proyecto: Brain Up Clockify
**Repositorio:** `BUG clockify`  
**Arquitectura:** Next.js (App Router) + TypeScript + Tailwind CSS + Supabase (PostgreSQL, Auth & RLS)  
**Propósito:** Sistema de control horario clasificado exclusivamente por empresa para uso interno de Brain Up Grup.

---

## Directrices Maestras Inmutables
1. **PROHIBICIÓN TOTAL DE EMOJIS:** Toda iconografía debe ser generada exclusivamente mediante iconos SVG (Lucide React). Queda prohibido el uso de emojis en opciones, textos, botones y código.
2. **CONTROLES PROPIOS IN-APP (SIN ELEMENTOS DE WINDOWS):** Todos los selectores desplegables (`AppSelect`) y calendarios (`AppCalendar`) son componentes propietarios de la aplicación construidos en React y Tailwind CSS, erradicando menús nativos del sistema operativo Windows, selectores con estilo OS y spinners de números.
3. **DISEÑO LÍQUIDO A PANTALLA COMPLETA:** La interfaz ocupa el 100% del ancho del viewport sin márgenes laterales vacíos (`max-w-7xl` suprimido), adaptándose con fluidez a cualquier tamaño de pantalla o porcentaje de zoom.
4. **MODELO EXCLUSIVO POR EMPRESA (SIN PROYECTOS):** La agencia no trabaja por proyectos. Todas las imputaciones de tiempo se realizan e informan directamente a la Empresa/Cliente.
5. **ROL DUAL PERPETUO:** El perfil del Coordinador tiene siempre facultades simultáneas de Trabajador (registro personal) y Coordinador (supervisión global).
6. **VELOCIDAD DE AGENCIA:** Los métodos de entrada de tiempo deben priorizar la agilidad al teclear (`3` = 3h, `330` = 3h 30m, edición directa inline).
7. **IDENTIDAD CORPORATIVA "LA ABUELA" (BRAIN UP GRUP):** Diseño visual luminoso sobre blanco puro (`#FFFFFF`) sin modo oscuro. Tono lila/gris casi blanco (`#F8F6FC`) con acento pastel (`#D8CFF0`), color primario ciruela corporativo `#8E0E75` (hover `#700B5C`), degradado de marca `from-[#191654] to-[#8E0E75]`, tipografía Google Fonts `Montserrat`, números en formato tabular (`tabular-nums`), botones secundarios editoriales y botón de éxito "Exportar Excel" en verde `#3BB54A`. Logotipo corporativo oficial de "La Abuela" en `/logo.png`.

---

## Historial Cronológico de Iteraciones

### [v1.0.0] - 2026-10-14 - Inicialización del MVP y Base de Datos
- **Arquitectura de Base de Datos:** Creación de tablas, trigger `on_auth_user_created`, función `is_coordinator()` con `SECURITY DEFINER`, políticas RLS completas y datos semilla.
- **Tipado e Infraestructura:** Definición de interfaces TypeScript y clientes SSR/Browser de Supabase.
- **Módulos de Exportación:** Exportación a Excel (.xlsx) con SheetJS y PDF (A4 apaisado) con jsPDF + AutoTable.

### [v1.1.0] - 2026-10-14 - Acceso Directo y Supresión de Barrera de Login
- **Solicitud del Usuario:** Ocultar el login y entrar directamente como Coordinador.
- **Decisión Técnica:** Inicialización con `Alejandro Ramos` y bypass automático desde `/` y `/login`.

### [v1.2.0] - 2026-10-14 - Arquitectura de Rol Dual (Coordinador & Trabajador)
- **Solicitud del Usuario:** El coordinador debe poder ser trabajador y coordinador al mismo tiempo.
- **Decisión Técnica:** Acceso simultáneo desde la barra de navegación a *Mi Registro Horario* (trabajador) y *Panel Coordinador* (supervisión global).

### [v1.3.0] - 2026-10-14 - Eliminación de Borrado y Edición Directa de Horas
- **Solicitud del Usuario:** Eliminar el botón de borrar horarios y permitir editar directamente el tiempo de uso haciendo clic encima.
- **Decisión Técnica:** Supresión del botón de papelera e implementación de edición inline directa en el tiempo y descripción con guardado en `Enter`/`blur`.

### [v1.4.0] - 2026-10-14 - Interpretación de Números Directos como Horas
- **Solicitud del Usuario:** Un número directo como `3` debe computar como 3 horas (`3h`).
- **Decisión Técnica:** Ajuste en `parseDurationToMinutes`: enteros directos se multiplican por 60 min.

### [v1.5.0] - 2026-10-14 - Shorthand de Velocidad para Jornadas (> 8 Horas: `330` -> `3h 30m`)
- **Solicitud del Usuario:** Si se introduce un número superior a 8 (ej. `330`), interpretarlo como horas y minutos (`3h 30m`).
- **Decisión Técnica:** Reconocimiento de 3-4 dígitos HMM/HHMM (`330` = 3h 30m, `145` = 1h 45m, `830` = 8h 30m).

### [v1.6.0] - 2026-10-14 - Erradicación de Emojis y Estandarización Nativa
- **Solicitud del Usuario:** Cero emojis (solo SVGs) y que todos los desplegables y calendarios sean 100% nativos.
- **Decisión Técnica:** Eliminación de emojis de todo el código fuente, validación de controles nativos HTML5 y creación de `README.md` y `REGISTRO_MAESTRO.md`.

### [v1.7.0] - 2026-10-14 - Diseño Líquido al 100% y Modelo Centrado Exclusivamente en Empresas
- **Solicitud del Usuario:**
  1. Ocupar toda la pantalla, eliminar barras laterales con efecto líquido adaptable al tamaño y porcentaje de zoom de la pantalla.
  2. Eliminar el apartado de proyectos y trabajar exclusivamente por empresas/clientes (independientemente del trabajo realizado, se imputa directamente a la empresa).
- **Decisión Técnica:**
  - **Efecto Líquido (Full-Width 100%):** Se sustituyen todos los contenedores con límites rígidos (`max-w-7xl`) por un diseño líquido fluido (`w-full max-w-none px-4 sm:px-6 lg:px-8`). Tablas, filtros, tarjetas y cabeceras aprovechan el 100% del ancho del viewport independientemente de la resolución o nivel de zoom.
  - **Eliminación Total de Proyectos:**
    - `src/types/database.ts`: Se elimina la entidad `Project` de la clasificación de horas; `time_entries` se asocia directamente a `company_id: string` y `company?: Company`.
    - `schema.sql`: Se actualiza la tabla `time_entries` con clave foránea directa a `companies(id)`.
    - `src/components/employee/time-tracker-bar.tsx`: Desplegable simplificado nativo que muestra exclusivamente la lista de empresas activas.
    - `src/components/employee/time-entries-list.tsx`: Las filas muestran la etiqueta de Empresa/Cliente sin división por proyectos.
    - `src/components/coordinator/monthly-reports.tsx`: Se elimina el filtro y las columnas de proyectos en la Matriz de Resumen y el Listado Detallado; los cálculos y sumatorios se agrupan por `Empleado x Empresa`.
    - `src/components/coordinator/company-crud.tsx`: Componente enfocado exclusivamente en el alta, archivo y gestión de empresas/clientes.
    - `src/lib/export-reports.ts`: Informes de Excel (.xlsx) y PDF apaisados actualizados para mostrar exclusivamente la clasificación por Empresa.

### [v1.8.0] - 2026-10-14 - Componentes In-App Propios de la Aplicación (AppSelect y AppCalendar)
- **Solicitud del Usuario:**
  1. No usar selectores del sistema operativo Windows ni calendarios por defecto del navegador.
  2. Desarrollar modelos y componentes de interfaz específicos para la aplicación con identidad visual coherente y estilizada.
  3. Integrar la directriz en el `README.md` y en todos los controles interactivos.
- **Decisión Técnica:**
  - **Desarrollo de `AppSelect` (`src/components/ui/app-select.tsx`):** Menú desplegable flotante con elevación visual (`shadow-xl`), bordes curvos suaves (`rounded-xl`), Chevron interactivo que rota con animación (`rotate-180`), estado activo, indicador de selección con icono de verificación (`Check`), soporte para iconos SVG personalizados por opción y cierre inteligente al hacer clic fuera o pulsar la tecla `Escape`.
  - **Desarrollo de `AppCalendar` (`src/components/ui/app-calendar.tsx`):** Selector interactivo de fechas in-app con navegación fluida entre meses y años mediante botones SVG (`ChevronLeft`, `ChevronRight`). Nombres de días y meses en español ('Enero' a 'Diciembre', 'Lu' a 'Do'). Cuadrícula de 7 columnas alineada con el primer día del mes. Detección y resaltado del día actual y de la fecha seleccionada. Botones de acceso rápido "Hoy" y "Ayer" para registrar jornadas anteriores al instante.
  - **Reemplazo Transversal:** `TimeTrackerBar`, `TimeEntriesList` y `MonthlyReports`. Erradicación completa de selectores y datepickers de Windows.

### [v1.9.0] - 2026-10-14 - Identidad Visual Corporativa "La Abuela" - Brain Up Grup
- **Solicitud del Usuario:**
  1. Configurar el diseño visual (`tailwind.config.ts` y estilos globales) siguiendo estrictamente la identidad luminosa de la web de Brain Up Grup (sin modo oscuro, limpio sobre blanco puro).
  2. Paleta de colores exacta: Fondo blanco puro `#FFFFFF`, secciones secundarias lila/gris `#F8F6FC` y acento `#D8CFF0` (inspirado en el jersey de La Abuela). Color primario púrpura/ciruela `#8E0E75` (hover `#700B5C`), degradado de marca `from-[#191654] to-[#8E0E75]`. Títulos en carbón `#292929` y `#8E0E75` en mayúsculas ExtraBold. Texto de cuerpo `#4A4A4A`. Color de éxito `#3BB54A` para "Exportar Excel".
  3. Tipografía `Montserrat` (Google Fonts), botones secundarios editoriales (`border: 1.5px solid #8E0E75`), contadores horarios con `tabular-nums`.
  4. Incorporar el logotipo de "La Abuela" con el cronómetro Brain Up como logo principal de la aplicación.
  5. Reflejar todo en `README.md` y `REGISTRO_MAESTRO.md`.
- **Decisión Técnica:**
  - `public/logo.png`: Se copia la ilustración oficial de "La Abuela" dentro del cronómetro Brain Up en alta resolución para su uso en cabecera, favicon y páginas de bienvenida.
  - `tailwind.config.ts`: Configurada la paleta completa corporativa (`primary: #8E0E75`, `hover: #700B5C`, `brand: 50..900`, `charcoal: #292929`, `body: #4A4A4A`, `success: #3BB54A`, degradados `brand-gradient` e integración con la variable de fuente `Montserrat`).
  - `src/app/globals.css`: Definición de clases de utilidad para botones editoriales (`btn-editorial-secondary`, `btn-editorial-primary`), scrollbars personalizados en tonos La Abuela (`#D8CFF0` / `#8E0E75`) y soporte numérico tabular (`tabular-nums`).
  - `src/app/layout.tsx`: Inyección de la fuente Google Fonts `Montserrat` (pesos 300 a 800) como tipografía base de toda la aplicación, metadata con título de Brain Up y favicon oficial.
  - `src/components/navbar.tsx`: Cabecera renovada con el logotipo de "La Abuela", título corporativo `BRAIN UP CLOCKIFY`, pestañas activas con estilo editorial ciruela y avatar del usuario con degradado de marca `from-[#191654] to-[#8E0E75]`.
  - `src/components/employee/time-tracker-bar.tsx`: Titular "CONTROL DE HORAS", botón de temporizador activo con degradado corporativo, dígitos en `tabular-nums` y botones editoriales.
  - `src/components/employee/time-entries-list.tsx`: Tarjetas limpias sobre blanco con acentos lila, etiquetas de cliente estilizadas, edición directa y horas tabulares.
  - `src/components/employee/employee-stats.tsx`: Métricas de jornada en tarjetas blancas con bordes pastel `#D8CFF0`, números grandes en carbón `#292929` y barras de progreso en ciruela y verde éxito.
  - `src/components/coordinator/monthly-reports.tsx`: Botón "Exportar Excel" en verde de éxito `#3BB54A`, botón "Descargar PDF" en estilo editorial ciruela, tabla de resumen matricial con tipografía Montserrat y porcentajes en ciruela corporativo.
  - `src/components/coordinator/company-crud.tsx`: Formulario de creación de clientes y listado de empresas con botones editoriales y estados activos.
  - `src/components/ui/app-select.tsx` & `src/components/ui/app-calendar.tsx`: Selectores y calendarios in-app adaptados con la paleta lila/ciruela de Brain Up Grup.

### [v1.9.1] - 2026-10-14 - Corrección del Layout de Cabecera y Eliminación de "Modo Directo"
- **Solicitud del Usuario:**
  1. Eliminar el bloque de "Modo Directo" de la cabecera.
  2. Corregir desajustes de layout en la barra superior (textos sobrepuestos o desfasados por los lados).
- **Decisión Técnica:**
  - `src/components/navbar.tsx`:
    - Eliminado el elemento `Modo Directo`.
    - Pestañas de navegación optimizadas con títulos concisos (`Mi Registro Horario` y `Panel Coordinador`) y clase `whitespace-nowrap`, evitando el salto de línea que hacía que la tarjeta activa desbordara los 64px de altura del header.
    - Simplificación del perfil de usuario a la derecha, manteniendo avatar con degradado de marca y tipografía Montserrat perfectamente alineada verticalmente.
  - `src/app/dashboard/employee/page.tsx` & `src/app/dashboard/coordinator/page.tsx`:
    - Eliminadas las cajas redundantes y pills desalineadas en la subcabecera, unificando el titular con iconografía ciruela y espaciado líquido consistente.

### [v2.0.0] - 2026-10-14 - Suite de Coordinación: Altas de Usuarios, Clientes Cuota (Horas Faltantes/Sobrantes) y Estadísticas Profesionales
- **Solicitud del Usuario:**
  1. **Creación de Cuentas por el Coordinador:** El coordinador debe poder dar de alta usuarios/empleados para el equipo.
  2. **Modelo de Clientes Cuota vs. Clientes Puntuales:**
     - Al crear la empresa, el coordinador selecciona si es Cliente Cuota o Cliente Puntual.
     - Si es Cliente Cuota, se fija una cuota horaria mensual (ej. 15h) que debe cumplirse al milímetro:
       - Si se llevan menos horas que la cuota: mostrar mensaje destacado de **"Horas faltantes"** con el tiempo restante.
       - Si se supera la cuota: mostrar mensaje de **"Horas sobrantes"** con el exceso de tiempo.
       - Si coincide con exactitud: mostrar **"Cuota cumplida al milímetro"**.
     - Los empleados al imputar horas para un cliente cuota deben poder elegir entre:
       - **Horas de Cuota:** Computan a la bolsa mensual de la empresa.
       - **Trabajo Puntual / Extra:** Trabajos adicionales que no restan/suman a la cuota mensual, pero sí computan al total general de trabajo realizado.
  3. **Estadísticas Profesionales:**
     - Implementar 3 perspectivas estadísticas:
       - **Estadísticas Generales:** Visión global de la agencia, horas totales, cuota vs puntual y salud de cuotas de todos los clientes.
       - **Estadísticas por Empresa:** Ficha de empresa, balance exacto de cuota, equipo que ha intervenido y detalle de tareas.
       - **Estadísticas por Empleado:** Desglose individual de rendimiento, dedicación por cliente y cronología de tareas.
  4. **Exportaciones Nativas Personalizadas:**
     - **PDF:** Plantillas nativas apaisadas en jsPDF con la identidad gráfica de Brain Up Grup y un **gráfico vectorial nativo de Horas Faltantes y Horas Sobrantes** frente a la cuota pactada y total de trabajo general.
     - **Excel con Sentido Humano:** Hojas organizadas con títulos limpios, cabeceras legibles, anchos calibrados y pestañas independientes ("Balance Cuotas Clientes", "Registro Detallado", "Rendimiento por Empleado").
- **Decisión Técnica:**
  - `src/types/database.ts`:
    - Tipos `ClientType = 'cuota' | 'puntual'` y `EntryComputeType = 'cuota' | 'puntual'`.
    - Campos `client_type` y `monthly_hours_quota` en `Company`.
    - Campo `compute_type` en `TimeEntry`.
  - `schema.sql`:
    - Tablas de Supabase actualizadas con columnas `client_type`, `monthly_hours_quota` y `compute_type`.
  - `src/components/coordinator/user-management.tsx`:
    - Componente interactivo para crear usuarios con nombre, email corporativo y rol (`employee` o `coordinator`), visualización del equipo y horas totales.
  - `src/components/coordinator/company-crud.tsx`:
    - Formulario ampliado para seleccionar entre Cliente Cuota (con input de horas mensuales) y Cliente Puntual, y tabla de empresas con desglose de cuota pactada y balance.
  - `src/components/employee/time-tracker-bar.tsx` & `src/components/employee/time-entries-list.tsx`:
    - Detección reactiva de clientes cuota: al seleccionarse, se despliega el interruptor interactivo `Horas de Cuota` vs `Trabajo Puntual / Extra`.
    - En la lista de entradas, badge interactivo que permite alternar el tipo de imputación al vuelo.
  - `src/components/coordinator/monthly-reports.tsx`:
    - Suite de estadísticas con 3 sub-pestañas: `Estadísticas Generales`, `Por Empresa / Cliente` y `Por Empleado`.
    - Tarjetas KPI, barras de progreso y cálculo exacto de **"Horas faltantes: Xh Ym"** y **"Horas sobrantes: Xh Ym"**.
  - `src/lib/export-reports.ts`:
    - Funciones `exportGeneralReportToPDF/Excel`, `exportCompanyReportToPDF/Excel`, `exportEmployeeReportToPDF/Excel`.
    - Gráfico vectorial nativo dibujado con primitivas de `jsPDF` (`roundedRect`, `rect`, líneas de meta y badges de estado).
  - `src/app/dashboard/coordinator/page.tsx`:
    - Pestañas principales de navegación: `Estadísticas e Informes`, `Gestión de Empresas` y `Gestión de Usuarios`.

### [v2.1.0] - 2026-10-14 - Registro de Empleados vía Enlace con Aprobación del Coordinador e Informes PDF en Vertical con Ficha de Cliente
- **Solicitud del Usuario:**
  1. **Registro por Enlace de Empresa:** Suprimir el formulario de alta manual de empleados. Proporcionar un enlace oficial de la empresa copiable para que el empleado se registre por su cuenta.
  2. **Flujo de Aprobación por el Coordinador:** Una vez registrado el empleado vía enlace, su cuenta queda en estado pendiente; el coordinador debe aceptar al empleado para que pase a estar activo en la agencia.
  3. **Rediseño Integral de PDFs en Vertical (Portrait):**
     - Generar todos los informes en orientación vertical (A4 Portrait, 210 x 297 mm) en lugar de horizontal apaisado.
     - Erradicar solapamientos de texto de la leyenda en el gráfico de cuotas.
     - Incluir **información detallada del cliente** en todos los informes: Razón Social, CIF/NIF, Contacto, Email, Modelo Comercial, Cuota pactada y Account Manager en Brain Up Grup.
     - Estética ejecutiva de alta gama acorde al manual de diseño de Brain Up Grup.
- **Decisión Técnica:**
  - `src/types/database.ts`:
    - Incorporado `ProfileStatus = 'active' | 'pending' | 'rejected'` y campo opcional `department` en `Profile`.
    - Incorporados campos `cif`, `contact_name`, `contact_email` y `account_manager` en `Company`.
  - `src/app/register/page.tsx`:
    - Nueva página pública de registro de empleados vía invitación con estética corporativa "La Abuela", captura de datos y confirmación de estado pendiente de validación.
  - `src/components/coordinator/user-management.tsx`:
    - Eliminado el alta manual de empleados.
    - Tarjeta superior con el **Enlace Oficial de Empresa** con botón de copiado al portapapeles y enlace de prueba.
    - Sección de **"Solicitudes Pendientes de Aprobación"** con botones de acción inmediata: **"Aceptar Empleado"** (activa la cuenta) y **"Rechazar"**.
    - Sección de **"Equipo Activo de la Agencia"** para control de cuentas habilitadas.
  - `src/app/dashboard/coordinator/page.tsx`:
    - Handlers `handleApproveUser` y `handleRejectUser` conectados a Supabase y al estado local sincronizado con `localStorage`.
  - `src/components/coordinator/company-crud.tsx`:
    - Formulario ampliado con soporte para CIF y datos de persona de contacto.
  - `src/lib/export-reports.ts`:
    - Reescritura completa de todas las funciones de exportación PDF (`exportGeneralReportToPDF`, `exportCompanyReportToPDF`, `exportEmployeeReportToPDF`) en formato **A4 Vertical (210 x 297 mm)**.
    - Incorporada la **Ficha Oficial del Cliente** con dos columnas de información exhaustiva (CIF, Contacto, Email, Modalidad, Cuota y Account Manager).
    - Gráfico vectorial de cuotas rediseñado en tarjetas limpias sin colisión de textos entre títulos y leyendas.


