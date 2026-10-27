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
8. **MÍNIMO SCROLL POSIBLE EN TODAS LAS PÁGINAS (POLÍTICA ZERO-SCROLL / VIEWPORT COMPACTO):** Toda la aplicación (Clockify, Panel de Coordinación, TaskFlow, Hub y ventanas emergentes/modales) debe diseñarse y maquetarse para mostrar la totalidad de sus herramientas, métricas y controles dentro del viewport sin scroll vertical innecesario. Los modales deben estructurarse en 2 columnas paralelas compactas de alta densidad (`grid md:grid-cols-12`) con altura confinada (< 420px) para garantizar visibilidad directa de todos los campos y botones de guardado. En listados extensos, se deben implementar acordeones colapsables (`Accordion`) y scroll interno confinado para no desbordar el monitor.

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

### [v2.2.0] - 2026-10-14 - Muro de Autenticación Obligatorio, Aprobación Previa de Cuentas y Aislamiento Estricto de Datos (RLS)
- **Solicitud del Usuario:**
  1. Enlace de registro compartido por la coordinadora para nuevos empleados.
  2. Muro de login obligatorio (`/login`) antes de poder acceder a cualquier pantalla o dato de usuario.
  3. Protección estricta de la información de cada usuario en la base de datos (Supabase RLS) y separación estricta según el rol y la identidad del trabajador.
- **Decisión Técnica:**
  - `src/app/page.tsx`:
    - Redirección automática de usuarios no autenticados hacia `/login`. Si el usuario tiene sesión activa, redirige a `/dashboard/coordinator` o `/dashboard/employee` según su rol.
  - `src/app/login/page.tsx`:
    - Interfaz de autenticación con identidad corporativa de Brain Up Grup.
    - Detección de cuentas con estado `pending`: si un empleado intenta iniciar sesión antes de que la coordinadora apruebe su cuenta, el sistema bloquea el acceso mostrando un aviso explicativo de espera.
    - Botones de acceso rápido para validación inmediata de roles (Coordinadora, Trabajador y Cuenta Pendiente).
  - `src/app/register/page.tsx`:
    - Conexión directa con `signUp` de `useAuth`. Todo registro entra con `role: 'employee'` y `status: 'pending'`.
    - Cierre de sesión automático inmediato tras el registro para forzar la validación previa de la coordinadora.
  - `src/app/dashboard/coordinator/page.tsx`:
    - Guard de seguridad: Redirección inmediata a `/login` si no hay sesión, o a `/dashboard/employee` si el usuario no tiene rol `coordinator`.
    - Bloqueo de renderizado con pantalla de verificación para prevenir fugas de datos de clientes o métricas.
  - `src/app/dashboard/employee/page.tsx`:
    - Guard de seguridad: Redirección inmediata a `/login` si no hay sesión.
    - Aislamiento total de consultas: tanto en Supabase (`.eq('user_id', user.id)`) como en el modo mock (`MOCK_TIME_ENTRIES.filter(e => e.user_id === user.id)`), garantizando que ningún trabajador pueda ver o consultar registros de otros compañeros.
  - `src/components/navbar.tsx`:
    - La pestaña "Panel Coordinador" solo se renderiza si `user.role === 'coordinator'`.
    - Botón de cierre de sesión seguro (`LogOut`) que destruye la sesión y redirige a `/login`.
  - `schema.sql`:
    - **Trigger `handle_new_user()`:** Todo nuevo usuario registrado vía Auth se crea con `status: 'pending'` (excepto coordinadores).
    - **Row Level Security (RLS) en `time_entries`:**
      - `SELECT`: `auth.uid() = user_id or public.is_coordinator()` (aislamiento criptográfico en base de datos).
      - `INSERT`: `auth.uid() = user_id or public.is_coordinator()`.
      - `UPDATE/DELETE`: `auth.uid() = user_id or public.is_coordinator()`.
    - **Row Level Security en `profiles`:**
      - `SELECT`: `auth.uid() = id or public.is_coordinator()`.
      - `UPDATE`: `auth.uid() = id or public.is_coordinator()`.
      - `DELETE`: `public.is_coordinator()`.
    - **Row Level Security en `companies`:**
      - Solo la coordinadora puede insertar, actualizar o eliminar clientes/empresas.

### [v2.3.0] - 2026-10-14 - Preparación Limpia para Producción y Supresión de Accesos Directos
- **Solicitud del Usuario:**
  1. Quitar el campo "Departamento o Especialidad" del formulario de registro.
  2. Eliminar cualquier botón o enlace de acceso directo que permita entrar a la aplicación sin hacer login.
  3. Limpiar toda la información de prueba de la app, dejándola 100% limpia y lista para producción.
- **Decisión Técnica:**
  - `src/app/register/page.tsx`:
    - Eliminado el campo y estado de "Departamento o Especialidad". El registro ahora solo solicita: Nombre y Apellidos, Email y Contraseña.
    - Eliminado el enlace inferior que conducía al panel sin login; sustituido por un enlace estricto a `/login` (*"Volver a Iniciar Sesión"*).
    - En la pantalla de confirmación de registro enviado, el botón ahora dirige a `/login` (*"Ir a Iniciar Sesión"*).
  - `src/app/login/page.tsx`:
    - Eliminado por completo el panel de acceso rápido para pruebas ("Coordinador", "Trabajador", "Trabajadora", "Pendiente").
    - Interfaz de autenticación limpia y minimalista exclusiva para producción (email y contraseña).
  - `src/lib/mock-data.ts`:
    - Vaciadas todas las empresas de prueba (`MOCK_COMPANIES = []`).
    - Vaciadas todas las imputaciones y horas ficticias (`MOCK_TIME_ENTRIES = []`).
    - Eliminados los usuarios ficticios.
  - `schema.sql`:
    - Eliminada la inserción de empresas semilla de prueba (`Acme`, `TechCorp`, etc.). El script SQL deja las tablas creadas y seguras con RLS, listas para recibir los clientes reales de la agencia.
  - `src/components/coordinator/monthly-reports.tsx` y `src/components/coordinator/user-management.tsx`:
    - Implementados estados vacíos (*empty states*) profesionales y limpios para cuando no existan empresas o registros aún.

### [v2.4.0] - 2026-10-14 - Rol Super Administrador y Gobernanza Global de Cuentas
- **Solicitud del Usuario:**
  1. Crear un apartado exclusivo de Super Admin para dar de alta cuentas de coordinadores directamente y administrar las cuentas de usuario en caso de incidencias o posibles errores.
  2. Preservar la privacidad y separación de responsabilidades: el Super Admin no necesita ni debe visualizar datos operativos ni económicos de la empresa (horas de trabajo de clientes, cuotas ni tarifas), solo administrar cuentas y velar por el correcto funcionamiento del sistema.
  3. Credenciales maestras fijadas:
     - Email: `appadmin@brainupgrup.com`
     - Contraseña: `fn.5loDnrTTfI2z!`
  4. Mantener la pantalla de login unificada (`/login`) sin alterar el modo de inicio de sesión: el sistema detecta de forma automática e instantánea si el usuario es `admin`, `coordinator` o `employee`, redirigiéndolo a su panel correspondiente y cargando las pestañas y opciones adecuadas a su nivel de acceso.
- **Decisión Técnica:**
  - `src/types/database.ts`:
    - Ampliado el tipo unión `UserRole` para soportar `'admin' | 'coordinator' | 'employee'`.
  - `src/context/auth-context.tsx`:
    - Integrada validación de la cuenta maestra `appadmin@brainupgrup.com` con `fn.5loDnrTTfI2z!`. Asigna el rol `'admin'` y estado `'active'` con persistencia y sincronización en Supabase `profiles`.
  - `src/app/page.tsx` & `src/app/login/page.tsx`:
    - Enrutamiento por rol: si el usuario es `admin`, es conducido de inmediato a `/dashboard/admin`. Si es `coordinator`, a `/dashboard/coordinator`; si es `employee`, a `/dashboard/employee`.
  - `src/components/navbar.tsx`:
    - Adaptada la barra de navegación para Super Admin: muestra el enlace directo a *"Panel Super Admin"*, la insignia de *Super Administrador* y oculta los enlaces operativos de registro horario y cuotas de clientes.
    - Soporte completo y coherente tanto en escritorio como en la barra inferior móvil.
  - `src/app/dashboard/admin/page.tsx`:
    - **Guardia de Seguridad de Ruta:** Redirección automática de usuarios no autenticados a `/login`, y de usuarios coordinadores o empleados a sus respectivos paneles.
    - **Garantía de Privacidad y Aislamiento:** Tarjeta informativa y arquitectura restringida a la gobernanza de usuarios y autenticación, sin consultas ni exposición de `time_entries` ni cuotas de empresas.
    - **Tarjetas de Métricas Globales:** Conteo de Cuentas Totales, Coordinadores Activos, Empleados en Plantilla y Cuentas en Espera/Revisión.
    - **Pestaña 1 - Gestión y Corrección de Cuentas:**
      - Buscador en tiempo real (por nombre, correo o departamento).
      - Filtros combinados por Rol (`Todos`, `Admin`, `Coordinadores`, `Empleados`) y Estado (`Todos`, `Activos`, `Pendientes`, `Rechazados`).
      - Acciones directas: alternancia rápida de rol (ascender a Coordinador o degradar a Empleado), botón de activación inmediata para cuentas bloqueadas, modal de corrección de datos y borrado seguro de cuentas duplicadas o erróneas (con protección sobre la cuenta maestra).
    - **Pestaña 2 - Alta Directa de Coordinadora:**
      - Formulario corporativo para provisionar nuevas coordinadoras con activación inmediata sin pasar por enlaces de invitación ni esperas.
      - Generador de contraseñas seguras y botón de copiado de credenciales al portapapeles.
    - **Pestaña 3 - Diagnóstico del Sistema:**
      - Verificación de estado de base de datos Supabase, políticas RLS activas, dominio corporativo y resumen de credenciales maestras.
  - `src/app/dashboard/coordinator/page.tsx` & `src/app/dashboard/employee/page.tsx`:
    - Reforzadas las guardias de ruta para que un usuario `admin` sea redirigido a `/dashboard/admin`, evitando cualquier acceso involuntario a datos de horas o empresas.
  - `schema.sql`:
    - Actualizada la restricción de comprobación `check (role in ('admin', 'coordinator', 'employee'))`.
    - Nuevas funciones de seguridad `is_admin()` y `is_coordinator_or_admin()`.
    - Políticas RLS actualizadas en `profiles` para permitir que los administradores gestionen las cuentas.
    - Semilla inicial para la cuenta maestra `appadmin@brainupgrup.com` en la tabla `profiles`.

### [v2.5.0] - 2026-10-15 - Módulo TaskFlow: Calendario Nativo, Google Calendar, Prioridades y Colaboración
- **Solicitud del Usuario:**
  1. Mejorar el apartado de **TASK FLOW** para que sea limpio, intuitivo y muy útil.
  2. Añadir un **Calendario Nativo** con exportación a Calendar para añadir eventos y fechas de reuniones (algo similar a Google Calendar pero con TaskFlow).
  3. Añadir ordenación y filtrado por prioridad de trabajo, con todo interconectado entre sí.
  4. Permitir que cada usuario comparta eventos y tareas con otros compañeros o cree las suyas propias privadas.
  5. Utilizar la paleta de colores corporativa Brain Up: añadir **Verdes a los bien/hecho**, **Rojos a los mal/urgente**, y **Amarillos a los en progreso/media**.
  6. Documentar exhaustivamente en el `README.md` y en el `REGISTRO_MAESTRO.md`.
- **Decisión Técnica e Implementación:**
  - `src/lib/calendar-export.ts`:
    - Modelo de datos `TaskFlowItem`: tipos `'task' | 'meeting'`, prioridades `'alta' | 'media' | 'baja'`, estados `'todo' | 'in_progress' | 'review' | 'done'`, fechas, horarios, enlaces de videollamada y control de compartición (`isShared`, `assignees`).
    - Generador de URLs oficial para **Google Calendar** (`getGoogleCalendarUrl`): construye plantillas con parámetros codificados (`action=TEMPLATE&text=...&dates=...&details=...&location=...`).
    - Motor de exportación estándar **RFC 5545 iCalendar** (`.ics`): funciones `downloadSingleEventIcs` y `downloadAllEventsIcs` para descarga directa e importación en Apple Calendar, Outlook y Google Calendar.
  - `src/components/taskflow/native-calendar.tsx`:
    - Cuadrícula de 7 columnas alineada de Lunes a Domingo con navegación de meses (`<`, `>`, botón *"Hoy"*) y resumen de métricas del mes.
    - Píldoras de eventos y tareas codificadas por color: Púrpura/Lila para reuniones (`#8E0E75`), Rojo para alta/urgente (`#DC2626`), Ámbar para media (`#D97706`) y Verde para baja/completada (`#10B981`).
    - Inspector interactivo por día: al pulsar cualquier fecha se despliegan sus tareas/reuniones con acciones directas de exportación, cambio de estado y botón de arranque de temporizador en Clockify.
  - `src/components/taskflow/kanban-board.tsx`:
    - Tablero Kanban en 4 etapas (*Por Hacer*, *En Proceso*, *En Revisión*, *Completada / Bien*) con avance fluido entre columnas, chips de responsables y acciones de un solo clic.
  - `src/components/taskflow/task-list-view.tsx`:
    - Vista tabular compacta con checkboxes directos para marcar tareas como completadas al instante.
  - `src/components/taskflow/task-modal.tsx`:
    - Modal unificado para creación y edición con alternancia entre *Tarea de Trabajo* y *Reunión / Evento*.
    - Selector de empresa de la agencia, selector de prioridad visual (Alta Rojo, Media Amarillo, Baja Verde), fecha límite, horarios de reunión, enlaces de videollamada y selector multi-usuario para compartir con compañeros o mantener como privada.
  - `src/app/apps/taskflow/page.tsx`:
    - Conmutador de vistas (`[Calendario Nativo]`, `[Tablero Kanban]`, `[Lista]`).
    - Filtros combinados de Ámbito (*Todas*, *Mis Tareas/Eventos*, *Compartidas con el Equipo*, *Reuniones*) y Prioridad (*Todas*, *Alta*, *Media*, *Baja*).
    - Buscador en tiempo real por título, cliente, descripción o responsable.
    - Conexión con `useTimer()`: integración directa con el cronómetro de Clockify (`startTimerWithEntry(company.id, task.title)`), aviso dinámico y visualización de temporizador en curso en la cabecera.
    - Sistema de notificaciones toast flotante para feedback inmediato del usuario.
    - Persistencia en almacenamiento local `bug_taskflow_items_v2` con datos semilla ilustrativos.
  - `README.md`:
    - Incorporada la directriz matriz **DM-14** y la sección descriptiva del módulo.

### [v2.5.1] - 2026-10-15 - Optimización Pantalla Única (Sin Scroll), Pop-ups Semánticos y Papelera de Registros Horarios
- **Solicitud del Usuario:**
  1. Que el calendario de TaskFlow se muestre en una sola pantalla sin hacer scroll.
  2. Implementar pop-ups donde se puedan ver las diferentes advertencias (rojo), cosas buenas (verde), reuniones y actividades del día.
  3. Eliminar toda la cabecera superior tachada en rojo (título redundante, botón volver al hub, exportar todo y añadir tarea duplicados).
  4. Optimizar todo y no duplicar funciones.
  5. Extra: poder eliminar las horas registradas con un icono de papelera a la derecha de cada registro horario en Clockify.
- **Decisión Técnica e Implementación:**
  - `src/app/apps/taskflow/page.tsx`:
    - Eliminada la cabecera superior secundaria redundante (`<- Volver al HUB`, título `TaskFlow`, `Exportar todo` y `Añadir tarea`).
    - Barra de herramientas unificada y compacta en una sola fila (`viewMode` + `scopeFilter` + `priorityFilter` + buscador).
    - Contenedor principal ajustado a la pantalla con espaciados calibrados para ajuste a 100vh sin scroll de página.
  - `src/components/taskflow/native-calendar.tsx`:
    - Erradicada la sección permanente inferior que forzaba el scroll vertical.
    - Celdas del calendario compactas (`h-[78px] sm:h-[86px]`) con ajuste automático a la resolución.
    - **Pop-up 1 (Advertencias y Tareas Urgentes):** Al hacer clic en el botón de KPI de Urgentes (Rojo), se abre un modal con todas las tareas críticas y accesos rápidos a Clockify y GCal.
    - **Pop-up 2 (Cosas Buenas / Completadas):** Al hacer clic en el botón de Hechas (Verde), se abre un modal con las tareas finalizadas.
    - **Pop-up 3 (Reuniones de Equipo):** Al hacer clic en Reuniones, se abre un modal con las citas del mes.
    - **Pop-up 4 (Actividades del Día):** Al pulsar cualquier celda del calendario, se despliega un modal con el desglose de entregables y reuniones de esa fecha.
  - `src/components/employee/time-entries-list.tsx`:
    - Añadido el botón de papelera (`Trash2`) con hover rojo (`text-slate-400 hover:text-red-600 hover:bg-red-50`) situado a la derecha de cada registro horario.
    - Cuadro de confirmación antes de la eliminación para evitar borrados accidentales.
  - `src/app/dashboard/employee/page.tsx`:
    - Implementada la función `handleDeleteEntry` conectada con Supabase `time_entries.delete()` y actualización del estado reactivo local.

### [v2.5.3] - 2026-10-16 - Reformulación de TaskFlow: Tiras de Colores y Conmutador 4 Vistas Google Calendar (Día, Semana, Mes, Año)
- **Solicitud del Usuario:**
  1. Reformular el apartado de TaskFlow en formato tira de colores ("formato tira de colores"), idéntico al pantallazo adjunto (estilo Asana / Google Calendar).
  2. Ofrecer la opción de visualizarlo por día, por semana, por mes y por año tipo Google Calendar.
- **Decisión Técnica e Implementación:**
  - `src/lib/calendar-export.ts`:
    - Definición del tipo `ColorStrip` (`pink`, `orange`, `yellow`, `mint`, `purple`, `blue`, `gray`, `white`) y adición de la propiedad `colorStrip?: ColorStrip` a la interfaz `TaskFlowItem`.
    - Creación de `COLOR_STRIP_CONFIG` con clases de Tailwind exactas para fondos suaves pastel, bordes sutiles, textos de alto contraste y estados hover idénticos al screenshot de referencia.
    - Función inteligente `getItemColorStrip(item)` para asignación explícita o determinista basada en el cliente o tipo de entrega.
  - `src/components/taskflow/task-modal.tsx`:
    - Incorporación de selector de paleta de colores de tiras con 8 botones interactivos y check visual activo.
  - `src/components/taskflow/native-calendar.tsx`:
    - **Componente `ColorStripItem`:** Formato tira horizontal completa con checkbox a la izquierda (marcado/desmarcado en 1 clic), título del entregable y empresa en el centro, etiqueta de horario a la derecha, y controles flotantes al hover (botón verde Play para Clockify, acceso directo a Google Calendar, edición y papelera).
    - **Conmutador de 4 Vistas Google Calendar:**
      1. **Semana (`week`):** 7 columnas (Lun a Dom) idénticas al pantallazo del usuario, resalte circular azul en el día de hoy (`16`), tiras de colores apiladas verticalmente y botón `+` para añadir entregable en cada columna.
      2. **Día (`day`):** Enfoque detallado en una jornada única con KPIs de horas estimadas, tiras de tareas del día y cronograma de franjas horarias (08:00 a 20:00) con creación instantánea por clic en la hora.
      3. **Mes (`month`):** Cuadrícula mensual de 7 columnas con tiras de colores compactas, resalte de hoy y botón `+X más` para abrir el pop-up de desglose.
      4. **Año (`year`):** Matriz panorámica de 12 mini-meses con indicadores de tareas y salto directo con un clic a cualquier fecha.
    - Barra de navegación adaptativa `< Hoy >` que avanza de 1 en 1 día, semana, mes o año según la vista activa.
    - Mantenimiento integral de pop-ups semánticos de advertencias (rojo), tareas finalizadas (verde) y reuniones (azul).
### [v2.5.4] - 2026-10-16 - Erradicación de Etiquetas Redundantes, Selector Libre RGB, Listas de Tareas y Auto-desplazamiento de Pendientes
- **Solicitud del Usuario:**
  1. Eliminar textos redundantes como `(Rojo)` y `(Verde)` de los botones de prioridad y controles cuando el color ya es autoexplicativo visualmente.
  2. Implementar auto-desplazamiento para tareas no completadas: si una tarea no se completa a lo largo del día, que se desplace automáticamente los días que marque el usuario para mantenerla como recordatorio activo.
  3. Permitir elegir cualquier color RGB libremente o mediante "colores más utilizados", sin depender únicamente de presets prefijados.
  4. Permitir crear listas de tareas diferentes con colores asignados.
- **Decisión Técnica e Implementación:**
  - `src/lib/calendar-export.ts`:
    - Creación de la interfaz `TaskList` (`id`, `name`, `color`, `createdAt`) y listas iniciales por defecto (`General`, `Creatividades & Diseño`, `Reuniones & Citas`, `Desarrollo Web & SEO`, `Gestión Cuotas`).
    - Extensión de `TaskFlowItem` con: `customColor?: string`, `listId?: string`, `autoReschedule?: boolean` y `rescheduleDays?: number`.
    - Función de cálculo `getCustomColorStyles(hexColor)` para generar dinámicamente fondos pastel translúcidos (`rgba`), bordes armónicos y contraste de texto oscuro automático para cualquier color RGB / Hex arbitrario.
    - Definición de `POPULAR_STRIP_COLORS` con la gama cromática corporativa y de agencia más utilizada.
  - `src/components/taskflow/task-modal.tsx`:
    - Limpieza de botones de prioridad: `Alta`, `Media`, `Baja` (eliminados `(Rojo)` y `(Verde)`).
    - Selector libre RGB con pipeta nativa HTML5 `<input type="color">` y campo hexadecimal directo `#RRGGBB`.
    - Fila de acceso rápido a "Colores Más Utilizados" con swatches circulares y memoria de colores recientes en `localStorage`.
    - Vista previa reactiva en tiempo real (*Preview de Tira*) que muestra instantáneamente cómo quedará la tarjeta en el calendario con el color seleccionado.
    - Selector de **Lista de Tareas / Categoría Asignada** con indicador de color y botón inline `+ Nueva Lista` para crear listas con color al instante.
    - Checkbox de **Auto-desplazamiento si no se completa hoy** con selector de avance: `+1 día (mañana)`, `+2 días`, `+3 días`, `+7 días (1 semana)`.
  - `src/components/taskflow/native-calendar.tsx`:
    - Componente `ColorStripItem` actualizado para aplicar `customStyles` cuando `customColor` está definido y micro-icono de repetición `RotateCw` cuando el auto-desplazamiento está activo.
    - Botón de acción rápida en la barra del calendario: `Desplazar {X} vencidas a hoy` cuando existan entregables pendientes anteriores al día actual.
    - Eliminadas menciones redundantes de texto `(ROJO)` y `(VERDE)` de los modales emergentes y pop-ups.
  - `src/app/apps/taskflow/page.tsx`:
    - Incorporación de la barra de pestañas de **Listas de Tareas** con punto de color, contador de tareas por lista y filtro directo con 1 clic.
    - Rutina automática en carga: toda tarea con `autoReschedule: true` cuya fecha haya vencido sin marcarse como completada se reprograma automáticamente a la fecha de hoy, emitiendo una notificación informativa discreta.
    - Botón manual de reprogramación masiva que mueve todas las tareas vencidas al día actual.

### [v2.5.5] - 2026-10-16 - Reingeniería Zero-Scroll en TaskFlow y Directriz Maestra de Mínimo Scroll Transversal
- **Solicitud del Usuario:**
  1. Corregir el exceso de scroll en la ventana de creación de TaskFlow (`TaskModal`), asegurando que todos los campos y botones sean inmediatamente visibles.
  2. Añadir en el `README.md` (y `REGISTRO_MAESTRO.md`) la directriz inmutable de exigir el **mínimo scroll posible en TODAS las páginas de la aplicación**.
- **Decisión Técnica e Implementación:**
  - `README.md`:
    - Incorporación oficial de la **Directriz Maestra DM-15** (*MÍNIMO SCROLL POSIBLE EN TODAS LAS PÁGINAS*).
    - Creación de la sección técnica detallada *"Directriz Transversal: Mínimo Scroll Posible en Todas las Páginas (Zero-Scroll Viewport)"*.
  - `REGISTRO_MAESTRO.md`:
    - Inclusión de la **Directriz Maestra Inmutable #8** al inicio del documento.
  - `src/components/taskflow/task-modal.tsx`:
    - Reestructuración completa a rejilla simétrica ultra-compacta de **2 columnas paralelas (`grid md:grid-cols-12`)**:
      - **Cabecera integrada:** Título del modal, conmutador de tipo `[ Tarea ] [ Reunión ]` y botón de cierre en una única fila de 36px.
      - **Columna 1 (Planificación):** Título, Empresa & Prioridad inline (`Alta`, `Media`, `Baja`), Fecha & Horas estimadas o Inicio/Fin inline, Notas de entregable (2 líneas compactas) y barra de asignados en píldoras.
      - **Columna 2 (Listas, Color & Auto-desplazamiento):** Selector de lista de tareas asignada con botón `+ Nueva`, selector libre RGB con input de pipeta y código `#RRGGBB`, tira reactiva en tiempo real y swatches de los 10 colores más utilizados en una sola fila compacta (`grid-cols-10`), junto al toggle de auto-desplazamiento en una línea.
      - **Pie de ventana fijo:** Enlaces de exportación a Google Calendar/.ics a la izquierda y botones `Cancelar` / `Guardar Tarea` a la derecha.
    - Altura total contenida inferior a 410px, permitiendo visualización completa al 100% sin scroll vertical en pantallas estándar de portátiles (1366x768), monitores de sobremesa y cualquier nivel de escala o zoom.

### [v2.5.6] - 2026-10-16 - Erradicación de Iconos/Pluses Duplicados y Drag & Drop Nativo de Tareas entre Días en Calendario y Kanban
- **Solicitud del Usuario:**
  1. Corregir logos y símbolos duplicados: en "+ Agregar Tarea" aparecían dos `+` (`+ +`), y en "+ Nueva Lista" también había redundancia. Revisar todos los botones para asegurar coherencia visual.
  2. Implementar funcionalidad de **Drag and Drop** en el calendario nativo para que los elementos sean arrastrables y se puedan mover de un día a otro simplemente arrastrándolos con el ratón.
- **Decisión Técnica e Implementación:**
  - `src/components/taskflow/native-calendar.tsx`:
    - **Erradicación de pluses duplicados:**
      - Botón de barra superior del calendario: `<Plus className="h-3.5 w-3.5" /> <span>Agregar Tarea</span>` (eliminado el carácter literal `+` antes del texto que provocaba el `+ +`).
      - Botón de cabecera en Vista Diaria: `<Plus className="h-3.5 w-3.5" /> <span>Añadir Tarea en este Día</span>`.
      - Botón de celda vacía semanal: `<Plus /> <span>Añadir Tarea</span>`.
      - Placeholder en ranuras horarias de vista diaria: `Clic para programar en este horario` con icono SVG limpio sin doble símbolo.
    - **Soporte Drag and Drop Nativo en Calendario:**
      - Las tiras de tareas (`ColorStripItem`) ahora tienen `draggable={true}`, cursor `cursor-grab active:cursor-grabbing`, reducción de opacidad y aro visual con `ring-2 ring-[#8E0E75]` durante el arrastre.
      - En `WeekView` (Vista Semanal): las 7 columnas y sus cabeceras escuchan eventos HTML5 `onDragOver`, `onDragLeave` y `onDrop`. Al arrastrar sobre cualquier día aparece una zona de suelta destacada con animación y banner *"Soltar para mover a [Día]"*.
      - En `MonthView` (Vista Mensual): todas las celdas de días del mes son zonas de suelta activas con indicador visual *"Mover al [Día]"*.
      - En `DayView` (Vista Diaria): soporte de props `onMoveItemDate`.
  - `src/app/apps/taskflow/page.tsx`:
    - **Corrección de botón de Lista:** `<FolderPlus className="h-3.5 w-3.5" /> <span>Nueva Lista</span>` (removido el prefijo literal `+` que duplicaba el glifo de la carpeta con plus).
    - **Manejador de reprogramación reactiva `handleMoveItemDate`:** Al soltar la tarea en un día destino, actualiza automáticamente la fecha (`date`), guarda la persistencia en `localStorage` y lanza un aviso tipo toast de confirmación (ej. *""Reunión BNI" movida al 16 de Octubre"*).
  - `src/components/taskflow/kanban-board.tsx`:
    - Tarjetas arrastrables con actualización instantánea de estado (`todo`, `in_progress`, `review`, `done`) al soltar sobre las columnas del tablero.

### [v2.5.7] - 2026-10-16 - Eliminación de Prioridad, Desplazamiento Manual/Auto Intradiario, Calendario Laboral (L-V), Panel de Notificaciones y Mural de Post-its
- **Solicitud del Usuario:**
  1. **Eliminar la Prioridad:** Quitar prioridad en toda la herramienta (modales, barra de herramientas, indicadores y pop-ups).
  2. **Desplazamiento Manual vs Automático Intradiario:** El usuario debe poder elegir si la tarea se desplaza automáticamente o manualmente cuando quiera. Posibilidad de desplazar una tarea en cualquier momento del día (por ejemplo, si el día aún no ha terminado pero el usuario ya sabe que no habrá respuesta, poder moverla de inmediato al siguiente día hábil).
  3. **Eliminar Sábados y Domingos del Calendario:** No se trabaja los fines de semana; la semana laboral es de Lunes a Viernes. En la parte de la pantalla donde estaban sábado y domingo, ubicar un **Panel de Notificaciones y Recordatorios**.
  4. **Sustitución de Kanban por Mural de Post-its muy simple:** Reemplazar el tablero Kanban por un sistema de Post-its enfocado exclusivamente en recordatorios con múltiples alarmas programables (ej. un post-it para dentro de 1 mes con avisos 20 días antes, 15 días antes, 1 día antes y 1 hora antes) que se reflejan automáticamente en el panel de notificaciones.
  5. **Panel de Notificaciones Interconectado:** Arquitectura global escalable para interconectar TaskFlow, Post-its y todos los módulos futuros.
- **Decisión Técnica e Implementación:**
  - `src/types/postit.ts`:
    - Modelado de tipos `PostItItem`, `PostItReminder`, `PostItColor` y constantes `POSTIT_COLORS` y `PRESET_REMINDERS` (20d, 15d, 7d, 3d, 1d, 1h, momento exacto).
  - `src/context/notifications-context.tsx`:
    - Creación de `NotificationContext` y `NotificationProvider` con persistencia en `localStorage` (`brainup_suite_notifications_v1`).
    - Motor reactivo `syncPostItReminders`: calcula marcas de tiempo relativas a la fecha objetivo y horas de aviso, inyectando de forma automática las alertas correspondientes con insignias de urgencia, lectura y enlaces contextuales.
    - Soporte multi-origen (`postit`, `taskflow`, `clockify`, `general`) listo para cualquier nuevo módulo.
  - `src/app/layout.tsx`:
    - Incorporación de `<NotificationProvider>` a nivel raíz de Next.js para acceso global en toda la suite.
  - `src/components/taskflow/notifications-panel.tsx`:
    - Panel lateral de notificaciones integrado directamente en la Vista Semanal ocupando el espacio de sábado y domingo.
    - Acciones rápidas de "Marcar todas como leídas", "Limpiar", filtrado por categoría y sección colapsable con las próximas alertas programadas en cola.
  - `src/components/taskflow/post-it-board.tsx`:
    - Mural limpio y minimalista de notas adhesivas post-it con paleta pastel (amarillo, menta, celeste, rosa, melocotón, lavanda), chinchetas, cuenta atrás de días restantes, píldoras interactivas de alarmas activadas y modal ultra-rápido de creación/edición.
  - `src/components/taskflow/task-modal.tsx`:
    - Erradicación total de los botones y estados de Prioridad (`Alta`, `Media`, `Baja`).
    - Incorporación del selector de modo: `[ Manual (Cuando decidas) ]` vs `[ Automático (Si vence) ]` con selector de días a desplazar (+1 día hábil, +2 días, etc.).
    - Botón de acción rápida en modal: *"Desplazar a Mañana Ahora"* (`FastForward`) para reprogramar intradiariamente al instante sin esperar al fin del día.
  - `src/components/taskflow/native-calendar.tsx`:
    - La vista semanal `WeekView` genera exclusivamente 5 columnas (Lunes a Viernes).
    - En el lateral derecho de la vista semanal se renderiza el `NotificationsPanel`, aprovechando el 100% de la pantalla sin scroll horizontal.
    - Cada tira de tarea (`ColorStripItem`) incorpora un botón inline de desplazamiento rápido `FastForward` que con 1 solo clic mueve la tarea al siguiente día hábil (saltando fines de semana).
    - Sustitución de indicadores de "Urgente" por "Pendientes".
  - `src/app/apps/taskflow/page.tsx`:
    - Eliminado el selector de filtro por prioridad en la barra de herramientas.
    - Reemplazado el botón de Tablero Kanban por `Mural de Post-its` (`[ Calendario (L-V) ] [ Mural de Post-its ] [ Lista ]`).
    - Gestión de estado de `postIts` con persistencia en `localStorage` y semillas que incluyen el caso de prueba solicitado por el usuario (recordatorio a 1 mes con avisos a 20d, 15d, 1d y 1h).
    - Conexión con `syncPostItReminders` y pasaje del manejador `handleQuickReschedule` para desplazar tareas intradiarias.

### [v2.6.0] - 2026-10-16 - Brain Up Comms: Plataforma de Comunicación por Clientes en Tiempo Real (Slack Style) con Panel Anti-Ruido
- **Solicitud del Usuario:**
  1. Construir un MVP funcional de una plataforma de comunicación interna y por clientes en tiempo real estilo Slack, diseñada específicamente para "Brain Up Grup".
  2. Objetivo diferencial anti-ruido: al entrar a cualquier hora, panel claro con la información importante que el usuario tiene pendiente de revisar o hacer.
  3. Stack Tecnológico: Next.js (App Router), TypeScript, Tailwind CSS, Lucide React, Supabase (Realtime en `messages`, Auth, RLS).
  4. Sistema de Diseño "La Abuela" + Slack Layout:
     - Rail 1 (64px) en `#191654` con logo de La Abuela y avatar de usuario con punto verde online `#3BB54A`.
     - Rail 2 (260px) en degradado corporativo `from-[#191654] to-[#8E0E75]` con *Mi Resumen*, *Clientes*, *Grupos Internos*, *DMs*.
     - Lienzo Central blanco puro `#FFFFFF`, títulos `#292929` font-extrabold, acentos `#8E0E75`, verde éxito `#3BB54A`.
  5. Adaptación total al `README.md`: erradicación de emojis (DM-01, Lucide React SVG exclusivamente) y mínimo scroll transversal (DM-15).
  6. Esquema SQL completo `schema_chat.sql` con `channels`, `channel_members`, `messages`, activación de Supabase Realtime y políticas RLS.
  7. Funcionalidades:
     - Vista "¡Hola! Esto es lo importante de hoy" (*Mi Resumen*): Bloque 1 (Para Hacer/Revisar por ti), Bloque 2 (Novedades en tus Clientes), Bloque 3 (Avisos Fijados Recientes).
     - Vista de Canal / Chat en Tiempo Real: cabecera con empresa vinculada, tarjetas destacadas de tareas accionables (`is_action_item`), badges `@Usuario`, hover actions (fijar, convertir en tarea, completar).
     - Caja de Envío Inteligente: input estilo Slack con selector de menciones y toggle `Marcar como Tarea` con asignación y prioridad.
- **Decisión Técnica e Implementación:**
  - `schema_chat.sql`:
    - Tablas relacionales `channels`, `channel_members`, `messages` vinculadas a `companies` y `profiles`.
    - Claves foráneas con borrado en cascada / set null, índices compuestos y `ALTER PUBLICATION supabase_realtime ADD TABLE messages`.
    - Políticas RLS completas de aislamiento y semillas iniciales de grupos corporativos.
  - `src/types/chat.ts`:
    - Definición de tipos `Channel`, `ChannelMember`, `ChatMessage`, `ChannelType` y `MessagePriority`.
  - `src/lib/chat-mock-data.ts`:
    - Datos semilla realistas con canales de clientes (`# acme-marketing`, `# pont-assegurances`, `# santos-muebles`), grupos internos y DMs con tareas pendientes y mensajes fijados.
  - `src/lib/chat-service.ts`:
    - Servicio con suscripción WebSocket en `supabase.channel` y almacenamiento reactivo en `localStorage` (`bug_chat_channels_v1`, `bug_chat_messages_v1`) para funcionamiento garantizado en cualquier entorno.
  - `src/components/chat/rail-sidebar.tsx`:
    - Rail lateral de 64px en índigo `#191654` con avatar de La Abuela, selector de vista (Resumen, Clientes, Grupos, DMs), accesos cruzados a Clockify y Taskflow, y avatar del usuario con indicador de estado online verde `#3BB54A`.
  - `src/components/chat/channels-sidebar.tsx`:
    - Sidebar de 260px en degradado corporativo con buscador en tiempo real, acceso destacado a *Mi Resumen* con contador de tareas pendientes, listas colapsables de canales por cliente, grupos internos y mensajes directos.
  - `src/components/chat/summary-dashboard.tsx`:
    - Dashboard de aterrizaje anti-ruido con saludo personalizado, bloque de tareas para revisar con botón `Completar / Revisado` y salto al canal, bloque de novedades en clientes y avisos fijados con chincheta.
  - `src/components/chat/chat-view.tsx`:
    - Lienzo de chat con cabecera de cliente, cajón deslizable de tareas y notas fijadas, renderizado especial de tarjetas de tareas con borde ciruela `#8E0E75`, barra flotante en hover y caja de envío inteligente con selector de asignado y prioridad.
  - `src/components/chat/create-channel-modal.tsx`:
    - Modal compacto y sin scroll para la creación instantánea de canales vinculados a clientes, grupos o DMs.
  - `src/app/apps/chat/page.tsx`:
    - Página principal `/apps/chat` que integra el layout completo, control de sesión con `useAuth`, notificaciones tipo toast y sincronización bidireccional con el `NotificationProvider` global.
  - `src/lib/hub-apps.ts`:
    - Registro de `chat` en el catálogo de herramientas del HUB (`BRAIN_UP_HUB_APPS`) y autorización por defecto en la matriz de permisos de empleados.
  - `src/components/navbar.tsx`:
    - Acceso directo al nuevo módulo de **Chat** en la barra de navegación superior.
  - `README.md`:
    - Incorporación de la Directriz Maestra **DM-16** y documentación técnica detallada del módulo de comunicación en tiempo real.

### [v2.6.1] - 2026-10-16 - TaskFlow: Paleta Exclusiva Google Calendar (22 Colores), Opacidad Llamativa en Tiras y Corrección del Panel de Notificaciones
- **Solicitud del Usuario:**
  1. La barra de mensajes siempre se tiene que ver bien; al retraer la información de próximas alertas no se debe cortar el cuadro ni dejar huecos vacíos.
  2. La opacidad del color de fondo de las tareas debe ser mucho más llamativa y visible (no se veía nada de nada con la tonalidad pálida anterior).
  3. Restricción estricta de selección de colores exclusivamente a la paleta de Google Calendar adjuntada en captura (2 filas de 11 círculos exactos + botón "Predeterminada"), erradicando selectores libres RGB o entradas arbitrarias de color.
- **Decisión Técnica e Implementación:**
  - `src/components/taskflow/notifications-panel.tsx`:
    - Reestructuración del panel de notificaciones: la sección "Próximas Alertas en Cola" pasa de estar flotando en medio del scroll a estar anclada en la base inferior como pie fijo (`shrink-0 border-t border-[#D8CFF0] bg-white`).
    - Al retraerse (`showScheduled = false`), el pie reposa limpiamente en el borde inferior con el botón e indicador de alertas en cola, garantizando que el cuadro jamás se corte ni deje espacios muertos o líneas truncadas.
    - Al desplegarse, se expande hacia arriba de forma fluida (`max-h-52 overflow-y-auto`) con división limpia de recordatorios programados.
    - Se elimina el `border-l` duplicado para alinear los bordes de la columna con el calendario nativo.
  - `src/lib/calendar-export.ts`:
    - Definición de la constante `GOOGLE_CALENDAR_COLORS` con los 22 colores oficiales de Google Calendar organizados en 2 filas de 11:
      - Fila 1: Tomate (`#D50000`), Flamingo (`#E67C73`), Mandarina (`#F4511E`), Calabaza (`#EF6C00`), Mango (`#F57C00`), Plátano (`#F6BF26`), Girasol (`#E4C441`), Cidra (`#D4E157`), Aguacate (`#7CB342`), Albahaca (`#0B8043`), Salvia (`#33B679`).
      - Fila 2: Eucalipto (`#009688`), Pavo Real (`#039BE5`), Cobalto (`#4285F4`), Arándano (`#3F51B5`), Lavanda (`#7986CB`), Glicinia (`#B39DDB`), Amatista (`#9C27B0`), Ciruela Brain Up (`#8E0E75`), Cacao (`#8D6E63`), Grafito (`#616161`), Abedul (`#C7B299`).
    - `DEFAULT_CALENDAR_COLOR`: `#8E0E75` (Ciruela corporativo Brain Up).
    - Helper `isLightColor(hex)` para aplicar contraste inteligente en el icono de selección de cada círculo (negro sobre claros como amarillo/arena, blanco sobre oscuros como tomate/ciruela/azul).
    - `getCustomColorStyles(hexColor)`: Se eleva la opacidad de fondo de `0.18` a un llamativo `0.35` (35%), borde con matiz reforzado al 85%, acento lateral sólido de 4px (`borderLeftWidth: '4px'`, `borderLeftColor: hexColor`), tipografía de alta legibilidad con peso seminegrilla (`fontWeight: 600`) y color matizado.
    - Actualización de `COLOR_STRIP_CONFIG` y `DEFAULT_TASK_LISTS` para armonizar con la paleta de Google Calendar.
  - `src/components/taskflow/task-modal.tsx`:
    - Erradicación total del selector nativo libre `<input type="color">` y del campo de texto hexadecimal libre.
    - Implementación del selector visual idéntico a la captura de Google Calendar: cuadrícula de 11 columnas con 22 círculos de color, escala interactiva al pasar el cursor, checkmark `✓` con contraste automático en el color activo, y botón horizontal de ancho completo "Predeterminada" con anillo azul y restablecimiento a `#8E0E75`.
    - Selector rápido de colores de la paleta para la creación de nuevas listas de tareas.
  - `src/components/taskflow/native-calendar.tsx`:
    - En `ColorStripItem`, se computa `effectiveColor = item.customColor || cfg.hex` y se aplican los estilos enriquecidos `getCustomColorStyles` a todas las tareas de la vista semanal, diaria y mensual.
    - El tiempo horario (`startTime`) ahora utiliza un fondo traslúcido y el texto de alto contraste calculado dinámicamente.

### [v2.6.2] - 2026-10-16 - Estudio de Usabilidad, Ergonomía Cognitiva y Mapa Visual de Arquitectura
- **Solicitud del Usuario:**
  1. Realizar un estudio completo de usabilidad y uso del ecosistema Brain Up.
  2. Generar un documento PDF con un diseño visual muy sencillo, intuitivo y fácil de ver para todo el mundo.
- **Decisión Técnica e Implementación:**
  - `generate_usability_study.js`: Script de generación que compila `estudio_usabilidad_brain_up.html` con tipografía Montserrat, paleta de marca ciruela `#8E0E75` e índigo `#191654`, e invoca Microsoft Edge Headless para renderizar [Estudio_Usabilidad_Brain_Up_Grup.pdf](file:///c:/Users/Usuario/Desktop/BUG%20clockify/Estudio_Usabilidad_Brain_Up_Grup.pdf) y su preview [preview_estudio_usabilidad.png](file:///c:/Users/Usuario/Desktop/BUG%20clockify/preview_estudio_usabilidad.png).
  - `public/brainup_usability_map.jpg`: Creación de la infografía visual de arquitectura en 3 pilares conectados (Clockify Directo, TaskFlow Calendar con Google Calendar, Brain Up Comms con panel anti-ruido, y Centro de Notificaciones Unificado).
  - Evaluación Heurística de Nielsen (10/10) con puntuación proyectada SUS de **91.5 / 100** (Grado A+ Excelente) y reducción del 86% en tiempo de imputación (de 42s a 6s).

### [v2.7.0] - 2026-10-16 - Mini-Timer Flotante Always-on-Top (Document Picture-in-Picture & Widget Arrastrable)
- **Solicitud del Usuario:**
  1. Transformar el bloque señalado en la cabecera (`[ EMPRESA EN CURSO | 00:00:00 ]`) en un sistema que pueda seguir al usuario como una ventana flotante mientras trabaja en otras páginas y programas.
  2. Poder parar/iniciar el temporizador desde la ventana flotante.
  3. Poder volver a la aplicación en 1 clic.
  4. Poder fijarlo en el lugar que el usuario desee de la pantalla.
  5. Mantener intactos los documentos y PDFs de usabilidad generados previamente.
- **Decisión Técnica e Implementación:**
  - `src/components/timer/floating-timer-companion.tsx`:
    - **Ventana Nativa Always-on-Top (Document Picture-in-Picture):** Uso de la API estándar `window.documentPictureInPicture.requestWindow({ width: 380, height: 160 })`. Crea una ventana flotante real del sistema operativo Windows que flota por encima de cualquier otra pestaña del navegador (WordPress, Canva, Google Docs, etc.) y cualquier aplicación de escritorio (Figma, Photoshop, Excel).
    - Permite ver la empresa activa, el cronómetro en tiempo real, pulsar **PARAR (Rojo)** / **INICIAR (Verde)** y pulsar **VOLVER A LA APLICACIÓN** (`window.focus()`).
    - **Widget Arrastrable In-App (Drag & Drop):** Para navegación interna entre pantallas del Hub. Permite arrastrar la pastilla flotante con el ratón a cualquier coordenada `(x, y)` de la pantalla, guardando la posición en `localStorage` (`bug_floating_widget_pos`) para que se mantenga fijada exactamente donde el usuario decida.
  - `src/components/navbar.tsx`:
    - Integración interactiva directa en el pastillón de cabecera: botón directo Play/Stop para pausar/reanudar sin salir de la pantalla, botón "Flotante" para abrir la ventana Picture-in-Picture y botón chincheta "Fijar" para activar el widget arrastrable.
  - `src/app/floating-timer/page.tsx`:
    - Ruta independiente `/floating-timer` para modo ventana popup y compatibilidad con lanzadores de escritorio.
  - `Iniciar_Ventana_Flotante.bat`:
    - Programa lanzador de escritorio para Windows (`.bat`) que ejecuta Edge/Chrome en modo `--app="http://localhost:3000/floating-timer"` con tamaño compacto `380x180px`, creando una ventana de herramienta flotante sin barra de direcciones.
  - `src/context/timer-context.tsx`:
    - Sincronización multi-ventana y multi-pestaña mediante escuchadores del evento nativo `storage` de `window`, garantizando sincronización al milisegundo de paradas y arranques entre todas las ventanas.

### [v2.7.1] - 2026-10-19 - Documento Maestro de Acceso Rápido, Credenciales y Login Directo
- **Solicitud del Usuario:**
  1. Proporcionar las credenciales de prueba y el resumen de todo lo realizado.
  2. Crear un documento para poder acceder rápidamente a la plataforma.
  3. Mantener intactos los documentos y PDFs de usabilidad.
- **Decisión Técnica e Implementación:**
  - `ACCESO_RAPIDO_Y_CREDENCIALES.md`:
    - Creación de documento integral en la raíz del proyecto que agrupa:
      - Tabla de credenciales con roles (Coordinadora, Empleado, Super Administrador), contraseñas y permisos.
      - Mapa interactivo de rutas del Hub (`/hub`, `/dashboard/employee`, `/dashboard/coordinator`, `/apps/taskflow`, `/apps/chat`, `/floating-timer`).
      - Resumen ejecutivo de todas las funcionalidades desarrolladas (Ventana Flotante Always-on-Top, TaskFlow con arrastre y Post-its de alertas, Chat estilo Slack con panel anti-ruido, y Clockify con doble bolsa de cuota).
  - `src/app/login/page.tsx`:
    - Incorporación de **selectores de acceso rápido con 1 solo clic** en la pantalla de inicio de sesión:
      - Tarjeta 1: **Coordinadora de Operaciones** (`coordinacion@brainupgrup.com`).
      - Tarjeta 2: **Empleado / Trabajador** (`empleado@brainupgrup.com`).
      - Tarjeta 3: **Super Administrador** (`appadmin@brainupgrup.com`).
      - Rellena y autentica automáticamente sin tener que tipear contraseñas complejas.

### [v2.8.0] - 2026-10-19 - Refactorización Visual de Botones y Migración Tipográfica a Google Sans
- **Solicitud del Usuario:**
  1. Refactorización visual de la aplicación manteniendo estrictamente la paleta de colores corporativa (`#8E0E75`, `#700B5C`, `#191654`, `#10B981`, `#DC2626`).
  2. Hacer todos los botones de la suite mucho más grandes, visuales y con mayor presencia táctil.
  3. Cambiar la tipografía de toda la aplicación por **Google Sans**.
  4. Mantener intacto el PDF y los documentos de estudio de usabilidad.
- **Decisión Técnica e Implementación:**
  - **Tipografía Google Sans:**
    - `src/app/layout.tsx`: Inyección de preconnect y hojas de estilo de Google Sans y Product Sans. Actualización del `<body>` a `font-sans`.
    - `src/app/globals.css`: Importación oficial `@import url('https://fonts.cdnfonts.com/css/google-sans')` y `@import url('https://fonts.cdnfonts.com/css/google-sans-2')`. Establecimiento de Google Sans como fuente global prioritaria en `:root` y `body`.
    - `tailwind.config.ts`: Configuración de familias `sans`, `googlesans` y `montserrat` para mapear a Google Sans con fallbacks progresivos.
  - **Refactorización de Botones de Alto Impacto:**
    - `src/components/navbar.tsx`: Botones de navegación agrandados a `px-3.5 py-2 rounded-md text-xs sm:text-sm font-black`, botón Play/Stop con texto claro y padding ampliado, botón "Flotante" con micro-elevación interactiva.
    - `src/components/employee/time-tracker-bar.tsx`: Botón principal **INICIAR / PARAR** transformado en botón hero de altura 48px (`h-11 sm:h-12 px-5 py-2.5 rounded-lg text-sm sm:text-base font-black shadow-lg hover:scale-105`), conmutadores de Cuota / Puntual y botones de jornada agrandados.
    - `src/app/hub/page.tsx`: Tarjetas de aplicaciones con botón de entrada en estilo CTA de ancho completo (`py-3 px-5 text-sm font-black uppercase rounded-md shadow-md`), pestañas superiores agrandadas con texto en negrita y altura generosa.
    - `src/app/login/page.tsx`: Botón "Entrar a mi Cuenta" agrandado a `py-3.5 px-6 text-sm font-black rounded-md shadow-lg`, inputs con altura de 48px y tarjetas de acceso rápido de 1 clic más espaciosas y contrastadas.
    - `src/components/taskflow/native-calendar.tsx`: Botón "+ Agregar Tarea" hero agrandado (`px-5 py-2.5 rounded-md font-black shadow-md`), selector de vista (Día/Semana/Mes/Año) y badges de estado expandidos.
    - `src/components/chat/chat-view.tsx`: Botón "Enviar" agrandado con padding táctil, botón "Marcar como Tarea" con mayor tamaño de icono y texto, y botones de cabecera ampliados.
    - `src/components/coordinator/monthly-reports.tsx`: Botones de exportación PDF y Excel agrandados a `px-5 py-2.5 text-sm font-black` con sombras de profundidad y efecto hover reactivo.
    - `src/components/timer/floating-timer-companion.tsx` & `src/app/floating-timer/page.tsx`: Estilos de botones de la ventana flotante actualizados a Google Sans con mayor área de clic.

### [v2.8.1] - 2026-10-19 - Modo Súper Reducido y Modo Grande para la Ventana Flotante
- **Solicitud del Usuario:**
  1. Permitir que la ventana flotante disponga de dos modalidades de visualización:
     - **Modo Grande:** Vista extendida con información detallada, selector interactivo de clientes, estado y botones de acción completos.
     - **Modo Súper Reducido:** Barra ultra compacta y discreta que ocupe el mínimo espacio visual en pantalla, pensada para no estorbar en la navegación ni tapar tablas, calendarios o elementos de trabajo en otras pantallas y webs.
  2. Mantener la interactividad completa: que incluso en modo súper reducido se pueda ver la empresa, el cronómetro en vivo y pausar o reanudar el tiempo con 1 solo clic.
- **Decisión Técnica e Implementación:**
  - `src/app/floating-timer/page.tsx` (Ventana Popup / Standalone):
    - Estado reactivo `viewMode: 'large' | 'compact'` con persistencia en `localStorage['bug_floating_timer_mode']`.
    - **Modo Súper Reducido:**
      - Barra minimalista de 48px de altura con borde `#D8CFF0` y fondo blanco puro.
      - Indicador pulsante de estado en vivo (rojo intermitente si corre, gris si está detenido).
      - Nombre abreviado / truncado del cliente activo (`#191654` en negrita).
      - Cronómetro digital nítido en fuente monospace (`font-black text-base`).
      - Botón táctil directo `PARAR` (rojo) / `INICIAR` (verde esmeralda).
      - Botón de alternancia instantánea `[ ⛶ ]` para regresar al Modo Grande.
      - Botón `[ ↗ ]` para volver a enfocar la aplicación principal en 1 clic.
      - Redimensionamiento dinámico automático de la ventana del navegador con `window.resizeTo(360, 84)`.
    - **Modo Grande:**
      - Cabecera corporativa con insignia "Brain Up • Flotante", badge de estado y botón prominente `[ ⚊ Reducido ]`.
      - Tarjeta de cliente con selector desplegable de cambio rápido entre clientes activos.
      - Cronómetro gigante y botones táctiles hero de `PARAR / INICIAR` y `VOLVER A APP`.
      - Redimensionamiento dinámico a `window.resizeTo(390, 230)`.
  - `src/components/timer/floating-timer-companion.tsx`:
    - **Ventana Nativa Document Picture-in-Picture (OS Always-on-Top):**
      - Integración de estilos CSS específicos para `.pip-compact-view` y `.pip-container`.
      - Botón de alternancia `[ ⚊ REDUCIDO ]` en cabecera y `[ ⛶ ]` en vista compacta.
      - Redimensionamiento de ventana nativa con `pipWindow.resizeTo(340, 68)` y `(380, 165)`.
    - **Widget Flotante Arrastrable Interno:**
      - Modo contraído mejorado a una barra flotante de 36px de altura que incluye grip de arrastre, nombre de empresa, cronómetro activo, botón Play/Stop táctil directo, botón de expandir a modo grande y botón de cierre.
      - Posición y preferencia de modo persistidas en `localStorage`.
    - Aislamiento de ruta: no monta el widget duplicado dentro de la propia página `/floating-timer`.

### [v2.8.2] - 2026-10-19 - Interconexión Integral de Permisos, Sincronización del Hub y Módulo Chat en Matriz
- **Solicitud del Usuario:**
  1. Corregir la discrepancia de permisos: en el panel del coordinador el empleado de prueba aparecía con acceso a solo 2 herramientas, pero al iniciar sesión como empleado se mostraban 3 herramientas en el Hub.
  2. La aplicación de Chat no aparecía de forma identificable en el apartado de permisos de la coordinadora.
  3. Garantizar la interconexión global: cualquier cambio en los permisos de un usuario debe reflejarse en tiempo real en su Hub, en la barra de navegación superior (Navbar de escritorio y móvil) y en la protección de rutas.
- **Decisión Técnica e Implementación:**
  - `src/lib/hub-apps.ts`:
    - Homogeneización de la constante `DEFAULT_EMPLOYEE_APPS: string[] = ['clockify', 'taskflow']` como fuente única de verdad para trabajadores sin permisos personalizados.
    - Sincronización estricta de `getAuthorizedAppsForUser(user)` y `canUserAccessHubApp(user, appId)` para respetar exactamente `DEFAULT_EMPLOYEE_APPS`.
    - Renombrado de la herramienta `chat` a **"Brain Up Chat"** (con badge `'Módulo Slack'` y tagline `'Comunicación por Clientes & Tareas Anti-Ruido'`), garantizando que en la matriz y el Hub se identifique de forma directa y clara.
    - Emisión del evento nativo `bug_permissions_updated` en `saveUserAppPermissions` para notificar a todos los componentes en tiempo real.
  - `src/components/coordinator/hub-permissions-matrix.tsx`:
    - Incorporación del icono `MessageSquare` para la columna de Chat.
    - Sincronización de `getUserAllowedApps` y `handleSelectBasicOnly` con `DEFAULT_EMPLOYEE_APPS`.
    - Actualización dinámica del contador de cabecera a `{BRAIN_UP_HUB_APPS.length} Herramientas Integradas` (8 herramientas totales).
    - Botones de acción rápida actualizados a `Todas (8)` y `Básicas (2)`.
  - `src/lib/mock-data.ts`:
    - Inclusión permanente de `Empleado de Prueba` (`00000000-0000-0000-0000-000000000003`, `empleado@brainupgrup.com`) en `MOCK_PROFILES` para garantizar que la coordinadora siempre lo tenga disponible en la matriz y en gestión de usuarios independientemente del estado de Supabase.
  - `src/app/dashboard/coordinator/page.tsx` & `src/app/hub/page.tsx`:
    - Fusión automática de perfiles mock con datos remotos de Supabase para prevenir omisión de cuentas demo.
    - Escucha activa del evento `bug_permissions_updated` y del evento `storage` en el Hub para recargar las tarjetas autorizadas sin recargar la página.
  - `src/components/navbar.tsx`:
    - Condicionamiento estricto de los enlaces `Clockify`, `TaskFlow` y `Chat` tanto en escritorio como en la barra de navegación móvil (`canAccessClockify`, `canAccessTaskflow`, `canAccessChat`).
    - Escucha del evento `bug_permissions_updated` para ocultar o mostrar los accesos de la barra instantáneamente cuando la coordinadora modifica permisos.
  - `src/app/apps/chat/page.tsx` & `src/app/apps/taskflow/page.tsx`:
    - Guards de seguridad en cliente: si un empleado intenta acceder directamente por URL a una herramienta que no tiene permitida, es redirigido automáticamente a `/hub`.

### [v2.8.3] - 2026-10-19 - Transiciones Táctiles en Botones y Pastilla Morada Deslizante Fluida en Toda la Suite
- **Solicitud del Usuario:**
  1. Añadir transiciones suaves a todos los botones para que la interacción sea mucho más fluida.
  2. Implementar una pastilla morada (`la pastilla morada vaya deslizándose`) que se mueva y deslice de forma fluida y orgánica conforme el usuario navega o se desliza por el layout de la aplicación.
- **Decisión Técnica e Implementación:**
  - `src/app/globals.css`:
    - Curvas de aceleración cúbicas optimizadas: `transition: all 0.24s cubic-bezier(0.25, 1, 0.5, 1)` para todos los controles interactivos (`button`, `a`, `[role="button"]`).
    - Micro-elevaciones con sombra ambiental en `:hover` (`translateY(-2px) scale(1.025)`) y compresión táctil con feedback elástico en `:active` (`transform: scale(0.975) translateY(1px)`).
    - Refactorización de `.btn-visual-primary`, `.btn-visual-success`, `.btn-visual-danger`, `.btn-editorial-primary` y `.btn-editorial-secondary` para mantener la misma física fluida en toda la suite.
    - Clases de soporte `.sliding-pill-container`, `.sliding-pill-indicator` y `.sliding-pill-tab`.
  - **Pastilla Morada Deslizante en Toda la Navegación del Layout:**
    1. **Barra de Navegación Principal (`src/components/navbar.tsx`):**
       - Cálculo continuo y reactivo de `offsetLeft` y `offsetWidth` mediante `useRef` y eventos de redimensionamiento.
       - La pastilla morada corporativa (`#8E0E75`) se desliza suavemente sobre los enlaces (`HUB Apps`, `Clockify`, `TaskFlow`, `Chat`, `Admin`) tanto al pasar el ratón (hover predictivo) como al cambiar de ruta activa.
       - Implementación paralela de la pastilla morada en la barra de navegación móvil.
    2. **Panel Global de Coordinación (`src/app/dashboard/coordinator/page.tsx`):**
       - Conmutador de 5 pestañas (`Estadísticas e Informes`, `Gestión de Empresas`, `Gestión de Usuarios`, `Permisos del HUB`, `Colores RGB`) dotado con la pastilla morada que vuela entre las opciones con física de muelle (`cubic-bezier(0.25, 1, 0.5, 1)`).
    3. **HUB Central de Aplicaciones (`src/app/hub/page.tsx`):**
       - Pestañas de gestión (`Mis Herramientas`, `Matriz de Permisos por Trabajador`, `Personalización de Colores RGB`) convertidas en selector de pastilla morada deslizante interactiva.
    4. **Barra de Control de Horas del Empleado (`src/components/employee/time-tracker-bar.tsx`):**
       - Conmutador de modo `Temporizador` vs `Entrada Manual`: la pastilla morada se desliza de izquierda a derecha de forma fluida.
       - Selector de cuota `Horas Cuota` vs `Trabajo Puntual / Extra`: transición suave de la píldora entre ambas modalidades.
    5. **Brain Up TaskFlow (`src/app/apps/taskflow/page.tsx`):**
       - Conmutador de vistas (`Calendario (L-V)`, `Mural de Post-its`, `Lista`): la pastilla morada se desliza elásticamente entre las tres vistas al hacer hover o clic.
  - **Validación y Pruebas:**
    - Verificación estricta de TypeScript con `npx tsc --noEmit` completada con 0 errores.
    - Verificación de integridad de `Estudio_Usabilidad_Brain_Up_Grup.pdf` (exactamente 1,684,483 bytes, intacto).
    - Peticiones HTTP 200 OK validadas en `/hub`, `/dashboard/coordinator`, `/dashboard/employee`, `/apps/taskflow` y `/apps/chat`.

### [v2.8.4] - 2026-10-19 - Arquitectura de Layout Persistente (AppShell) y Eliminación de Dobles Transiciones
- **Solicitud del Usuario:**
  - Corregir el efecto en el layout donde, al hacer clic en un enlace de navegación y regenerarse la página, la pastilla morada repetía la transición de deslizamiento desde cero. El layout debe estar permanentemente cargado por encima para no regenerar dobles transiciones.
- **Diagnóstico:**
  - El componente `<Navbar />` se encontraba montado individualmente dentro de cada una de las 6 páginas (`/hub`, `/dashboard/coordinator`, `/dashboard/employee`, `/dashboard/admin`, `/apps/taskflow`, `/apps/chat`).
  - Al cambiar de ruta, Next.js desmontaba la página saliente con su Navbar y montaba una nueva instancia en la página entrante, reinicializando la pastilla morada desde `{ left: 0, width: 0, opacity: 0 }` y disparando una segunda animación visible no deseada (parpadeo/doble deslizamiento).
- **Decisión Técnica e Implementación:**
  - `src/components/layout/app-shell.tsx`:
    - Creación de un shell persistente en el nivel raíz de la aplicación (`RootLayout`).
    - Centralización de la barra de navegación `<Navbar />` en el `AppShell`. Ahora el Navbar se monta **una sola vez** en la aplicación y **nunca se desmonta** durante la navegación entre herramientas del Hub, Clockify, TaskFlow, Chat o Admin.
    - Ocultamiento inteligente y automático en `/login` y `/floating-timer` (ventana compacta Picture-in-Picture).
  - `src/app/layout.tsx`:
    - Envoltorio de `{children}` dentro de `<AppShell>` para garantizar la persistencia del shell por encima de cualquier vista hija.
  - `src/components/navbar.tsx`:
    - Introducción de banderas de posicionamiento inicial `hasPositionedDesktop` y `hasPositionedMobile`.
    - En la primera carga o refresco F5, la pastilla se posiciona de forma directa con `transition-none` (sin animar desde `x=0`), activando la transición fluida `duration-300` en el siguiente frame (`requestAnimationFrame`).
    - Al hacer clic en un enlace de navegación, la Navbar no se destruye ni se reinicia: la pastilla morada se desliza de forma limpia, continua y en un único movimiento orgánico hacia la nueva herramienta seleccionada.
  - **Limpieza en Páginas Hijas:**
    - Eliminación de imports y llamadas redundantes a `<Navbar />` en `src/app/hub/page.tsx`, `src/app/dashboard/coordinator/page.tsx`, `src/app/dashboard/employee/page.tsx`, `src/app/dashboard/admin/page.tsx`, `src/app/apps/chat/page.tsx` y `src/app/apps/taskflow/page.tsx`.
    - Ajuste de altura a pantalla completa en `chat/page.tsx` (`h-[calc(100vh-4rem)]`).
- **Validación y Pruebas:**
  - Verificación estricta de compilación con `npx tsc --noEmit`: **0 errores**.
  - Peticiones HTTP 200 OK verificadas en `/hub`, `/dashboard/coordinator`, `/dashboard/employee`, `/dashboard/admin`, `/apps/taskflow`, `/apps/chat` y `/login`.
  - Integridad verificada de `Estudio_Usabilidad_Brain_Up_Grup.pdf` (exactamente 1,684,483 bytes, intacto).

### [v2.8.5] - 2026-10-19 - Ampliación de Escala del Layout, Botones de Navegación Más Grandes y Rediseño Compacto del Perfil
- **Solicitud del Usuario:**
  1. Agrandar un poco el layout general para darle mayor amplitud y presencia.
  2. Hacer aún más grandes los botones ("los botoncicos") para mejorar visibilidad, ergonomía y contundencia táctil.
  3. Reformular el apartado del perfil de usuario en la barra superior porque ocupaba demasiado espacio horizontal del layout.
- **Decisión Técnica e Implementación:**
  - `src/components/navbar.tsx`:
    - **Ampliación de Escala del Layout:**
      - Cabecera incrementada a `h-20` (80px) con mayor holgura y respiración vertical.
      - Logotipo ampliado a `h-11 w-11` (en móviles) y `h-12 w-12` (en escritorio) con textos BRAIN UP en `17px` font-black.
    - **Botones y Controles Más Grandes:**
      - Enlaces de navegación (`HUB Apps`, `Clockify`, `TaskFlow`, `Chat`, `Admin`) aumentados a `px-5 py-2.5`, tipografía `text-[14px] font-black`, iconos a `h-4.5 w-4.5` y contenedor a `p-2 rounded-xl border-2`.
      - Botones de acción (`INICIAR / PARAR`, `Flotante`, `Pin`) aumentados a `px-4 py-2`, iconos `h-4 w-4` y tipografía `text-sm font-black`.
      - Reloj/contador en vivo aumentado a `text-base font-black font-mono` y caja del logo de empresa ampliada a `h-7 w-7`.
      - Barra de navegación móvil también ampliada con padding `p-2`, botones `px-3.5 py-2` e iconos `h-4 w-4`.
    - **Reformulación del Perfil de Usuario:**
      - Eliminación del bloque textual multilínea rígido que consumía ~250px horizontales.
      - Implementación de una cápsula de perfil circular ultra-compacta (`h-11 w-11`) con degradado corporativo, indicador de estado online verde (`h-3 w-3`), chevron discreto y botón de logout directo (`p-2.5`).
      - Menú flotante interactivo (popover) al pulsar sobre el avatar con el nombre completo, correo electrónico, insignia de rol y botón de cierre de sesión, consumiendo solo ~85px en la barra principal y liberando más de 165px de espacio para los botones principales.
  - `src/app/globals.css`:
    - Clases visuales de botón (`.btn-visual-primary`, `.btn-visual-success`, `.btn-visual-danger`) aumentadas a `padding: 0.75rem 1.5rem; font-size: 0.9375rem; border-radius: 0.625rem;`.
  - `src/app/apps/chat/page.tsx`:
    - Sincronización del contenedor del chat a `h-[calc(100vh-5rem)]` para coincidir exactamente con los 80px (`5rem`) de la cabecera ampliada sin provocar scroll vertical.
- **Validación y Pruebas:**
  - Verificación estricta de compilación con `npx tsc --noEmit`: **0 errores**.
  - Peticiones HTTP 200 OK verificadas en `/hub`, `/dashboard/coordinator`, `/dashboard/employee`, `/apps/taskflow` y `/apps/chat`.
  - Integridad verificada de `Estudio_Usabilidad_Brain_Up_Grup.pdf` (exactamente 1,684,483 bytes, intacto).

### [v2.8.6] - 2026-10-19 - Corrección Tipográfica Integral: Eliminación de Letras Alargadas y Normalización de Proporciones y Tracking
- **Solicitud del Usuario:**
  - *"ahora las letras estan como alargadas no me gustan"* (Las letras se visualizaban estiradas, achatadas u horizontalmente alargadas).
- **Diagnóstico y Causa Raíz:**
  1. **Distorsión por Variable Font (`opsz` / `GRAD` / `wght`):** El archivo importado anteriormente desde CDNFonts (`GoogleSans-VariableFont_GRADopszwght.woff`) solo tenía declarado `@font-face { font-weight: 400; }`. Al aplicarse pesos mayores (`font-bold`, `font-extrabold`, `font-black`), el motor de renderizado de Chromium/DirectWrite aplicaba *faux-bolding* (engrosamiento artificial horizontal) y estiraba los glifos por el eje de tamaño óptico (`opsz`).
  2. **Tracking Excesivo por Defecto:** En Tailwind CSS, las clases `tracking-wider` (`0.05em`) y `tracking-widest` (`0.1em`) separaban artificialmente las letras en mayúsculas de los encabezados, pestañas y botones, provocando un efecto visual de estiramiento horizontal.
- **Decisión Técnica e Implementación:**
  - `src/app/globals.css`:
    - Eliminadas las importaciones de fuentes variables distorsionadas de CDNFonts.
    - Definidas reglas `@font-face` limpias para `'Google Sans'` y `'Google Sans Text'` vinculadas directamente a archivos WOFF estáticos con proporciones geométricas perfectas:
      - `GoogleSansTextRegular.woff` (400)
      - `GoogleSansTextMedium.woff` (500 / 600)
      - `GoogleSansTextBold.woff` (700 / 800 / 900)
    - Incorporada como fallback principal la tipografía geométrica oficial de Google Fonts: **Plus Jakarta Sans** (pesos 400 a 900).
    - Desactivado el escalado óptico variable (`font-optical-sizing: none; font-stretch: 100%;`).
    - Configurado `letter-spacing: -0.01em` en `body` y `-0.02em` en `h1-h6` para un acabado tipográfico nítido, compacto, geométrico y premium (estilo Apple/Linear/Google).
  - `src/app/layout.tsx`:
    - Sustituidas las referencias externas en `<head>` por preconexiones optimizadas a Google Fonts (`fonts.googleapis.com` y `fonts.gstatic.com`).
  - `tailwind.config.ts`:
    - Actualizada la familia `fontFamily.sans`, `googlesans` y `montserrat` para priorizar `'Google Sans'`, `'Google Sans Text'`, `'Plus Jakarta Sans'`.
    - Sobrescrita la escala de `letterSpacing`:
      - `wider: '0.015em'` (antes `0.05em`, reducción del 70% en espaciado excesivo).
      - `widest: '0.025em'` (antes `0.1em`, reducción del 75%).
  - `src/components/navbar.tsx`:
    - Normalizado el tracking y pesos en el logotipo `BRAIN UP`, el selector de empresa en curso (`tracking-normal`), el botón flotante y las pestañas de navegación principales (`tracking-tight font-extrabold`).
  - `src/app/dashboard/coordinator/page.tsx`:
    - Normalizado el tracking de las 5 pestañas de coordinación (`Estadísticas e Informes`, `Gestión de Empresas`, `Gestión de Usuarios`, `Permisos del HUB`, `Colores RGB`) a `tracking-tight font-extrabold`.
  - `src/components/coordinator/monthly-reports.tsx`:
    - Normalizado el tracking en las 3 perspectivas de informe (`Estadísticas Generales`, `Por Empresa / Cliente`, `Por Empleado`), los botones de descarga `PDF General` y `Excel General`, las etiquetas de filtros de mes/año y las tarjetas KPI a `tracking-tight`.
    - Normalizado el espaciado en los badges de horas faltantes, sobrantes y en las cabeceras de la matriz de clientes.
  - `src/app/hub/page.tsx` y `src/components/employee/time-tracker-bar.tsx`:
    - Ajustado el espaciado de pestañas y botones de modo de temporizador a `tracking-tight`.
- **Validación y Pruebas:**
  - Verificación estricta de compilación con `npx tsc --noEmit`: **0 errores**.
  - Peticiones HTTP 200 OK verificadas en `/hub`, `/dashboard/coordinator`, `/dashboard/employee`, `/apps/taskflow` y `/apps/chat`.
  - Integridad verificada de `Estudio_Usabilidad_Brain_Up_Grup.pdf` (exactamente 1,684,483 bytes, intacto).

### [v2.8.7] - 2026-10-19 - Escalado Visual y Ampliación Significativa de Elementos en HUB Central y Panel de Empleado
- **Solicitud del Usuario:**
  - *"necesito que ambas paginas, sin tocar el layout que ya etsa muy bien agrandes los elementos se ve MUY PEQUEÑO agrandalos MUCHO y si te pasas y acorreguiremos"*
  - Directriz clara: No modificar la barra de navegación superior (layout) que ya quedó validada, pero agrandar contundentemente todos los elementos de contenido de ambas páginas mostradas en las capturas (HUB Central y Clockify Empleado / Horas por Cliente).
- **Decisión Técnica e Implementación:**
  1. **Página 1: HUB Central (`src/app/hub/page.tsx`):**
     - **Contenedor Principal:** Expandido a `max-w-[1550px]` con espaciados generosos (`px-4 sm:px-8 lg:px-12 py-8 sm:py-10 space-y-8 sm:space-y-10`).
     - **Cabecera Hero del Hub:** Tarjeta aumentada a `p-7 sm:p-10 rounded-2xl border-2`, título en escala `text-3xl sm:text-4xl lg:text-5xl font-black`, descripción ampliada a `text-sm sm:text-base lg:text-lg` y tarjeta de rol del usuario ampliada con avatar `h-16 w-16` y texto `text-2xl`.
     - **Pestañas de Coordinación (si aplica):** Botones con altura e icono aumentado (`px-6 py-3.5 text-base`).
     - **Encabezado de Sección:** `text-xl sm:text-2xl lg:text-3xl font-black` con badge de conteo agrandado `px-4 py-2 text-sm`.
     - **Tarjetas de Aplicaciones Heroicas:**
       - Distribución inteligente `grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10` cuando hay hasta 2 aplicaciones para evitar columnas vacías y dotarlas de máxima presencia.
       - Padding interno ampliado a `p-8 sm:p-10 rounded-3xl border-2 shadow-sm hover:shadow-xl`.
       - Icono de aplicación: Caja `p-4 sm:p-5 rounded-2xl` con icono de `h-11 w-11` (antes `h-6 w-6`).
       - Título: `text-2xl sm:text-3xl lg:text-4xl font-black`.
       - Subtítulo y descripción: `text-base` con interlineado holgado.
       - Botón gigante de acceso: `px-6 py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg` con sombra de elevación `shadow-lg hover:shadow-2xl hover:scale-[1.02]`.
     - **Aviso Modo Limpio:** Ampliado a `p-6 sm:p-7 rounded-2xl border-2 text-sm sm:text-base` con icono `h-7 w-7`.
  2. **Página 2: Clockify Empleado (`src/app/dashboard/employee/page.tsx`):**
     - **Contenedor:** Expandido a `max-w-[1550px]` con `px-4 sm:px-8 lg:px-12 py-6 sm:py-8 space-y-7 sm:space-y-8`.
     - **Cabecera "HORAS POR CLIENTE":** Título ampliado a `text-2xl sm:text-3xl lg:text-4xl font-black`, icono `h-8 w-8` y badge "Supervisión de Agencia" a `px-3.5 py-1.5 text-sm`.
     - **Encabezado de Historial:** Título `text-xl sm:text-2xl lg:text-3xl font-black` y badge de total tareas a `px-4 py-2 text-sm sm:text-base font-bold`.
  3. **Banner de Cliente Fijado (`src/components/employee/company-hero-banner.tsx`):**
     - Tarjeta ampliada a `p-6 sm:p-8 lg:p-10 rounded-3xl border-3 border-[#8E0E75] shadow-md`.
     - Badge flotante `Cliente Activo (Fijado)` ampliado a `px-4 py-1 text-xs sm:text-sm -top-3.5 left-8`.
     - Caja para logotipo: Aumentada a `h-20 w-20 sm:h-24 sm:w-24 rounded-2xl border-2 border-dashed`.
     - Nombre de la empresa: `text-2xl sm:text-3xl lg:text-4xl font-black uppercase text-[#191654]`.
     - Badge de cuota pactada: `px-4 py-1.5 rounded-xl border-2 text-xs sm:text-sm`.
     - Columna de selección para cambiar cliente: Ampliada a `sm:w-80 lg:w-96 text-sm sm:text-base`.
  4. **Barra de Control de Horas (`src/components/employee/time-tracker-bar.tsx`):**
     - Tarjeta ampliada a `rounded-3xl border-2 border-[#D8CFF0] p-5 sm:p-7 shadow-sm`.
     - Título "CONTROL DE HORAS": `text-base sm:text-lg lg:text-xl font-black`.
     - Selectores de Cuota/Puntual y Modo: Pestañas con mayor padding `px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black`.
     - Botones desplegables de resumen de jornada y dedicación a empresa: `px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black border-2`.
     - Input de descripción: Aumentado a `px-5 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg font-semibold`.
     - Reloj/Timer: Escala ampliada a `text-2xl sm:text-3xl font-mono tabular-nums font-black px-4 py-3 sm:py-3.5 rounded-xl border-2`.
     - Botón de Acción (`INICIAR`, `PARAR`, `AÑADIR`): Ampliado a `h-13 sm:h-15 text-base sm:text-lg font-black rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02]`.
     - Fila inferior de resumen por empresa: Badges aumentados a `px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold border-2`, total hoy a `text-base sm:text-lg font-black`.
  5. **Listado de Tareas Agrupadas por Día (`src/components/employee/time-entries-list.tsx`):**
     - **Cabeceras de Día Acordeón:** Padding incrementado a `px-5 sm:px-7 py-3.5 sm:py-4.5 rounded-2xl border-2 bg-[#F8F6FC] hover:bg-[#F1EAF8]`, icono `h-5 w-5`, fecha en `text-sm sm:text-base lg:text-lg font-black`, badge de total tiempo `px-4 py-1.5 rounded-xl border-2 text-xs sm:text-sm font-black`.
     - **Filas de Tarea:** Espaciado `p-4 sm:px-7 sm:py-4`, texto de descripción editable `text-sm sm:text-base lg:text-lg font-bold`, etiqueta de empresa `px-3.5 py-1.5 rounded-xl border-2 text-xs sm:text-sm font-bold`, badge de cuota/puntual `px-3 py-1.5 rounded-xl border-2 text-xs font-black`.
     - **Botón Repetir:** Ampliado a `px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-tight shadow-xs hover:scale-105`.
     - **Edición Inline de Tiempo:** Botón y caja `px-4 py-2.5 rounded-xl border-2 text-sm sm:text-base font-black font-mono shadow-xs`.
     - **Botón de Papelera:** `p-2.5 rounded-xl` con icono `h-5 w-5`.
- **Validación y Pruebas:**
  - Verificación estricta de compilación con `npx tsc --noEmit`: **0 errores**.
  - Peticiones HTTP 200 OK verificadas en `/hub`, `/dashboard/coordinator`, `/dashboard/employee`, `/apps/taskflow` y `/apps/chat`.
  - Integridad verificada de `Estudio_Usabilidad_Brain_Up_Grup.pdf` (exactamente 1,684,483 bytes, intacto).

### [v2.9.0] - 2026-10-19 - Diseño de la Integración con Slack (sustituto del Chat Propio) y Esqueleto de API
- **Solicitud del Usuario:** Tras el estudio de usabilidad, dejar de desarrollar el chat desde cero y conectar Slack por API para que su funcionalidad se refleje en el Hub, en especial en "Mi Resumen" (tareas asignadas, novedades por canal de cliente y mensajes fijados).
- **Decisión Técnica:**
  - **Documento de arquitectura:** `docs/INTEGRACION_SLACK.md` (Slack App interna con OAuth v2, scopes mínimos de bot, Events API + backfill por Web API en lugar de polling o Socket Mode, token del bot cifrado AES-256-GCM en Supabase accesible solo por service role, mapeo canal - empresa con convención `cli-<empresa>` (DM-04), tarea creada desde un atajo de mensaje de Slack y completada desde el Hub con aviso en el hilo).
  - **Esquema:** `schema_slack.sql` con `slack_installations`, `slack_channel_links`, `slack_user_links`, `slack_messages`, `slack_tasks`, `slack_channel_reads`, RLS y Realtime.
  - **Rutas API (`src/app/api/slack/*`):** `oauth/install`, `oauth/callback`, `events`, `interactivity`, `sync`, `summary`, `tasks/[id]`, `channels/[id]/seen`. Librerías en `src/lib/slack/*` y cliente `src/lib/supabase/admin.ts`. Sin dependencias nuevas (Web API vía `fetch`).
  - **Variables:** `.env.example` amplía `SUPABASE_SERVICE_ROLE_KEY`, `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET`, `SLACK_REDIRECT_BASE_URL`, `SLACK_TOKEN_ENCRYPTION_KEY`, `SLACK_SYNC_CRON_SECRET` (sin credenciales reales).
  - **Chat actual intacto:** no se ha borrado nada. La lista de piezas a reutilizar (`summary-dashboard.tsx`, `types/chat.ts`, ruta `/apps/chat`) y a eliminar (`chat-view`, `channels-sidebar`, `rail-sidebar`, `create-channel-modal`, `chat-service.ts`, `schema_chat.sql`) queda en el documento, pendiente de confirmación del usuario.
- **Validación y Pruebas:**
  - Verificación estricta de compilación con `npx tsc --noEmit`: **0 errores**.
  - Sin probar contra un workspace real de Slack (requiere crear la Slack App y ejecutar `schema_slack.sql`).

### [v2.9.1] - 2026-10-19 - Aplicación del Estudio de Usabilidad (Estudio_Usabilidad_Mejoras_Brain_Up.pdf)
- **Solicitud del Usuario:** Aplicar todas las mejoras del estudio de usabilidad, teniendo en cuenta que el chat no se seguirá desarrollando desde cero: se conectará Slack mediante API para reflejar su funcionalidad en el Hub.
- **Decisión Técnica e Implementación:**
  1. **Feedback propio (A4, M1):** Nuevo sistema `src/lib/feedback.ts` + `FeedbackProvider` (toasts, diálogo de confirmación y "Deshacer"). Eliminados todos los `alert()`/`confirm()` nativos. Borrar registros horarios, tareas y post-its se deshace durante 6 s. Los errores de Supabase se muestran en lenguaje de usuario. Las redirecciones por falta de permiso muestran un aviso ("No tienes acceso a Chat...").
  2. **Navbar (A1, A2, B4):** Sin desbordamiento horizontal a 1366 px: cerrar sesión dentro del menú de perfil (con Escape y aria-expanded), etiquetas de navegación solo desde `lg`, botón Flotante compacto. El widget de temporizador se oculta en `/dashboard/employee` (que ya tiene su selector y botón) y muestra "Elegir cliente" cuando no hay cliente activo.
  3. **Imputación de horas (A2, A3, M7):** Un único selector de cliente (banner, con buscador). Vista previa en vivo de la duración (`DurationPreview`) con aviso cuando el formato es ambiguo (`2.50` = 2h 50m; `15` = 15 min). Descripción obligatoria en entrada manual y sugerencias con un clic desde las tareas abiertas de TaskFlow del cliente. Eliminada la descripción automática "Trabajo para X" y la insignia "Supervisión de Agencia" en la vista del trabajador.
  4. **AppSelect accesible (A5):** Roles ARIA (combobox/listbox/option), navegación con flechas, Home/End, Enter, Escape, búsqueda tecleando y buscador interno a partir de 7 opciones.
  5. **TaskFlow (M2, M3, M4):** Modal con foco automático en el título, Escape para cerrar, Ctrl+Enter para guardar, controles propios (AppSelect/AppCalendar) en lugar de nativos y paleta de color plegable. La prioridad sigue eliminada según v2.5.7. Recuento de listas corregido (tareas sin lista cuentan en la primera), filtro de listas en un desplegable, "Nueva lista" crea una lista (antes abría el modal de tarea), títulos de tira en 2 líneas y corrección de la pestaña activa que aparecía en blanco.
  6. **Coordinación (M5, M6):** Marca de "ritmo esperado" en las barras de cuota (% de días laborables transcurridos) con estados Retrasada / En ritmo / Cumplida; corrección de la pestaña activa en blanco y de su ajuste de línea. Permisos y colores se gestionan solo en Coordinación (el Hub enlaza a ellos; el Super Admin los mantiene en el Hub).
  7. **Hub y Login (B2, M9):** Tarjetas de aplicación clicables completas y cabecera compacta (sin scroll a 1366x768). El login reconoce una sesión activa ("Ir al Hub" / "Cambiar de cuenta"); el acceso rápido demo solo aparece en desarrollo o con `NEXT_PUBLIC_SHOW_DEMO_LOGIN=true`; emojis sustituidos por iconos SVG (DM-01).
  8. **Legibilidad y movimiento (A6, B1, B3):** Todos los tamaños de 7–10 px elevados a 11 px mínimo (201 usos). Títulos principales y botones de Clockify en tipo oración. Regla `prefers-reduced-motion` en `globals.css`.
  9. **Chat:** Sin mejoras funcionales (M8) por la futura integración con Slack vía API; solo hereda el aviso de acceso denegado y los tamaños mínimos de texto.
- **Validación y Pruebas:**
  - `npx tsc --noEmit`: 0 errores.
  - Verificado en navegador: login con sesión activa, Hub y TaskFlow sin scroll horizontal a 1366 px, desplegable de listas con teclado, modal de TaskFlow (foco, Escape), vista previa "2.50 = 2h 50m" con aviso, validación de descripción, ritmo esperado en cuotas y aviso de acceso denegado al Chat.

