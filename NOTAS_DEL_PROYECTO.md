# NOTAS DEL PROYECTO • Brain Up Hub / Clockify

**Guía Viva para el Usuario Final (Brain Up Grup)**  
*Última actualización estructural: 2026-11-19*

> **Nota de mantenimiento para el equipo técnico / agentes:**  
> Este documento debe actualizarse obligatoriamente cada vez que se realice un **cambio estructural** en el proyecto (nuevos módulos, cambios de flujo entre pantallas, nuevos roles o permisos, cambios en cómo se registran datos o reorganización de apartados). Debe mantenerse siempre redactado en lenguaje sencillo, claro y útil para cualquier persona del equipo sin conocimientos técnicos, y **sin emojis** (DM-01).

---

## 1. Qué es este sistema y cuál es su idea principal

**Brain Up Hub / Clockify** es la oficina digital interna de **Brain Up Grup**. Reúne en un solo sitio las herramientas diarias de la agencia:

- Apuntar cuánto tiempo se dedica a cada empresa cliente.
- Vigilar si a los clientes con cuota mensual les faltan horas, les sobran o van exactos.
- Organizar entregas, reuniones y recordatorios en calendario y post-its.
- Hablar por canales ordenados por cliente sin perder mensajes importantes.
- Controlar fechas de caducidad de dominios y servidores (hostings).
- Subir archivos para revisión interna y compartir entregas validadas con los clientes.

**Regla básica que lo ordena todo:** en la agencia **no trabajamos por proyectos sueltos**. Todo (horas, archivos, canales de chat o tareas) se clasifica directamente bajo el nombre de la **Empresa / Cliente**.

---

## 2. Cómo se entra y qué puede hacer cada persona

Al iniciar sesión se llega al **Hub**, que es la pantalla de entrada con todas las herramientas disponibles. Cada usuario puede marcar sus herramientas favoritas con una estrella para encontrarlas antes —guardadas en la nube para verlas igual desde cualquier ordenador—, revisar su **Centro de Notificaciones** sincronizado y gestionar su foto y datos básicos en **Mi Perfil**.

Existen **3 niveles de acceso**:

1. **Trabajador / Empleado**
   - Solo puede entrar cuando la coordinadora ha aceptado su solicitud de registro.
   - Registra sus propias horas y usa las herramientas del Hub que la coordinadora le haya activado.
   - Nunca ve el rendimiento económico, las claves ni el registro de horas de otros compañeros.

2. **Coordinadora (Doble papel automático)**
   - Conserva su vista personal de **Trabajadora** para seguir fichando sus propias horas como cualquier miembro del equipo.
   - Además, accede al **Panel de Coordinación**, desde donde supervisa las horas de toda la agencia, aprueba o rechaza nuevas cuentas, gestiona clientes, revisa entregables, decide qué herramientas ve cada trabajador y genera informes para clientes.

3. **Administrador General (Super Admin)**
   - Tiene el control técnico superior: crea cuentas directas, asigna contraseñas temporales si alguien olvida la suya, modifica roles entre usuarios y consulta el registro histórico de seguridad.

### Cómo entra una persona nueva al equipo
1. La coordinadora copia y envía el **enlace oficial de invitación** de registro (`/register`).
2. La persona nueva rellena su nombre, correo y contraseña.
3. Su cuenta queda guardada en espera (**estado pendiente**) y **no puede entrar todavía**.
4. Solo cuando la coordinadora pulsa **"Aceptar Empleado"** en su panel, la persona ya puede iniciar sesión con normalidad.

---

## 3. Apartados y herramientas de la plataforma

### 3.1. Brain Time — Control Horario y Cronómetro Flotante
Es el apartado diario para imputar el tiempo trabajado por cliente.

- **Selección visual de cliente:** Arriba se elige la empresa con su logotipo.
- **Dos maneras de apuntar el tiempo:**
  1. **Cronómetro en directo:** se pulsa iniciar, sigue contando mientras trabajas y al parar queda guardado. También se puede abrir en **ventana flotante** (una ventanita pequeña aparte para tenerla a la vista en una esquina de la pantalla).
  2. **Escritura rápida sin reloj (para trabajo ya hecho):** permite poner tramo horario (`inicio - fin`) o escribir números cortos para ir rápido:
     - `3` equivale a **3 horas**.
     - `330` equivale a **3 horas y 30 minutos**.
     - `145` equivale a **1 hora y 45 minutos**.
     - `45m` equivale a **45 minutos**.
- **Horas de Cuota vs. Trabajos Puntuales:** Cuando un cliente tiene una bolsa mensual fija de horas, el trabajador elige si el registro entra dentro de esa **Cuota mensual** o si es un **Trabajo Puntual / Extra**.
- **Lista diaria limpia y editable en el acto:**
  - Los días anteriores se muestran plegados para no llenar la pantalla de información.
  - En cada registro aparece arriba el **logo y nombre grande de la empresa**, justo al lado la **franja horaria con su icono de lápiz** para corregir día o tramo horario, y debajo la **descripción de la tarea realizada**.
  - Haciendo clic encima del texto o del tiempo se edita al instante; a la derecha hay una papelera con aviso de confirmación por si hay que eliminar un registro duplicado o erróneo.

---

### 3.2. Panel de Coordinación — Cuotas, Estadísticas, Informes y Equipo
Es el centro de control para dirección y coordinación.

- **Control al milímetro de Clientes Cuota vs. Puntuales:**
  - Para clientes con cuota mensual fija (ej. 15h/mes), calcula automáticamente la diferencia respecto a lo pactado:
    - **"Horas faltantes: Xh Ym"** (aviso en color ámbar cuando aún faltan horas por cubrir).
    - **"Horas sobrantes: Xh Ym"** (aviso en color ciruela cuando se ha superado la cuota).
    - **"Cuota cumplida al milímetro"** (en verde cuando cuadra exacto).
  - Para clientes puntuales, registra todas las horas bajo demanda sin bolsa mensual.
- **3 vistas de lectura para analizar el mes:**
  1. **General:** visión global de toda la agencia, reparto entre cuota y puntual y estado de cada empresa.
  2. **Por Empresa / Cliente:** ficha comercial del cliente, balance exacto de sus horas, personas que han trabajado en él y listado de tareas.
  3. **Por Empleado:** dedicación individual de cada persona repartida en porcentajes por cliente y detalle cronológico.
- **Informes listos para enviar:**
  - **PDF Vertical (A4):** documento elegante con ficha completa del cliente (razón social, NIF/CIF, contacto, responsable de cuenta, modelo comercial), gráfico visual de cuota y listado de trabajos.
  - **Excel (`.xlsx`) humano:** archivo organizado en pestañas separadas (*Balance Cuotas Clientes*, *Registro Detallado* y *Rendimiento por Empleado*) con formatos de horas fáciles de leer.
- **Gestión de Empresas, Logos, Desglose de Cuota y Equipo:** alta/edición de clientes, activación o desactivación de clientes inactivos, subida o asignación de logotipos, lista de actividades en las que se dedica la cuota de cada empresa (visible al pasar el ratón por las horas pactadas en el listado), validación de cuentas pendientes, asignación de contraseñas y matriz para elegir qué apps del Hub puede usar cada empleado.

---

### 3.3. Brain Schedule (`TaskFlow`) — Calendario, Tareas y Post-its
El planificador visual de entregas, citas y notas rápidas de la agencia.

- **Calendario flexible con múltiples vistas:** semana laboral (**Lunes a Viernes**), vista de **día** (tramos de 08:00 a 20:00), **mes completo**, vista **anual** panorámica, tablero **Kanban** por columnas y vista en **lista**.
- **Tiras de colores y listas temáticas:** permite crear listas propias (*General*, *Diseño*, *Web & SEO*, *Reuniones*, etc.) y elegir libremente cualquier color de tira para distinguir entregas al instante.
- **Prioridades claras:** Alta / Urgente (rojo), Media (ámbar) y Baja o completada (verde).
- **Auto-desplazamiento de tareas pendientes:** si se activa en una tarea y no se completa en el día previsto, salta sola hacia delante (`+1 día`, `+2 días`, etc.) para que no quede olvidada.
- **Mural de Post-its:** tablón visual con notas adhesivas rápidas, avisos y recordatorios.
- **Conexión directa con el cronómetro y calendarios externos:** desde cualquier tarea puedes arrancar el cronómetro de **Brain Time** con un clic (ya rellenado con la empresa y la tarea) o exportarla a **Google Calendar**, **Outlook** o **Apple Calendar** (`.ics`).

---

### 3.4. Brain Chat — Comunicación por Clientes sin Ruido
Mensajería interna inspirada en Slack, ordenada para que el trabajo importante no se pierda entre conversaciones.

- **Organización clara:** canales propios para cada **Cliente**, canales de **Grupos internos** y **Mensajes directos** entre compañeros.
- **Portada "Mi Resumen / Lo Importante de Hoy":** nada más entrar reúne en una vista rápida solo las tareas pendientes asignadas a ti, mensajes fijados importantes y actividad reciente en tus clientes.
- **Mensajes convertibles en tarea:** cualquier mensaje del chat se puede marcar como tarea para ti o para un compañero, con prioridad (*Normal* o *Urgente*) y botón directo para marcarlo como *Hecho*.

---

### 3.5. Hosting Control — Dominios, Servidores y Avisos de Renovación
Panel centralizado para llevar al día los alojamientos web y dominios de los clientes.

- **Inventario completo:** guarda el dominio o servicio, tipo (*Hosting*, *Dominio*, etc.), proveedor, cliente asociado, renovación automática o manual, método de pago, fecha de caducidad, coste y precio al cliente.
- **Alertas automáticas escalonadas:** avisa por tramos cuando faltan **90, 60, 30, 15 y 7 días** antes del vencimiento para evitar caducidades inesperadas.
- **Importación, exportación y avisos por correo:** admite carga y descarga rápida en CSV y envío/gestión de avisos por email para coordinación.

---

### 3.6. Brain Storage y Portal del Cliente (`Archivos`)
Flujo ordenado para revisar entregables internamente antes de enseñarlos al cliente *(actualmente operando en modo simulador activo)*.

- **Recuadros por empresa:** al entrar ves los clientes en tarjetas; al abrir uno entras en su carpeta de trabajo.
- **Circuito de validación en dos pasos:**
  1. El **trabajador** sube un entregable.
  2. La **coordinadora** lo revisa y elige entre **pedir correcciones** (indicando el motivo para avisar al trabajador) o **validarlo**.
- **Portal aislado para el Cliente:** si la coordinadora activa el enlace privado de un cliente, ese cliente accede con su enlace único únicamente a su espacio: ve sus entregables validados y puede subir documentación o briefings para la agencia, sin ver nada de otros clientes ni datos internos de horas.

---

### 3.7. Brain Subtitles *(Pausado temporalmente)*
Módulo integrado para generar subtítulos automáticos de vídeos médicos o corporativos. Se mantiene visible en el Hub en estado de **Mantenimiento / Pausado** de forma intencionada para evitar consumos mientras no haya proyectos continuos de subtitulado.

---

## 4. Diseño visual y forma de trabajar ("La Abuela" y Mínimo Scroll)

Toda la aplicación comparte las mismas reglas visuales para que resulte cómoda tras horas frente a la pantalla:

- **Estética luminosa "La Abuela":** fondo blanco limpio con tonos lila suave, acentos en ciruela corporativo y verde para acciones de exportación a Excel. **No utiliza modo oscuro** ni **emojis** en ningún punto de la interfaz.
- **Política de Mínimo Scroll:** las pantallas y las ventanas emergentes para crear o editar datos se organizan en columnas compactas para que todo quepa de un vistazo en pantalla sin estar subiendo y bajando continuamente con el ratón.
- **Aprovechamiento al 100% del monitor:** la interfaz se adapta de lado a lado tanto en portátiles como en monitores grandes.

---

## 5. Seguridad y privacidad en términos simples

- **Acceso validado antes de entrar:** ninguna cuenta nueva puede acceder hasta que la coordinadora la aprueba manualmente. Además, el sistema bloquea temporalmente intentos repetidos con contraseña errónea de forma persistente aunque cambie de servidor.
- **Aislamiento según rol y permisos reales de herramientas:** cada empleado accede exclusivamente a sus horas y a las herramientas que la coordinadora le haya activado en la matriz del Hub; esos permisos se guardan en la nube y se comprueban también en el servidor (no solo en pantalla), aplicándose en cualquier ordenador desde el que entre.
- **Controles en el servidor antes de mostrar o guardar datos:** todas las lecturas y guardados de horas, empresas, perfiles, tareas de calendario, servicios de hosting, Brain Chat, notificaciones y auditoría pasan primero por filtros del servidor que verifican quién está pidiendo la información y si tiene permiso real antes de tocar la base de datos.
- **Protección de contraseñas:** las contraseñas (incluidas las claves temporales de primer acceso) se almacenan únicamente en la bóveda protegida de la base de datos en producción y nunca se muestran ni se envían en las listas de usuarios.
