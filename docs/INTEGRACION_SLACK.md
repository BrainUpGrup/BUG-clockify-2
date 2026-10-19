# Integración de Slack en Brain Up Hub

**Estado:** propuesta + esqueleto de código (sin credenciales reales).
**Sustituye a:** chat propio (`src/app/apps/chat`, `src/components/chat/*`, `src/lib/chat-service.ts`, `schema_chat.sql`).
**Principio:** Slack es la fuente de verdad de la conversación. El Hub **no reimplementa** un cliente de chat: refleja en "Mi Resumen" lo que importa (tareas asignadas, novedades por cliente, mensajes fijados) y enlaza a Slack para conversar.

---

## 1. Arquitectura

```
                 Slack (workspace Brain Up)
   OAuth v2 |      Events API |      Interactivity |      Web API
            v                 v                     v           ^
  /api/slack/oauth/*   /api/slack/events   /api/slack/interactivity   (lib/slack/client.ts)
            \                 |                     /           |
             \                v                    /            |
              +-----> Supabase (tablas slack_*) <-+   /api/slack/sync (backfill)
                              |
                              v
               /api/slack/summary  -->  "Mi Resumen" (SummaryDashboard)
               /api/slack/tasks/[id] (completar tarea desde el Hub)
```

- Todas las rutas son **Route Handlers de Next.js en runtime Node** (`src/app/api/slack/*`).
- El navegador **nunca** ve tokens de Slack: solo consume `/api/slack/summary` y `/api/slack/tasks/*`.
- El servidor escribe en Supabase con la **service role key** (solo servidor). Las tablas `slack_*` tienen RLS: los usuarios autenticados solo leen lo que les toca; los tokens no son legibles por nadie salvo la service role.

### 1.1 Slack App (OAuth v2)

App **interna de un único workspace** (no distribuida en el Marketplace). Esto importa: desde 2025 Slack limita fuertemente `conversations.history` / `conversations.replies` para apps distribuidas fuera del Marketplace; las apps internas del propio cliente mantienen los límites normales (Tier 3). Revisar la política vigente al crear la app.

Flujo:
1. Coordinador pulsa "Conectar Slack" en el Hub -> `GET /api/slack/oauth/install` (genera `state` en cookie httpOnly y redirige a `https://slack.com/oauth/v2/authorize`).
2. Slack vuelve a `GET /api/slack/oauth/callback?code&state` -> valida `state`, llama a `oauth.v2.access`, cifra el bot token y lo guarda en `slack_installations`.
3. Cada empleado puede, opcionalmente, vincular su cuenta (mismo flujo con `user_scope`) para que el Hub sepa su `slack_user_id`. Alternativa sin clic: emparejar por email con `users.lookupByEmail` (requiere `users:read.email`). **Recomendado: emparejado por email automático + vinculación manual como respaldo.**

### 1.2 Scopes

**Bot token (`xoxb-`)** – mínimo necesario:

| Scope | Uso |
|---|---|
| `channels:read`, `groups:read` | Listar canales públicos / privados en los que está el bot (mapeo canal - cliente). |
| `channels:history`, `groups:history` | Leer mensajes para novedades y backfill. Eventos `message.channels` / `message.groups`. |
| `pins:read` | `pins.list` y eventos `pin_added` / `pin_removed` (Avisos Fijados). |
| `reactions:read` | Convención opcional de tarea rápida por reacción. |
| `users:read`, `users:read.email` | Nombres/avatares y emparejado de perfiles por email. |
| `chat:write` | Responder en hilo al completar una tarea ("Completada en Brain Up Hub por ..."). |
| `commands` | Atajo de mensaje "Convertir en tarea" (message shortcut). |

No se piden `im:history` ni `mpim:history`: los DMs quedan fuera del Hub por privacidad (decisión a validar con el usuario).

**User token (`xoxp-`)** – opcional, solo si se quiere que el Hub actúe "como" el empleado: `identity`-like con `users:read` o OpenID (`openid`, `email`) para "Sign in with Slack". En la primera fase **no** se guardan user tokens.

### 1.3 Events API vs polling

**Events API como canal principal + backfill puntual por Web API.**

- `POST /api/slack/events`: verifica la firma (`X-Slack-Signature`, HMAC-SHA256 con `SLACK_SIGNING_SECRET`, ventana de 5 min), responde al `url_verification` y procesa en menos de 3 s (solo upsert en Supabase; nada de llamadas largas). Eventos suscritos: `message.channels`, `message.groups`, `pin_added`, `pin_removed`, `reaction_added`, `reaction_removed`, `channel_rename`, `channel_archive`.
- `POST /api/slack/sync` (coordinador o cron): `conversations.list` + `conversations.history` (últimos N días) + `pins.list` por canal vinculado. Cubre el arranque inicial y huecos si el endpoint estuvo caído (Slack reintenta 3 veces y luego descarta).
- **Por qué no solo polling:** coste de rate limits (cada canal es una llamada) y retraso. **Por qué no Socket Mode:** requiere un WebSocket persistente, incompatible con despliegue serverless de Next.js.
- Desarrollo local: exponer `localhost:3000` con un túnel (ngrok / cloudflared) y configurar la Request URL en la Slack App.
- Supabase Realtime sobre `slack_messages` / `slack_tasks` mantiene "Mi Resumen" en vivo sin que el navegador hable con Slack (se reutiliza el patrón de suscripción que ya existe en `apps/chat/page.tsx`).

### 1.4 Dónde guardar tokens (Supabase)

- Tabla `slack_installations` (team_id, bot_user_id, `bot_token_encrypted`, scopes, installed_by, installed_at).
- Cifrado **AES-256-GCM en la aplicación** (`src/lib/slack/crypto.ts`) con `SLACK_TOKEN_ENCRYPTION_KEY` (32 bytes base64). Alternativa equivalente: Supabase Vault (`vault.create_secret`) si el plan lo permite.
- RLS activado **sin políticas** para `anon`/`authenticated` -> solo la service role (servidor) puede leerla.
- `SUPABASE_SERVICE_ROLE_KEY`, `SLACK_CLIENT_SECRET`, `SLACK_SIGNING_SECRET` y la clave de cifrado viven solo en variables de entorno del servidor (nunca con prefijo `NEXT_PUBLIC_`).

### 1.5 Mapeo canal Slack <-> empresa/cliente (DM-04)

- Tabla `slack_channel_links (slack_channel_id PK, team_id, company_id -> companies, kind 'client' | 'group', name, is_archived)`.
- Gestión desde el Panel Coordinador (sección nueva junto a `company-crud.tsx`): lista de canales del bot con un `AppSelect` (DM-02) para asignar empresa.
- Sugerencia automática por convención de nombre: `cli-<slug-empresa>` -> se propone la empresa cuyo nombre normalizado coincide; el coordinador confirma.
- Solo los canales con vínculo aparecen en "Novedades en tus Clientes"; los `group` alimentan los avisos fijados de agencia.
- Mapeo de personas: `slack_user_links (profile_id PK, slack_user_id UNIQUE, team_id)`.

### 1.6 "Mensaje como tarea"

Slack no tiene un concepto nativo de "tarea asignada" utilizable por API, así que la tarea vive en el Hub y **apunta** al mensaje de Slack (`channel_id` + `ts`).

1. **Atajo de mensaje "Convertir en tarea (Brain Up)"** (Interactivity, callback `bu_convert_to_task`): abre un modal en Slack con responsable (`users_select`), prioridad (`normal` / `urgent`) y fecha límite opcional. Al enviarlo, `POST /api/slack/interactivity` crea la fila en `slack_tasks` y responde en hilo "Tarea asignada a @persona".
2. **Completar desde el Hub**: `PATCH /api/slack/tasks/[id]` marca `is_completed` y publica en el hilo "Completada en Brain Up Hub por X" (trazabilidad para el cliente interno).
3. **Atajo rápido opcional**: una reacción acordada (p. ej. `:tarea:` personalizada) + mención crea tarea para el mencionado. Se deja como fase 2 porque es ambiguo (varias menciones, quién la creó).
4. Puente con TaskFlow (fase 2): `slack_tasks` puede generar una tarjeta en el kanban con `company_id` heredado del canal.

### 1.7 Qué consume "Mi Resumen"

`GET /api/slack/summary` (usuario autenticado en Supabase) devuelve:

| Bloque del panel | Fuente |
|---|---|
| Para Hacer / Revisar por ti | `slack_tasks` con `assignee_profile_id = auth.uid()` y no completadas, unidas a canal y empresa. |
| Novedades en tus Clientes | `slack_channel_links` (kind `client`) + nº de `slack_messages` posteriores a `slack_channel_reads.last_seen_at` del usuario. Slack no expone "no leídos" a un bot, así que el contador es **del Hub** ("nuevos desde tu última visita"). |
| Avisos Fijados Recientes | `slack_messages` con `is_pinned = true`, ordenados por `pinned_at`. |

Cada tarjeta lleva un `permalink` (`chat.getPermalink`, cacheado) -> el botón "Ir al canal" abre Slack (app de escritorio vía `slack://` o web).

El shape de respuesta se mantiene compatible con las props actuales de `SummaryDashboard` (`Channel`, `ChatMessage`) para reutilizar el componente sin rediseño.

---

## 2. Qué se reutiliza y qué se elimina del chat actual

| Pieza | Decisión | Motivo |
|---|---|---|
| `src/components/chat/summary-dashboard.tsx` | **Reutilizar** | Es presentacional; solo cambian origen de datos y "Ir al canal" -> permalink de Slack. Pasa a `src/components/slack/`. |
| `src/types/chat.ts` (`Channel`, `ChatMessage`) | **Reutilizar / adaptar** | El shape encaja; se añaden `slack_channel_id`, `ts`, `permalink`. Nuevos tipos en `src/types/slack.ts`. |
| `src/app/apps/chat/page.tsx` | **Reescribir** (misma ruta) | Pasa a ser la vista "Brain Up Slack": Mi Resumen + estado de conexión. Se conserva la comprobación de permisos `canUserAccessHubApp(user, 'chat')` y el patrón Realtime. |
| `src/lib/hub-apps.ts` (entrada `chat`) | **Adaptar** | Renombrar a "Brain Up Slack", mismo `id` para no romper la matriz de permisos. |
| `src/components/chat/rail-sidebar.tsx` | **Eliminar** (o reducir) | Navegación de cliente de chat; con Slack no hay canales que navegar dentro del Hub. |
| `src/components/chat/channels-sidebar.tsx` | **Eliminar** | Ídem. La lista de clientes ya está en el bloque "Novedades". |
| `src/components/chat/chat-view.tsx` | **Eliminar** | Composer e hilo de mensajes: lo hace Slack. |
| `src/components/chat/create-channel-modal.tsx` | **Eliminar** | Los canales se crean en Slack; en el Hub solo se vinculan. |
| `src/lib/chat-service.ts` | **Eliminar** | Sustituido por `/api/slack/*` + `src/lib/slack/*`. |
| `src/lib/chat-mock-data.ts` | **Conservar temporalmente** | Como datos de demostración de "Mi Resumen" mientras no haya Slack conectado; eliminar después. |
| `schema_chat.sql` (`channels`, `channel_members`, `messages`) | **Eliminar** tras migrar | Sustituido por `schema_slack.sql`. Si hay datos reales, exportarlos antes de `DROP`. |

**Nada de lo anterior se ha borrado todavía**: requiere confirmación del usuario.

---

## 3. Esqueleto incluido en este cambio

| Archivo | Contenido |
|---|---|
| `.env.example` | Variables `SLACK_*`, `SUPABASE_SERVICE_ROLE_KEY`, `SLACK_TOKEN_ENCRYPTION_KEY` (valores de ejemplo). |
| `schema_slack.sql` | Tablas `slack_installations`, `slack_channel_links`, `slack_user_links`, `slack_messages`, `slack_tasks`, `slack_channel_reads` + RLS + Realtime. |
| `src/types/slack.ts` | Tipos de filas y del payload de resumen. |
| `src/lib/slack/config.ts` | Lectura de entorno y scopes. |
| `src/lib/slack/verify.ts` | Verificación de firma de Slack. |
| `src/lib/slack/crypto.ts` | Cifrado AES-256-GCM de tokens. |
| `src/lib/slack/client.ts` | Wrapper mínimo de la Web API con `fetch` (sin dependencias nuevas). |
| `src/lib/slack/auth.ts` | Usuario del Hub y rol a partir de la cookie de Supabase. |
| `src/lib/supabase/admin.ts` | Cliente Supabase con service role (solo servidor). |
| `src/app/api/slack/oauth/install/route.ts` | Inicio OAuth. |
| `src/app/api/slack/oauth/callback/route.ts` | Intercambio de código y guardado cifrado del token. |
| `src/app/api/slack/events/route.ts` | Events API (mensajes, pins, renombrado/archivado). |
| `src/app/api/slack/interactivity/route.ts` | Atajo "Convertir en tarea" + modal. |
| `src/app/api/slack/sync/route.ts` | Backfill de canales vinculados. |
| `src/app/api/slack/summary/route.ts` | Datos de "Mi Resumen". |
| `src/app/api/slack/tasks/[id]/route.ts` | Completar / reabrir tarea. |
| `src/app/api/slack/channels/[id]/seen/route.ts` | Marcar canal como visto (contador "nuevos" del Hub). |

Validado con `npx tsc --noEmit` (0 errores). No probado contra un workspace real de Slack.

### Pendiente (siguientes pasos)

1. Crear la Slack App en api.slack.com con los scopes de 1.2, Request URLs de Events e Interactivity y el message shortcut `bu_convert_to_task`.
2. Ejecutar `schema_slack.sql` en Supabase y rellenar `.env.local`.
3. UI de vinculación canal - empresa en el Panel Coordinador.
4. Reescribir `apps/chat/page.tsx` para consumir `/api/slack/summary` y mover `SummaryDashboard`.
5. Con confirmación del usuario: borrar las piezas marcadas "Eliminar" y `schema_chat.sql`.
6. Nota: las rutas API requieren sesión real de Supabase (cookie). El acceso directo simulado por `localStorage` no autentica contra el servidor.
