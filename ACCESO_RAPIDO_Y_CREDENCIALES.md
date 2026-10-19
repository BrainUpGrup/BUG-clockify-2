# 🚀 Brain Up Grup • Credenciales de Acceso Rápido y Resumen del Proyecto

Este documento reúne todas las **credenciales de prueba**, las **rutas de acceso directo** y el **resumen exhaustivo de todas las funcionalidades** desarrolladas en la plataforma corporativa de **Brain Up Grup**.

---

## 🔑 1. Credenciales de Prueba (Demostración)

Puedes iniciar sesión en la pantalla de login:
👉 **[http://localhost:3000/login](http://localhost:3000/login)**

> 💡 **¡Novedad! Acceso con 1 solo Clic:** En la pantalla de login `/login` tienes ahora **botones directos** para acceder instantáneamente como Coordinadora, Empleado o Super Administrador sin tener que escribir la contraseña.

| Rol | Correo Electrónico | Contraseña | Permisos y Vistas Principales |
| :--- | :--- | :--- | :--- |
| **👩‍💼 Coordinadora de Operaciones** *(Recomendado para demos)* | `coordinacion@brainupgrup.com` | `BrainUp2026!` | Panel de Coordinación, aprobación de horas, gestión de clientes, bolsas de horas, acceso a TaskFlow y Chat. |
| **👨‍💻 Empleado / Trabajador** | `empleado@brainupgrup.com` | `BrainUp2026!` | Control horario de empleado (Clockify), temporizador en curso, TaskFlow (tareas/post-its), Chat corporativo. |
| **👑 Super Administrador** | `appadmin@brainupgrup.com` | `fn.5loDnrTTfI2z!` | Gestión global de sistemas, activación/rechazo de empleados, configuración de seguridad. |

*Nota:* Para las cuentas de prueba, la plataforma también acepta variantes sin signos ni mayúsculas (ej. `coordinadora@brainupgrup.com` o `brainup2026`).

---

## 🧭 2. Mapa de Rutas y Enlaces Directos

| Módulo | Enlace Local | Descripción |
| :--- | :--- | :--- |
| **Hub General de Aplicaciones** | [http://localhost:3000/hub](http://localhost:3000/hub) | Portal lanzador central hacia todas las herramientas de Brain Up. |
| **Clockify • Vista Empleado** | [http://localhost:3000/dashboard/employee](http://localhost:3000/dashboard/employee) | Registro de jornada y tiempo imputado por cliente y bolsa pactada. |
| **Clockify • Vista Coordinación** | [http://localhost:3000/dashboard/coordinator](http://localhost:3000/dashboard/coordinator) | Supervisión mensual, estado de cuotas de clientes y reportes PDF/Excel. |
| **Clockify • Vista Administración** | [http://localhost:3000/dashboard/admin](http://localhost:3000/dashboard/admin) | Panel de control de usuarios y accesos corporativos. |
| **TaskFlow • Tareas & Post-Its** | [http://localhost:3000/apps/taskflow](http://localhost:3000/apps/taskflow) | Calendario laboral, Drag & Drop de tareas, Post-its con alertas y notificaciones. |
| **Chat Corporativo** | [http://localhost:3000/apps/chat](http://localhost:3000/apps/chat) | Mensajería tipo Slack por cliente y equipo, con panel de Alertas Clave. |
| **Temporizador Flotante (Popup)** | [http://localhost:3000/floating-timer](http://localhost:3000/floating-timer) | Ventana flotante compacta independiente para multitarea. |

---

## 🛠️ 3. Resumen de Todo lo Realizado

### A. Elemento Destacado: Temporizador Flotante Multitarea (`Always-on-Top`)
Ubicado en el navbar superior en la píldora `[ EMPRESA EN CURSO | 00:00:00 ]`:
1. **Modo Document Picture-in-Picture (`↗ Flotante`):**
   * Al pulsar el botón `Flotante` en la cabecera, se abre una ventana nativa del sistema operativo que **permanece siempre por encima** de cualquier otra ventana o programa (WordPress, Canva, Google Docs, etc.).
   * Incluye control directo de **PARAR (Rojo)**, **INICIAR (Verde)** y un botón para **VOLVER A LA APP** en un solo clic.
2. **Modo Widget Arrastrable (`📌 Fijar`):**
   * Al pulsar el icono de fijar, aparece una cápsula flotante arrastrable con el ratón.
   * Te sigue automáticamente al cambiar de página dentro del Hub y **recuerda su posición en pantalla** (`localStorage`).
3. **Lanzador de Escritorio (`Iniciar_Ventana_Flotante.bat`):**
   * Script en la raíz del proyecto para abrir el mini-temporizador en modo ventana de escritorio sin marcos de navegador ni pestañas.
4. **Sincronización Bidireccional:** Todo cambio de estado (inicio o parada del cronómetro) se propaga al instante entre ventanas y pestañas.

---

### B. TaskFlow (Gestión de Trabajo, Calendario y Recordatorios)
* **Calendario Laboral de Lunes a Viernes:** Eliminación de sábados y domingos para optimizar el espacio horizontal y evitar scroll innecesario.
* **Arrastre Interactivo (Drag & Drop):** Posibilidad de mover eventos y tareas entre días del calendario simplemente arrastrándolos con el cursor.
* **Auto-Desplazamiento Inteligente:** Opción para que las tareas no terminadas se desplacen automáticamente a los días seleccionados por el usuario, o realizar el desplazamiento manual en cualquier momento del día.
* **Paleta de Colores Flexibles:** Selección de colores de Google Calendar y soporte para códigos personalizados RGB/Hexadecimal para listas y tareas.
* **Sistema de Post-Its Simplificado:** Sustitución del tablero kanban por un tablón de post-its para recordatorios directos.
* **Alertas Escalonadas y Centro de Notificaciones:** Posibilidad de programar hasta 4 avisos automáticos por post-it (ej. 20 días antes, 15 días antes, 1 día antes, 1 hora antes) visibles en la barra lateral de notificaciones.
* **Mínimo Scroll Garantizado:** Ajuste compacto de altura y layouts en todas las pantallas.

---

### C. Chat Corporativo en Tiempo Real (Estilo Slack)
* **Estructura por Canales y Clientes:** Canales específicos por cliente, grupos internos de trabajo y mensajes directos 1 a 1.
* **Panel Superior de "Resumen & Alertas":** Visualización instantánea al entrar de los mensajes clave y pendientes sin necesidad de bucear en hilos interminables.
* **Paleta Google Calendar:** Fondos, etiquetas y badges optimizados con la paleta de colores de calendario para mantener legibilidad visual y contraste.
* **Integración Supabase Realtime:** Mensajería reactiva en tiempo real.

---

### D. Control Horario y Facturación (Clockify)
* **Doble Bolsa de Horas:** Separación limpia entre horas de cuota mensual pactada por contrato y horas puntuales/extra facturables.
* **Temporizador con Selector Rápido:** Cambio ágil de cliente activo y control de jornada.
* **Supervisión de Coordinación:** Gráficos de cumplimiento de bolsas, historial detallado y filtros avanzados.
* **Exportación de Informes Oficiales:** Generación de informes en PDF con membrete de Brain Up Grup y hojas de cálculo Excel.

---

### E. Integridad del Estudio de Usabilidad y Documentación
* Los archivos del estudio de usabilidad (**`Estudio_Usabilidad_Brain_Up_Grup.pdf`**, `estudio_usabilidad_brain_up.html`, `estudio_usabilidad_brain_up.md` y capturas asociadas) se mantienen **100% intactos e inalterados** para tu presentación con dirección.

---

## 🏃 4. Cómo Iniciar el Proyecto Localmente

Si el servidor se detuviese en algún momento, se inicia con:
```bash
npm run dev
```
Y para abrir el temporizador flotante en ventana compacta de Windows:
* Haz doble clic sobre el archivo **`Iniciar_Ventana_Flotante.bat`** en la carpeta principal.
