# Pendientes

## Refresh tokens en la autenticación

**Estado:** pendiente (anotado el 2026-10-31)

**Situación actual:**
- Hay un solo token JWT, guardado en `localStorage` (`apps/frontend/src/app/shared/services/auth.service.ts`).
- Su duración sale de `JWT_EXPIRES_IN`, que en producción está en `1d` (antes estaba en `7d`).
- Cuando vence, el usuario tiene que volver a iniciar sesión, y no hay forma de anularlo desde el servidor: cerrar sesión solo lo borra del navegador.

**Objetivo:**
- Token de acceso corto (unos 15 minutos), que se envía como hasta ahora en el header `Authorization`.
- Refresh token largo (por ejemplo 7 a 30 días), en una cookie `httpOnly`, `Secure` y `SameSite=Strict`, guardado hasheado en la base de datos para poder anularlo.
- Endpoint `POST /auth/refresh` que entrega un token de acceso nuevo y rota el refresh token.
- Cerrar sesión y restablecer la contraseña anulan los refresh tokens del usuario.
- En el frontend, que el interceptor reintente el pedido después de un 401 renovando el token, sin pedir login.

**Cuidado:**
- `JWT_SECRET` también se usa para derivar la clave que cifra el token de Google Calendar (`google-calendar.service.ts`). Si se cambia, hay que volver a vincular el calendario.

## Validar horario de atención al reservar — resuelto

**Estado:** resuelto el 2026-11-01

**Qué pasaba:** `create()`/`reservarPublica()` solo validaban que el turno no se solapara con otro turno (`verificarDisponibilidad`); no validaban contra `configuracion_negocio.horarios`. Se podía reservar un turno un día cerrado (lunes/domingo) o en el hueco de mediodía (13:30–16:30) y el sistema lo aceptaba igual. La validación de horarios solo existía en `getDisponibilidad()` (sugerencia de slots para la UI).

**Qué se hizo:** se agregó `verificarHorarioAtencion()` en `apps/backend/src/modules/turnos/turnos.service.ts`, llamado desde `create()` (y por lo tanto también desde `reservarPublica()` y el alta manual del dueño) antes de verificar disponibilidad. Usa la misma fuente de horarios (`configuracion_negocio.horarios`) y la misma lógica de franjas que `getDisponibilidad()` (refactorizada a un helper compartido `franjasDelDia()`), así que ambos caminos quedan consistentes. Rechaza con 400 si el día está cerrado o si el turno no entra completo en alguna franja (incluye el caso de empezar en una franja y terminar en el hueco).

**Nota:** esto también aplica al alta manual del dueño desde el panel (mismo `create()`), no solo a la reserva pública — no hay excepción para cargar un turno fuera de horario hoy. Tampoco se agregó esta validación a `update()` (editar un turno existente no la chequea, igual que ya no chequeaba solapamiento al editar — gap preexistente sin tocar).

## Cancelación de turnos por el cliente — resuelto

**Estado:** resuelto el 2026-11-01

**Qué se hizo:**
- Los mails de confirmación y de recordatorio traen un botón "Cancelar turno" que lleva a `/cancelar-turno?token=...`.
- El token es un HMAC del id del turno firmado con `JWT_SECRET` (`apps/backend/src/modules/turnos/cancelacion-token.util.ts`). No se guarda en la base y deja de servir cuando el turno ya no se puede cancelar. Si se cambia `JWT_SECRET`, los links de los mails ya enviados dejan de andar.
- El cliente puede cancelar siempre, sin límite de horas, mientras el turno siga PENDIENTE o CONFIRMADO y no haya empezado. El horario queda libre al instante y se borra el evento de Google Calendar.
- Al barbero le llega un mail con el cliente, el turno, cuánto antes canceló y un botón de WhatsApp. Va al email de contacto de Configuración → Marca; si está vacío, a todos los usuarios del panel.
- El turno guarda `cancelado_en` y `cancelado_por` (`CLIENTE` o `PANEL`). En la lista de turnos del panel aparece "por el cliente" debajo del estado.

**Para más adelante:** con `cancelado_en` y `fecha_hora_inicio` se puede armar un reporte de clientes que cancelan con poca anticipación, sin configurar nada extra.

## Validaciones de datos y CHECKs en la base — resuelto

**Estado:** resuelto el 2026-11-01

**Qué se hizo:**
- Teléfono de clientes (`@IsTelefono`, en `apps/backend/src/common/decorators/is-telefono.decorator.ts`): se guarda solo con dígitos y sin el 0 inicial, y tiene que quedar entre 8 y 15 dígitos. Se aplica al alta y edición de clientes, a la reserva pública y al registro. La búsqueda de clientes encuentra el teléfono aunque se escriba con espacios o guiones.
- Duración de servicios: entero entre 5 y 180 minutos. El mínimo es 5 y no 15, como decía el informe de Turnero, porque "Perfilado/Arreglo de cejas" dura 5 minutos.
- Migración `20261101190000_checks_y_telefonos_normalizados`: normaliza los teléfonos ya cargados y agrega CHECKs (estado del turno, fin > inicio, precios >= 0, duración > 0, cantidad > 0, descuentos 0–100, montos de caja > 0, tipo de movimiento, valores de configuración).
- Antes de desplegar en producción, correr `scripts/verificar-checks.sql`: el `Dockerfile` del backend aplica las migraciones al arrancar, y si alguna fila viola un CHECK el backend no levanta.
- Los formularios de clientes y servicios del panel ahora muestran el error del servidor; antes lo descartaban sin mostrar nada.

## Clientes inactivos, rentabilidad, stock y documentación — resuelto

**Estado:** resuelto el 2026-11-01

**Qué se hizo:**
- **Clientes para recontactar** (Reportes): "Dejaron de venir" (más de N días desde el último turno completado) y "Nunca vinieron". Excluye a quien ya tiene turno reservado, a los usuarios del panel y a los marcados como empleados. Botón de WhatsApp con mensaje armado. La última visita se calcula con los turnos COMPLETADOS: `personas.ultimo_corte` no lo actualiza ningún código.
- **Rentabilidad** (Reportes): costo de insumos por servicio (`servicios.costo_insumos`), y gastos fijos mensuales más costo por hora en la tabla `costos_negocio`. Es una tabla aparte porque `configuracion_negocio` es pública. Muestra margen, resultado, punto de equilibrio (turnos por mes) y lo que se dejó de cobrar por fidelización. Sin turnos completados no calcula el promedio, para no dividir por cero. `GET /servicios` oculta `costoInsumos` cuando la petición no trae sesión (`OptionalJwtAuthGuard`).
- **Stock**: `productos.stock` y `stock_minimo` (null = no se controla). Venta desde Caja → Vender Producto (`POST /caja/ventas-producto`): crea el ingreso y descuenta el stock en una sola transacción, sin dejarlo negativo. Aviso de stock bajo en el Dashboard y "Sin stock" en la tienda.
- **Documentación**: `docs/manual-panel.pdf` (manual para el dueño) y `docs/diccionario-datos.md`, que se genera con `npm run docs:diccionario` en `apps/backend`.

**Resuelto después (2026-11-01):**
- Se sacó el botón "Pagar" de la lista de Turnos: no registraba plata en caja. El cobro se hace solo en Caja → Registrar Pago. El endpoint `POST /turnos/:id/pagar` sigue en el backend, pero el frontend ya no lo usa.
- Botón "No vino" en la lista de Turnos. Para que sirva, el backend ahora permite marcar NO_SHOW desde EN_PROCESO (el cron pasa los turnos a ese estado a la hora de inicio) y desde COMPLETADO si el turno no tiene pagos (lo cerró el cron sin que nadie lo atendiera). Con pagos se rechaza.
