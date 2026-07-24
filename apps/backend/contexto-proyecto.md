# Contexto del Proyecto - Sistema de Gestión de Peluquería

## Stack Tecnológico
- **Backend**: NestJS + Prisma + PostgreSQL + Docker
- **Frontend**: Angular 20 Standalone + Signals + Zoneless + Tailwind CSS v3 + DaisyUI
- **Patrones**: SOLID, DRY, KISS, Inmutabilidad, Builder, Adapter, Facade, State, Strategy, Observer/Mediator

## Módulos Implementados (Backend)
- **Auth**: JWT (login por usuario/email, register, profile). Ver notas de seguridad abajo.
- **Personas**: CRUD completo, búsqueda por nombre/apellido/email/teléfono/instagram, historial de turnos por cliente
- **Servicios**: CRUD con soft delete (eliminación lógica), categorías, historial de precios/duración/vigencia
- **Turnos**: CRUD + Patrón State (PENDIENTE → CONFIRMADO → EN_PROCESO → COMPLETADO → CANCELADO)
- **Turnos Públicos**: Endpoints sin JWT para que clientes pidan turnos (`/api/turnos-publicos/disponibilidad` y `/api/turnos-publicos/reservar`)
- **Caja**: Pagos, Movimientos, Cierre de Caja con Strategy + Facade, endpoint de formas de pago
- **Reportes**: Resumen, ingresos por día, turnos por estado, top servicios, top clientes, ingresos por forma de pago
- **Google Calendar**: Integración completa para sincronizar turnos. Ver detalles abajo.

## Frontend Angular

### Estructura del Proyecto
```
peluqueria-frontend/
├── src/app/
  │   ├── core/
  │   │   ├── interceptors/     # auth.interceptor.ts (JWT)
  │   │   ├── guards/             # auth.guard.ts (authGuard, publicGuard)
  │   │   └── layout.component.ts # Sidebar lateral en desktop + navbar móvil
│   ├── features/
│   │   ├── auth/
│   │   │   └── login.component.ts
│   │   ├── dashboard/
│   │   │   └── dashboard.component.ts
│   │   ├── turnos/
│   │   │   ├── turnos.component.ts
│   │   │   └── turno-form.component.ts
│   │   ├── servicios/
│   │   │   └── servicios.component.ts
  │   │   ├── personas/
  │   │   │   └── personas.component.ts
  │   │   ├── caja/
  │   │   │   └── caja.component.ts
  │   │   ├── reportes/
  │   │   │   └── reportes.component.ts
  │   │   └── reservas/
│   │       └── reservar.component.ts
  │   ├── shared/
  │   │   ├── models/             # auth.model.ts, persona.model.ts, servicio.model.ts, turno.model.ts, caja.model.ts, reportes.model.ts
  │   │   ├── services/           # auth.service.ts, personas.service.ts, servicios.service.ts, turnos.service.ts, reservas-publicas.service.ts, caja.service.ts, reportes.service.ts
  │   │   └── ui/                 # icon.component.ts (iconos SVG inline)
│   ├── app.ts                  # Root component (standalone)
│   ├── app.config.ts           # Zoneless + Router + HTTP Client
│   └── app.routes.ts           # Rutas con lazy loading + guards
```

### Características del Frontend
- **Angular Standalone**: Sin NgModules, todo basado en `standalone: true`
- **Zoneless**: `provideZonelessChangeDetection()` - sin Zone.js
- **Signals**: Uso de `signal()` para estado reactivo (AuthService, componentes)
- **Tailwind CSS v3**: Configurado con variables CSS propias (colores `primary`, `secondary`, `destructive`, etc.) + DaisyUI plugin
- **DaisyUI**: Componentes CSS listos para usar (`btn`, `input`, `card`, `badge`, `alert`, `divider`, `stats`, `table`, `navbar`, etc.)
- **Iconos SVG**: Componente `app-icon` con iconos SVG inline propios (sin dependencias externas)
- **Lazy Loading**: Todas las páginas cargan bajo demanda
- **HTTP Client**: Con interceptor JWT automático
- **Guards**: `authGuard` (protege rutas privadas) y `publicGuard` (redirige a dashboard si ya está logueado)
- **Responsive**: Navbar colapsable en móvil, tablas scrollables y grids adaptativos

### Páginas Implementadas
| Página | Ruta | Descripción |
|--------|------|-------------|
| Login | `/login` | Formulario de inicio de sesión (admin/peluquero) |
| Dashboard | `/dashboard` | Resumen administrativo: stats del día, próximos turnos, últimos clientes, servicios más solicitados y servicios activos |
| Turnos | `/turnos` | Lista de turnos con acciones de transición de estado |
| Nuevo Turno | `/turnos/nuevo` | Formulario completo para crear turnos (admin) |
| Reservar Turno | `/reservar` | Página pública para que clientes pidan turnos |
| Servicios | `/servicios` | CRUD completo: alta, edición, categorías, toggle vigente, historial de precios/duración |
| Personas | `/personas` | CRUD completo: alta, búsqueda/filtro, detalle, edición, historial de turnos, eliminación |
| Caja | `/caja` | Resumen del día, movimientos, registrar pago, registrar egreso, cierre de caja e historial |
| Reportes | `/reportes` | Estadísticas: resumen, ingresos por día, turnos por estado, top servicios/clientes, formas de pago |
| **Reservar Turno** | **`/reservar`** | **Página pública para que clientes pidan turnos: seleccionan servicios, fecha y hora disponible** |

### Componentes UI (DaisyUI)
- `navbar`, `menu`, `stats`, `table`, `card`, `alert`, `badge`, `btn`, `form-control`, `input`, `select`, `textarea`, `divider`, `avatar`
- Estados de turnos con colores semánticos: `badge-warning` (PENDIENTE), `badge-info` (CONFIRMADO), `badge-primary` (EN_PROCESO), `badge-success` (COMPLETADO), `badge-error` (CANCELADO/NO_SHOW)
- Iconos SVG inline: `calendar`, `users`, `scissors`, `plus`, `arrow-left/right`, `check`, `x`, `log-out`, `user`, `search`, `trash`, `credit-card`, `clock`, `menu`, `alert-circle`, `check-circle`, `loader`, `edit`, `wallet`, `trending-up`, `trending-down`, `layout-grid`, `bar-chart`
- Modales nativos HTML5 `<dialog>` para detalle, edición, historial y confirmaciones
- Loading states: `btn-loading`, spinner animado en botones
- Empty states: mensajes e iconos cuando no hay datos
- Responsive: navbar colapsable, tablas con `overflow-x-auto`, grids adaptativos

### Servicios (Shared)
- `AuthService`: Login, register, logout, `currentUser` signal, `isAuthenticated` signal
- `PersonasService`: findAll, findOne, create, update, remove, search, findTurnos
- `ServiciosService`: findAll (con filtros vigente/categoría), findOne, findCategorias, create, update, remove
- `TurnosService`: findAll, create, confirmar, cancelar, iniciarAtencion, finalizar, registrarPago, noShow
- `CajaService`: findFormasPago, procesarPago, findPagosByTurno, findMovimientos, findTotales, createMovimiento, iniciarCierre, confirmarCierre, findCierre, findHistorialCierres
- `ReportesService`: getResumen, getIngresosPorDia, getTurnosPorEstado, getServicios, getClientes, getFormasPago
- `ReservasPublicasService`: `getDisponibilidad(fecha, serviciosIds)`, `reservar(data)` — endpoints públicos sin JWT

## Patrones de Diseño Aplicados (Backend)
- **State**: Turnos (transiciones de estado encapsuladas)
- **Strategy**: Cierre de Caja (cálculo de totales por forma de pago)
- **Facade**: CajaFacade (coordina pago + movimiento + actualización de turno)
- **Builder**: DTOs con readonly
- **Inmutabilidad**: Angular Signals y DTOs readonly

## Estado Actual
- **Backend Tests**: 68 unitarios + 37 E2E = 105 tests pasando
- **Frontend**: Compila exitosamente, build size ~347KB total
- **Swagger UI**: Disponible en `/api/docs`
- **Seed**: Datos realistas de demo (15 clientes, 10 servicios, ~140 turnos en 30 días, pagos, egresos, cierres de caja). Ejecutar con `npx prisma db seed`

## Decisiones Clave
- **Prisma sobre TypeORM**: Mejor DX, migraciones confiables, type safety end-to-end
- **Un único profesional**: No multi-tenancy
- **JWT**: Protege todos los endpoints excepto auth/login y auth/register
- **Eliminación lógica**: Servicios (vigente=false) con historial de cambios; hard delete en Personas
- **Historial de servicios**: Cada cambio de precio, duración o vigencia genera un registro en `ServicioHistorial`
- **DaisyUI**: Plugin de Tailwind CSS con componentes listos (button, input, card, badge, alert, divider)
- **Tailwind CSS v3**: Variables CSS propias configuradas manualmente para colores base
- **Angular CDK**: Eliminado; no se usan overlays ni componentes del CDK actualmente

## Notas de Seguridad (Auth)
- **Login por usuario o email**: El campo `login` acepta tanto nombre de usuario como email.
- **Respuesta de login mínima**: Solo devuelve `access_token` + `user` con `{ usuario, email, rol }`.
- **Respuesta de register mínima**: Solo devuelve `{ usuario, email, rol }`. No expone el objeto `persona`.
- **Profile reducido**: El endpoint `/api/auth/profile` devuelve solo `{ usuario, email, rol }`.
- **Interface `UserPublic`**: Define explícitamente qué datos son públicos.

## Reserva Pública (Clientes)

### Endpoints Públicos (sin JWT)
- `GET /api/turnos-publicos/disponibilidad?fecha=YYYY-MM-DD&servicios=1,2`: Devuelve slots disponibles (hora de inicio en ISO) para una fecha y servicios específicos. Horario de trabajo: 09:00 a 18:00, intervalos de 30 min.
- `POST /api/turnos-publicos/reservar`: Crea un turno desde el sitio público. Busca o crea la persona por email, luego crea el turno con estado PENDIENTE.

### Frontend: Página `/reservar`
Flujo en 4 pasos:
1. **Servicios**: El cliente selecciona uno o más servicios con cantidad. Muestra duración total y precio estimado.
2. **Fecha**: Calendario semanal con navegación anterior/siguiente. Solo permite seleccionar días desde hoy en adelante.
3. **Horario**: Grid de slots disponibles devueltos por el backend. Cada slot tiene en cuenta la duración total de los servicios seleccionados.
4. **Datos**: Formulario con nombre, apellido, email, teléfono y notas. Al confirmar, envía al backend y muestra mensaje de éxito.

### Google Calendar
- Cuando un cliente reserva un turno público, el backend sincroniza automáticamente con Google Calendar (si está conectado).
- El cliente no necesita hacer nada extra; el evento aparece en el calendario del peluquero.

## Google Calendar Integration

### Configuración
- **Variables de entorno**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_CALENDAR_ID`
- **OAuth2**: Flujo estándar con `offline` access type.
- **Modelo `GoogleCalendarConfig`**: Guarda tokens en base de datos.
- **Modelo `Turno`**: Campo `googleEventId`.

### Endpoints
- `GET /api/google-calendar/status`
- `GET /api/google-calendar/auth-url`
- `POST /api/google-calendar/connect?code={code}`
- `DELETE /api/google-calendar/disconnect`

### Sincronización Automática
- **Crear**: Crea evento en Google Calendar
- **Editar**: Actualiza evento
- **Cancelar/No-show**: Elimina evento y limpia `googleEventId`
- **Eliminar**: Elimina evento antes de borrar turno

## Próximos Pasos
1. Notificaciones por email/SMS
2. Configuración de Google Calendar en frontend
3. Mejoras de UX (calendario semanal, recordatorios automáticos)

## Notas Técnicas
- **Backend**: `PrismaServiceMock` en `test/mocks/prisma.service.mock.ts`
- **Backend**: `cleanDatabase` en `test/setup-e2e.ts`
- **Backend**: `getAuthToken` en `test/helpers/auth.helper.ts`
- **Backend**: `Decimal` en Prisma se serializa como string; usar `Number()` en tests
- **Frontend**: `app.config.ts` usa `provideZonelessChangeDetection()`
- **Frontend**: `app.config.ts` usa `provideHttpClient(withInterceptors([authInterceptor]))`
- **Frontend**: `app.routes.ts` usa lazy loading para todas las páginas
- **Frontend**: `AuthService` usa `signal()` para `currentUser` e `isAuthenticated`
- **Frontend**: `tailwind.config.js` usa `darkMode: ['class']` y el plugin `daisyui` con tema `light`
