# Contexto del Proyecto - Peluquería Backend

## Stack Tecnológico
- **Backend**: NestJS + Prisma + PostgreSQL + Docker
- **Frontend**: Angular Signals (Zoneless) + Tailwind (futuro)
- **Patrones**: SOLID, DRY, KISS, Inmutabilidad, Builder, Adapter, Facade, State, Strategy, Observer/Mediator

## Módulos Implementados
- **Auth**: JWT (login por usuario/email, register, profile). Ver notas de seguridad abajo.
- **Personas**: CRUD completo, búsqueda por nombre/instagram
- **Servicios**: CRUD con soft delete (eliminación lógica)
- **Turnos**: CRUD + Patrón State (PENDIENTE → CONFIRMADO → EN_PROCESO → COMPLETADO → CANCELADO)
- **Caja**: Pagos, Movimientos, Cierre de Caja con Strategy + Facade
- **Google Calendar**: Integración completa para sincronizar turnos. Ver detalles abajo.

## Patrones de Diseño Aplicados
- **State**: Turnos (transiciones de estado encapsuladas)
- **Strategy**: Cierre de Caja (cálculo de totales por forma de pago)
- **Facade**: CajaFacade (coordina pago + movimiento + actualización de turno)
- **Builder**: DTOs con readonly
- **Inmutabilidad**: Angular Signals y DTOs readonly

## Estado Actual
- **Tests**: 61 unitarios + 28 E2E = 89 tests pasando
- **Swagger UI**: Disponible en `/api/docs`
- **Seed**: Datos iniciales (formas de pago, usuario admin)

## Decisiones Clave
- **Prisma sobre TypeORM**: Mejor DX, migraciones confiables, type safety end-to-end
- **Un único profesional**: No multi-tenancy
- **JWT**: Protege todos los endpoints excepto auth/login y auth/register
- **Eliminación lógica**: Servicios (vigente=false), hard delete en Personas

## Notas de Seguridad (Auth)
- **Login por usuario o email**: El campo `login` acepta tanto nombre de usuario como email. Internamente busca primero por usuario, luego por email.
- **Respuesta de login mínima**: Solo devuelve `access_token` + `user` con `{ usuario, email, rol }`. No incluye nombre, apellido, persona ni hash.
- **Respuesta de register mínima**: Solo devuelve `{ usuario, email, rol }`. No expone el objeto `persona` completo.
- **Profile reducido**: El endpoint `/api/auth/profile` devuelve solo `{ usuario, email, rol }`. No incluye datos personales ni hash de contraseña.
- **Interface `UserPublic`**: Define explícitamente qué datos son públicos del usuario (`usuario`, `email`, `rol`).
- **validateUser**: No incluye `persona` en la query de Prisma, evitando carga innecesaria de datos personales.
- **getProfile**: No incluye `persona` en la query de Prisma.
- **register**: No incluye `include: { persona: true }` en la creación de usuario.

## Google Calendar Integration

### Configuración
- **Variables de entorno**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_CALENDAR_ID`
- **OAuth2**: Flujo estándar de Google OAuth2 con `offline` access type para obtener refresh token.
- **Modelo `GoogleCalendarConfig`**: Guarda `accessToken`, `refreshToken`, `expiryDate`, `calendarId` en la base de datos.
- **Modelo `Turno`**: Campo `googleEventId` para vincular eventos de Google Calendar.

### Endpoints
- `GET /api/google-calendar/status`: Verifica si está configurado y conectado. Si no está conectado pero sí configurado, devuelve la URL de autorización.
- `GET /api/google-calendar/auth-url`: Obtiene la URL de autorización de Google OAuth2.
- `POST /api/google-calendar/connect?code={code}`: Conecta Google Calendar con el código de autorización.
- `DELETE /api/google-calendar/disconnect`: Desconecta Google Calendar (elimina tokens).

### Sincronización Automática
- **Crear turno**: Automáticamente crea evento en Google Calendar. Si falla, no interrumpe la creación del turno (silencioso).
- **Editar turno**: Actualiza el evento en Google Calendar si existe.
- **Cancelar turno**: Elimina el evento de Google Calendar y limpia `googleEventId`.
- **No-show**: Elimina el evento de Google Calendar y limpia `googleEventId`.
- **Eliminar turno**: Elimina el evento de Google Calendar antes de borrar el turno.
- **Timezone**: Los eventos se crean con timezone `America/Argentina/Buenos_Aires`.

### Características de Seguridad
- **Fail-safe**: Si Google Calendar no está configurado o conectado, las operaciones de turnos funcionan normalmente sin error.
- **No expone tokens**: Los endpoints nunca devuelven tokens de Google en la respuesta.
- **Soft fail**: Si la API de Google falla (rate limit, token expirado), la operación del turno sigue funcionando.

## Próximos Pasos
1. Desarrollo frontend Angular
2. Reportes y estadísticas
3. Notificaciones por email/SMS

## Notas Técnicas
- `PrismaServiceMock` en `test/mocks/prisma.service.mock.ts` para tests unitarios
- `cleanDatabase` en `test/setup-e2e.ts` trunca tablas en orden por foreign keys
- `getAuthToken` en `test/helpers/auth.helper.ts` crea usuarios únicos por timestamp
- `Decimal` en Prisma se serializa como string en JSON; usar `Number()` para comparar en tests
- `horaFin` en `CierreCaja` es nullable
- `MovimientoTipo` enum: INGRESO, EGRESO
- `TurnoEstado` enum: PENDIENTE, CONFIRMADO, EN_PROCESO, COMPLETADO, CANCELADO, NO_SHOW
- `googleapis` versión `^131.0.0` en dependencias
- Migración: `20260607070432_add_google_calendar` agregó `googleEventId` a `Turno` y modelo `GoogleCalendarConfig`
