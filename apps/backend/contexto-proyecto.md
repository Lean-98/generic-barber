# Contexto del Proyecto - Sistema de Gestión de Peluquería

> Resumen técnico para trabajar en el código. El documento completo (requisitos, diagramas,
> patrones y decisiones) está en
> [`diagramas-arquitectura-software/contexto-proyecto.md`](../../diagramas-arquitectura-software/contexto-proyecto.md),
> y el detalle de cada tabla en [`docs/diccionario-datos.md`](../../docs/diccionario-datos.md).
> Actualizado el 2026-11-01.

## Stack Tecnológico
- **Backend**: NestJS + Prisma + PostgreSQL + Docker
- **Frontend**: Angular 20 Standalone + Signals + Zoneless + Tailwind CSS v3 + DaisyUI
- **Integraciones**: Resend (mails), Google Calendar, Cloudinary (imágenes)
- **Patrones implementados**: State (turnos), Facade (caja), Strategy (cierre de caja). Principios: SOLID, DRY, KISS.

## Módulos (Backend)
- **Auth**: JWT con login por usuario o email, verificación en dos pasos por mail y "recordar este dispositivo" por 30 días. `OptionalJwtAuthGuard` para endpoints públicos que muestran datos extra con sesión.
- **Personas**: CRUD, búsqueda por nombre/apellido/email/teléfono (el teléfono se encuentra aunque se escriba con espacios o guiones), historial de turnos. El teléfono se guarda normalizado (`@IsTelefono`).
- **Servicios / Categorías de servicios**: CRUD con baja lógica, historial de precio/duración/vigencia, duración de 5 a 180 minutos, costo de insumos interno.
- **Turnos**: patrón State. Nacen `CONFIRMADO`; `TurnosCronService` los pasa a `EN_PROCESO` y `COMPLETADO` por reloj. Cancelar y "No vino" son manuales (no-show también desde `EN_PROCESO` y desde `COMPLETADO` sin pagos).
- **Fidelización**: `fidelizacion.util.ts` calcula las visitas del club (mismo conteo que `aplicarDescuentoFidelizacion`) para los mails y para `GET /turnos-publicos/cliente`.
- **Turnos públicos**: disponibilidad, reserva, y cancelación por el cliente con token firmado (`cancelacion-token.util.ts`), con aviso por mail al barbero.
- **Cupones**: códigos de descuento (%) para la reserva online. Valen para las reservas hechas dentro de la vigencia (no importa el día del turno), una vez por email, cupo opcional, para todos los servicios. No se acumulan: queda el mayor (cupón, personal o club). Cancelar devuelve el cupón. `GET /turnos-publicos/cupon` valida; el panel los administra en `/cupones` (con mensaje y link para WhatsApp).
- **Cumpleaños**: `CumpleanosService` corre todos los días a las 10:00 (hora AR) y, si el beneficio está activo, crea el cupón personal (`origen = CUMPLEANOS`, un uso, solo para el email de esa persona, uno por año) de quienes cumplen dentro de la anticipación configurada, y se lo manda por mail con link para reservar y para darse de baja. Solo a quienes tienen email, cumpleaños cargado, `recibePromociones` y no son empleados. La misma tarea manda un recordatorio (uno por cupón, `recordatorioEnviadoEn`) cuando al cupón sin usar le quedan `cumpleDiasRecordatorio` días. `GET /cumpleanos/proximos` alimenta el recuadro del Dashboard, `GET /reportes/cumpleanos` el reporte (enviados, usados, facturado) y `GET /personas/cumplen-mes` el filtro de Clientes; `GET`/`POST /promociones/preferencia` es la baja desde el mail (token firmado, `baja-promociones-token.util.ts`).
- **Caja**: pagos de turnos, venta de productos con descuento de stock, egresos y cierre de caja (Facade + Strategy).
- **Productos / Categorías / Cursos**: catálogo de la web; productos con stock opcional y aviso de stock bajo.
- **Reportes**: resumen, ingresos por día, turnos por estado, top servicios y clientes, formas de pago, **rentabilidad** y **clientes para recontactar**. Los costos internos viven en `costos_negocio` (`GET`/`PUT /reportes/costos`).
- **Configuración**: marca, horarios de atención, contenido de la landing, fidelización, descuento de personal, recordatorios y anticipación mínima para reservar online. Es pública (`GET /configuracion/branding`), por eso no guarda nada interno.
- **Notifications**: cron de recordatorios por mail (con link para cancelar); no manda nada si el negocio los apagó (`recordatorioActivo`).
- **Mail**: confirmación, recordatorio, aviso de nueva reserva online y de cancelación al barbero, código 2FA, recuperación de contraseña.
- **Google Calendar**: sincroniza turnos (crear, editar, borrar al cancelar o marcar "No vino").
- **Cloudinary**: subida de imágenes desde el panel.

## Frontend Angular

### Estructura
```
apps/frontend/src/app/
├── core/          # layout (sidebar/navbar), guards, interceptors, BrandingService
├── features/
│   ├── auth/          # login, forgot-password, reset-password
│   ├── dashboard/
│   ├── turnos/        # agenda y alta de turnos
│   ├── personas/
│   ├── caja/
│   ├── servicios/ productos/ cursos/
│   ├── reportes/
│   ├── config/        # marca y Google Calendar
│   ├── reservas/      # reservar y cancelar-turno (públicas)
│   └── landing/       # landing, tienda, cursos-info, nosotros, club (públicas)
└── shared/        # models, services, pipes (fechaAr, pesos), ui (icon, image-upload), utils
```

### Características
- **Standalone + Zoneless + Signals**: sin NgModules ni Zone.js.
- **Tailwind + DaisyUI**: tema propio con colores de marca configurables desde el panel.
- **Lazy loading** en todas las páginas; `authGuard` y `publicGuard`.
- **Fechas**: el pipe `fechaAr` muestra siempre en hora de Argentina, sin importar el huso del dispositivo.
- **Errores**: `mensajeDeErrorHttp()` muestra los mensajes de validación del backend en los formularios.

### Páginas
| Página | Ruta | Descripción |
|--------|------|-------------|
| Landing y secciones | `/`, `/tienda`, `/cursos-info`, `/nosotros`, `/club` | Sitio público configurable |
| Reservar | `/reservar` | Reserva online: servicios, fecha, horario disponible y datos (forma de pago preferida obligatoria) |
| Cancelar turno | `/cancelar-turno?token=…` | El cliente cancela desde el link del mail |
| Login | `/login`, `/forgot-password`, `/reset-password` | Acceso con 2FA por mail |
| Dashboard | `/dashboard` | Resumen del día y aviso de stock bajo |
| Turnos | `/turnos`, `/turnos/nuevo` | Lista y calendario semanal; cancelar y "No vino" |
| Clientes | `/personas` | ABM, búsqueda e historial |
| Caja | `/caja` | Movimientos, registrar pago, vender producto, egresos, cierre e historial |
| Catálogo | `/servicios`, `/productos`, `/cursos` | Costo de insumos por servicio, stock por producto |
| Cupones | `/cupones` | Códigos de descuento con vigencia, cupo y mensaje para WhatsApp |
| Reportes | `/reportes` | Resumen, rentabilidad (con modal de costos) y clientes para recontactar |
| Configuración | `/configuracion/marca`, `/configuracion/google-calendar` | Marca, horarios, descuentos, notificaciones, calendario |

## Estado Actual
- **Backend**: 216 tests unitarios (Jest) + 7 suites e2e (`npm run test:e2e`, necesitan la base levantada).
- **Swagger UI**: `/api/docs`.
- **Seed**: datos de demo con `npx prisma db seed`.

## Decisiones Clave
- **Prisma sobre TypeORM**: mejor DX, migraciones confiables, type safety de punta a punta.
- **Un único profesional por instancia**: no hay multi-tenancy; cada negocio corre su propio stack.
- **Turnos que avanzan solos**: el dueño atiende y no puede ir tocando la pantalla entre clientes.
- **Cancelación del cliente sin límite de horas**: un cliente bloqueado suele no avisar y no ir; es mejor liberar el horario y avisar al barbero.
- **Costos en tabla aparte**: `configuracion_negocio` es pública; `costos_negocio` no.
- **Validación en dos capas**: DTOs con `class-validator` y restricciones `CHECK` en la base.
- **Baja lógica** en servicios y productos (`vigente = false`); hard delete en personas.
- **Integraciones best effort**: si Google Calendar o el mail fallan, la operación principal se completa igual.

## Notas de Seguridad
- **Login por usuario o email**, con código de 6 dígitos por mail (hasheado, vence en 10 minutos).
- **Respuestas mínimas** de login, register y profile: solo `{ usuario, email, rol }` (`UserPublic`).
- **Rate limiting** global y más estricto en endpoints públicos sensibles (reservar, cancelar, login, recuperar contraseña).
- **Link de cancelación**: HMAC del id del turno con una clave derivada de `JWT_SECRET`; no se guarda nada en la base y deja de servir cuando el turno ya no se puede cancelar.
- **Mails**: los datos que carga el cliente se escapan antes de meterlos en el HTML.
- **Datos internos**: `GET /servicios` es público pero oculta `costoInsumos` sin sesión.

## Reserva y cancelación públicas
- `GET /api/turnos-publicos/disponibilidad?fecha=YYYY-MM-DD&servicios=1,2`: slots cada 30 minutos dentro de los horarios configurados en Marca (con franjas partidas por día). No ofrece horarios que empiezan antes de la anticipación mínima configurada (`reservaAnticipacionMinutos`, 15 por defecto); la reserva también la valida. Desde el panel no hay ese límite.
- `POST /api/turnos-publicos/reservar`: busca o crea la persona por email y crea el turno `CONFIRMADO`, validando horario de atención y superposición en una transacción serializable. Acepta `fechaNacimiento` opcional (beneficio de cumpleaños): se guarda al crear la persona o si le faltaba, nunca pisa una cargada. Después avisa por mail al negocio (mismo destinatario que el aviso de cancelación).
- `GET /api/turnos-publicos/cancelacion?token=…` y `POST /api/turnos-publicos/cancelar`: ver y cancelar el turno desde el link del mail.

## Google Calendar
- **Variables**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_CALENDAR_ID`.
- **OAuth2** con acceso offline; tokens cifrados en `GoogleCalendarConfig` (clave derivada de `JWT_SECRET`).
- **Endpoints**: `GET /api/google-calendar/status`, `GET /api/google-calendar/auth-url`, `POST /api/google-calendar/connect?code={code}`, `DELETE /api/google-calendar/disconnect`.
- **Sincronización**: crear y editar turno actualizan el evento; cancelar y "No vino" lo borran.

## Pendientes conocidos
- Refresh tokens en la autenticación (hoy hay un solo JWT, de 1 día en producción).

## Notas Técnicas
- `PrismaServiceMock` en `test/mocks/prisma.service.mock.ts`; `cleanDatabase` en `test/setup-e2e.ts`; `getAuthToken` en `test/helpers/auth.helper.ts`.
- `Decimal` de Prisma se serializa como string: usar `Number()`.
- `Persona.ultimoCorte` no se actualiza en ningún lado; la última visita se calcula con los turnos `COMPLETADO`.
- El `Dockerfile` corre `prisma migrate deploy` al arrancar: antes de desplegar en una base con datos, correr `scripts/verificar-checks.sql`.
- `npm run docs:diccionario` regenera `docs/diccionario-datos.md` desde el schema.
