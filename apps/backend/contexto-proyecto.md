# Contexto del Proyecto - Peluquería Backend

## Stack Tecnológico
- **Backend**: NestJS + Prisma + PostgreSQL + Docker
- **Frontend**: Angular Signals (Zoneless) + Tailwind (futuro)
- **Patrones**: SOLID, DRY, KISS, Inmutabilidad, Builder, Adapter, Facade, State, Strategy, Observer/Mediator

## Módulos Implementados
- **Auth**: JWT (login por usuario/email, register, protección de endpoints). Ver notas de seguridad abajo.
- **Personas**: CRUD completo, búsqueda por nombre/instagram
- **Servicios**: CRUD con soft delete (eliminación lógica)
- **Turnos**: Patrón State para transiciones de estados (PENDIENTE → CONFIRMADO → EN_PROCESO → COMPLETADO → CANCELADO)
- **Caja**: Pagos, Movimientos, Cierre de Caja con Strategy + Facade

## Patrones de Diseño Aplicados
- **State**: Turnos (transiciones de estado encapsuladas)
- **Strategy**: Cierre de Caja (cálculo de totales por forma de pago)
- **Facade**: CajaFacade (coordina pago + movimiento + actualización de turno)
- **Builder**: DTOs con readonly
- **Inmutabilidad**: Angular Signals y DTOs readonly

## Estado Actual
- **Tests**: 49 unitarios + 28 E2E = 77 tests pasando
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

## Próximos Pasos
1. Desarrollo frontend Angular
2. Integración Google Calendar
3. Reportes y estadísticas

## Notas Técnicas
- `PrismaServiceMock` en `test/mocks/prisma.service.mock.ts` para tests unitarios
- `cleanDatabase` en `test/setup-e2e.ts` trunca tablas en orden por foreign keys
- `getAuthToken` en `test/helpers/auth.helper.ts` crea usuarios únicos por timestamp
- `Decimal` en Prisma se serializa como string en JSON; usar `Number()` para comparar en tests
- `horaFin` en `CierreCaja` es nullable
- `MovimientoTipo` enum: INGRESO, EGRESO
- `TurnoEstado` enum: PENDIENTE, CONFIRMADO, EN_PROCESO, COMPLETADO, CANCELADO, NO_SHOW
