# Diccionario de datos

> Archivo generado por `apps/backend/scripts/generar-diccionario-datos.ts` a partir de `schema.prisma` y de las migraciones. No editar a mano: correr `npm run docs:diccionario` en `apps/backend`.

Motor: PostgreSQL. Cada sección es una tabla; "Campo" es el nombre en el código (Prisma) y "Columna" el nombre real en la base.

## Tablas

- [`servicios`](#servicios) — Servicios que ofrece el negocio (corte, barba, etc.), con precio, duración y costo de insumos.
- [`servicios_historial`](#servicios_historial) — Historial de cambios de precio, duración y vigencia de cada servicio.
- [`turnos`](#turnos) — Reservas. Cada turno es de un cliente, tiene horario, estado y uno o más servicios (ver turno_detalles).
- [`turno_detalles`](#turno_detalles) — Servicios incluidos en un turno, con el precio cobrado y el descuento aplicado (fidelización o personal).
- [`personas`](#personas) — Clientes (y también las personas detrás de los usuarios del panel).
- [`usuarios_web`](#usuarios_web) — Usuarios que entran al panel de administración. Incluye datos de recuperación de contraseña y 2FA.
- [`dispositivos_confiables`](#dispositivos_confiables) — Dispositivos en los que un usuario eligió "recordar este dispositivo" al verificar el 2FA.
- [`formas_pago`](#formas_pago) — Formas de pago (efectivo, transferencia, tarjeta…).
- [`pagos`](#pagos) — Pagos de turnos. Un turno puede tener varios pagos parciales.
- [`movimientos_caja`](#movimientos_caja) — Ingresos y egresos de caja: pagos de turnos, ventas de productos y egresos manuales.
- [`cierres_caja`](#cierres_caja) — Cierres de caja diarios: totales esperados por forma de pago contra lo contado.
- [`google_calendar_config`](#google_calendar_config) — Vinculación con Google Calendar (token cifrado).
- [`configuracion_negocio`](#configuracion_negocio) — Configuración del negocio y de la web (marca, horarios, textos, fidelización). Una sola fila. Es pública: la lee la landing.
- [`categorias`](#categorias) — Categorías de productos.
- [`categorias_servicios`](#categorias_servicios) — Categorías de servicios.
- [`productos`](#productos) — Productos de la tienda, con stock opcional.
- [`cursos`](#cursos) — Cursos de barbería que se publican en la web.
- [`costos_negocio`](#costos_negocio) — Costos internos para el reporte de rentabilidad (gastos fijos y costo por hora). Una sola fila. No es pública.
- [`cupones`](#cupones) — 

---

## servicios

Modelo Prisma: `Servicio`. Servicios que ofrece el negocio (corte, barba, etc.), con precio, duración y costo de insumos.

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idServicio | idServicio | Int | Sí | autoincrement() | PK |
| nombre | nombre | String | Sí |  |  |
| descripcion | descripcion | String | No |  |  |
| idCategoria | id_categoria | Int | No |  | FK → categorias_servicios.idCategoria |
| precio | precio | Decimal | Sí |  |  |
| duracionMinutos | duracionMinutos | Int | Sí |  |  |
| urlImagen | urlImagen | String | No |  |  |
| vigente | vigente | Boolean | Sí | true |  |
| cuentaParaFidelizacion | cuenta_para_fidelizacion | Boolean | Sí | false |  |
| costoInsumos | costo_insumos | Decimal | Sí | 0 | Costo estimado de insumos por cada vez que se hace el servicio (para el reporte de rentabilidad). 0 = no cargado. |
| createdAt | created_at | DateTime | Sí | now() |  |
| updatedAt | updated_at | DateTime | Sí |  | se actualiza sola |

**Relaciones:** `categoria` → categorias_servicios (uno, opcional) · `detalles` → turno_detalles (muchos) · `historial` → servicios_historial (muchos)

**Restricciones CHECK:**

- `servicios_precio_check`: `"precio" >= 0`
- `servicios_duracion_check`: `"duracionMinutos" > 0`
- `servicios_costo_insumos_check`: `"costo_insumos" >= 0`

---

## servicios_historial

Modelo Prisma: `ServicioHistorial`. Historial de cambios de precio, duración y vigencia de cada servicio.

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idHistorial | idHistorial | Int | Sí | autoincrement() | PK |
| idServicio | idServicio | Int | Sí |  | FK → servicios.idServicio |
| precio | precio | Decimal | Sí |  |  |
| duracionMinutos | duracionMinutos | Int | Sí |  |  |
| vigente | vigente | Boolean | Sí |  |  |
| fechaCambio | fecha_cambio | DateTime | Sí | now() |  |

**Relaciones:** `servicio` → servicios (uno)

**Restricciones CHECK:**

- `servicios_historial_precio_check`: `"precio" >= 0`
- `servicios_historial_duracion_check`: `"duracionMinutos" > 0`

---

## turnos

Modelo Prisma: `Turno`. Reservas. Cada turno es de un cliente, tiene horario, estado y uno o más servicios (ver turno_detalles).

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idTurno | idTurno | Int | Sí | autoincrement() | PK |
| idPersona | idPersona | Int | Sí |  | FK → personas.idPersona |
| fechaHoraInicio | fecha_hora_inicio | DateTime | Sí |  |  |
| fechaHoraFin | fecha_hora_fin | DateTime | Sí |  |  |
| estado | estado | String | Sí | CONFIRMADO |  |
| observacion | observacion | String | No |  |  |
| fechaCreacion | fecha_creacion | DateTime | Sí | now() |  |
| googleEventId | google_event_id | String | No |  |  |
| recordatorioEnviadoEn | recordatorio_enviado_en | DateTime | No |  |  |
| idFormaPagoPreferida | id_forma_pago_preferida | Int | No |  | FK → formas_pago.idFormaPago, Preferencia elegida por el cliente al reservar online; no es el pago real (eso sigue siendo explícito en caja), solo sirve para precargar la forma de pago sugerida al cobrar. Nullable porque el alta manual de un turno desde el panel no la pide. |
| canceladoEn | cancelado_en | DateTime | No |  | Quién y cuándo canceló el turno ("CLIENTE" desde el link del mail, o "PANEL" desde la administración). Con canceladoEn vs. fechaHoraInicio se puede calcular más adelante cuánta anticipación tuvo cada cancelación. |
| canceladoPor | cancelado_por | String | No |  |  |
| idCupon | id_cupon | Int | No |  | FK → cupones.idCupon, Cupón con el que se reservó online (el descuento queda en los detalles, con descuentoMotivo = "CUPON"). Sirve para contar usos: un turno cancelado devuelve el cupón. |

**Relaciones:** `persona` → personas (uno) · `detalles` → turno_detalles (muchos) · `pagos` → pagos (muchos) · `movimientos` → movimientos_caja (muchos) · `formaPagoPreferida` → formas_pago (uno, opcional) · `cupon` → cupones (uno, opcional)

**Restricciones CHECK:**

- `turnos_estado_check`: `"estado" IN ('PENDIENTE', 'CONFIRMADO', 'EN_PROCESO', 'COMPLETADO', 'CANCELADO', 'NO_SHOW')`
- `turnos_fin_despues_de_inicio_check`: `"fecha_hora_fin" > "fecha_hora_inicio"`
- `turnos_cancelado_por_check`: `"cancelado_por" IS NULL OR "cancelado_por" IN ('CLIENTE', 'PANEL')`

---

## turno_detalles

Modelo Prisma: `TurnoDetalle`. Servicios incluidos en un turno, con el precio cobrado y el descuento aplicado (fidelización o personal).

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idTurnoDetalle | idTurnoDetalle | Int | Sí | autoincrement() | PK |
| idTurno | idTurno | Int | Sí |  | FK → turnos.idTurno |
| idServicio | idServicio | Int | Sí |  | FK → servicios.idServicio |
| precioReal | precio_real | Decimal | Sí |  |  |
| cantidad | cantidad | Int | Sí | 1 |  |
| descuentoPorcentaje | descuento_porcentaje | Decimal | Sí | 0 |  |
| descuentoMotivo | descuento_motivo | String | No |  |  |

**Relaciones:** `turno` → turnos (uno) · `servicio` → servicios (uno)

**Restricciones CHECK:**

- `turno_detalles_precio_real_check`: `"precio_real" >= 0`
- `turno_detalles_cantidad_check`: `"cantidad" > 0`
- `turno_detalles_descuento_check`: `"descuento_porcentaje" BETWEEN 0 AND 100`

---

## personas

Modelo Prisma: `Persona`. Clientes (y también las personas detrás de los usuarios del panel).

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idPersona | idPersona | Int | Sí | autoincrement() | PK |
| nombre | nombre | String | Sí |  |  |
| apellido | apellido | String | Sí |  |  |
| mail | mail | String | No |  | UNIQUE |
| telefono | telefono | String | No |  |  |
| fechaNacimiento | fecha_nacimiento | DateTime | No |  |  |
| instagram | instagram | String | No |  |  |
| ultimoCorte | ultimo_corte | DateTime | No |  |  |
| usuario | usuario | String | No |  | UNIQUE |
| aplicaDescuentoPersonal | aplica_descuento_personal | Boolean | Sí | false |  |
| recibePromociones | recibe_promociones | Boolean | Sí | true | Si acepta recibir promociones y beneficios por email (ej. el cupón de cumpleaños). Lo elige al reservar online, se puede cambiar desde la ficha y cada mail de promociones trae un link para darse de baja. |
| createdAt | created_at | DateTime | Sí | now() |  |
| updatedAt | updated_at | DateTime | Sí |  | se actualiza sola |

**Relaciones:** `turnos` → turnos (muchos) · `usuarioWeb` → usuarios_web (uno, opcional) · `cupones` → cupones (muchos)

---

## usuarios_web

Modelo Prisma: `UsuarioWeb`. Usuarios que entran al panel de administración. Incluye datos de recuperación de contraseña y 2FA.

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| usuario | usuario | String | Sí |  | PK |
| email | email | String | Sí |  | UNIQUE |
| hashPass | hash_pass | String | Sí |  |  |
| idPersona | id_persona | Int | Sí |  | UNIQUE, FK → personas.idPersona |
| rol | rol | String | Sí | PELUQUERO |  |
| resetTokenHash | reset_token_hash | String | No |  |  |
| resetTokenExpiresAt | reset_token_expires_at | DateTime | No |  |  |
| twoFactorCodeHash | two_factor_code_hash | String | No |  |  |
| twoFactorCodeExpiresAt | two_factor_code_expires_at | DateTime | No |  |  |

**Relaciones:** `persona` → personas (uno) · `movimientos` → movimientos_caja (muchos) · `cierres` → cierres_caja (muchos) · `dispositivosConfiables` → dispositivos_confiables (muchos)

---

## dispositivos_confiables

Modelo Prisma: `DispositivoConfiable`. Dispositivos en los que un usuario eligió "recordar este dispositivo" al verificar el 2FA.

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| id | id | Int | Sí | autoincrement() | PK |
| usuario | usuario | String | Sí |  | FK → usuarios_web.usuario |
| tokenHash | token_hash | String | Sí |  | UNIQUE |
| expiraEn | expira_en | DateTime | Sí |  |  |
| creadoEn | creado_en | DateTime | Sí | now() |  |

**Relaciones:** `usuarioWeb` → usuarios_web (uno)

---

## formas_pago

Modelo Prisma: `FormaPago`. Formas de pago (efectivo, transferencia, tarjeta…).

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idFormaPago | idFormaPago | Int | Sí | autoincrement() | PK |
| nombre | nombre | String | Sí |  |  |
| requiereComprobante | requiere_comprobante | Boolean | Sí | false |  |
| vigente | vigente | Boolean | Sí | true |  |

**Relaciones:** `pagos` → pagos (muchos) · `movimientos` → movimientos_caja (muchos) · `turnosPreferencia` → turnos (muchos)

---

## pagos

Modelo Prisma: `Pago`. Pagos de turnos. Un turno puede tener varios pagos parciales.

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idPago | idPago | Int | Sí | autoincrement() | PK |
| idTurno | idTurno | Int | Sí |  | FK → turnos.idTurno |
| idFormaPago | idFormaPago | Int | Sí |  | FK → formas_pago.idFormaPago |
| monto | monto | Decimal | Sí |  |  |
| comprobante | comprobante | String | No |  |  |
| fechaHora | fecha_hora | DateTime | Sí | now() |  |

**Relaciones:** `turno` → turnos (uno) · `formaPago` → formas_pago (uno)

**Restricciones CHECK:**

- `pagos_monto_check`: `"monto" > 0`

---

## movimientos_caja

Modelo Prisma: `MovimientoCaja`. Ingresos y egresos de caja: pagos de turnos, ventas de productos y egresos manuales.

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idMovimiento | idMovimiento | Int | Sí | autoincrement() | PK |
| fechaHora | fecha_hora | DateTime | Sí | now() |  |
| tipo | tipo | String | Sí |  |  |
| monto | monto | Decimal | Sí |  |  |
| concepto | concepto | String | No |  |  |
| idFormaPago | id_forma_pago | Int | Sí |  | FK → formas_pago.idFormaPago |
| idUsuario | id_usuario | String | Sí |  | FK → usuarios_web.usuario |
| idTurno | id_turno | Int | No |  | FK → turnos.idTurno |
| idProducto | id_producto | Int | No |  | FK → productos.idProducto, Venta de un producto desde la caja: qué se vendió y cuántas unidades (se descuentan del stock del producto). |
| cantidadProducto | cantidad_producto | Int | No |  |  |

**Relaciones:** `formaPago` → formas_pago (uno) · `usuario` → usuarios_web (uno) · `turno` → turnos (uno, opcional) · `producto` → productos (uno, opcional)

**Restricciones CHECK:**

- `movimientos_caja_monto_check`: `"monto" > 0`
- `movimientos_caja_tipo_check`: `"tipo" IN ('INGRESO', 'EGRESO')`
- `movimientos_caja_cantidad_producto_check`: `"cantidad_producto" IS NULL OR "cantidad_producto" > 0`

---

## cierres_caja

Modelo Prisma: `CierreCaja`. Cierres de caja diarios: totales esperados por forma de pago contra lo contado.

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idCierre | idCierre | Int | Sí | autoincrement() | PK |
| fecha | fecha | DateTime | Sí |  |  |
| horaInicio | hora_inicio | DateTime | Sí |  |  |
| horaFin | hora_fin | DateTime | No |  |  |
| totalEfectivo | total_efectivo | Decimal | Sí |  |  |
| totalTarjeta | total_tarjeta | Decimal | Sí |  |  |
| totalTransferencia | total_transferencia | Decimal | Sí |  |  |
| totalOtros | total_otros | Decimal | Sí |  |  |
| totalEsperado | total_esperado | Decimal | Sí |  |  |
| totalReal | total_real | Decimal | Sí |  |  |
| diferencia | diferencia | Decimal | Sí |  |  |
| idUsuarioCierra | id_usuario_cierra | String | Sí |  | FK → usuarios_web.usuario |

**Relaciones:** `usuarioCierra` → usuarios_web (uno)

---

## google_calendar_config

Modelo Prisma: `GoogleCalendarConfig`. Vinculación con Google Calendar (token cifrado).

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| id | id | Int | Sí | autoincrement() | PK |
| accessToken | access_token | String | Sí |  |  |
| refreshToken | refresh_token | String | Sí |  |  |
| expiryDate | expiry_date | DateTime | No |  |  |
| calendarId | calendar_id | String | Sí |  |  |
| updatedAt | updated_at | DateTime | Sí |  | se actualiza sola |

---

## configuracion_negocio

Modelo Prisma: `ConfiguracionNegocio`. Configuración del negocio y de la web (marca, horarios, textos, fidelización). Una sola fila. Es pública: la lee la landing.

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| id | id | Int | Sí | autoincrement() | PK |
| nombre | nombre | String | Sí | Peluquería |  |
| logoUrl | logo_url | String | No |  |  |
| iconoUrl | icono_url | String | No |  |  |
| colorPrimario | color_primario | String | No |  |  |
| colorSecundario | color_secundario | String | No |  |  |
| heroImageUrl | hero_image_url | String | No |  |  |
| descripcion | descripcion | String | No |  |  |
| telefono | telefono | String | No |  |  |
| email | email | String | No |  |  |
| direccion | direccion | String | No |  |  |
| instagramUrl | instagram_url | String | No |  |  |
| facebookUrl | facebook_url | String | No |  |  |
| googleReviewsUrl | google_reviews_url | String | No |  |  |
| whatsappUrl | whatsapp_url | String | No |  |  |
| politicaReservas | politica_reservas | String | No |  |  |
| horarios | horarios | Json | No |  |  |
| galeriaUrls | galeria_urls | Json | No |  |  |
| productosTitulo | productos_titulo | String | No |  |  |
| productosDescripcion | productos_descripcion | String | No |  |  |
| cursosTitulo | cursos_titulo | String | No |  |  |
| cursosDescripcion | cursos_descripcion | String | No |  |  |
| sobreNosotros | sobre_nosotros | Json | No |  |  |
| sobreNosotrosBajada | sobre_nosotros_bajada | String | No |  |  |
| clubNombre | club_nombre | String | No |  |  |
| clubBajada | club_bajada | String | No |  |  |
| clubImagenUrl | club_imagen_url | String | No |  |  |
| clubBeneficios | club_beneficios | Json | No |  |  |
| clubNota | club_nota | String | No |  |  |
| mostrarNosotros | mostrar_nosotros | Boolean | Sí | true |  |
| mostrarClub | mostrar_club | Boolean | Sí | true |  |
| mostrarTienda | mostrar_tienda | Boolean | Sí | true |  |
| mostrarCursos | mostrar_cursos | Boolean | Sí | true |  |
| mostrarServicios | mostrar_servicios | Boolean | Sí | true |  |
| mostrarGaleria | mostrar_galeria | Boolean | Sí | true |  |
| mostrarUbicacion | mostrar_ubicacion | Boolean | Sí | true |  |
| fidelizacionActiva | fidelizacion_activa | Boolean | Sí | false |  |
| fidelizacionVisitasRequeridas | fidelizacion_visitas_requeridas | Int | No |  |  |
| fidelizacionDescuentoPorcentaje | fidelizacion_descuento_porcentaje | Decimal | No |  |  |
| fidelizacionFechaInicio | fidelizacion_fecha_inicio | DateTime | No |  |  |
| descuentoEmpleadoActivo | descuento_empleado_activo | Boolean | Sí | false |  |
| descuentoEmpleadoPorcentaje | descuento_empleado_porcentaje | Decimal | No |  |  |
| recordatorioActivo | recordatorio_activo | Boolean | Sí | true | Si está apagado, no se manda el recordatorio de turno por email. |
| recordatorioHorasAntes | recordatorio_horas_antes | Int | Sí | 24 |  |
| reservaAnticipacionMinutos | reserva_anticipacion_minutos | Int | Sí | 15 | Anticipación mínima para reservar online, en minutos: la página de reservas no ofrece ni acepta horarios que empiezan antes de ahora + esto. No aplica a los turnos cargados desde el panel. |
| cumpleActivo | cumple_activo | Boolean | Sí | false | Beneficio de cumpleaños: cupón personal que se manda por email cumpleDiasAnticipacion días antes del cumple y vale cumpleDiasValidez días desde ese aviso (con 3 y 7, la semana del cumple). |
| cumpleDescuentoPorcentaje | cumple_descuento_porcentaje | Decimal | Sí | 20 |  |
| cumpleDiasAnticipacion | cumple_dias_anticipacion | Int | Sí | 3 |  |
| cumpleDiasValidez | cumple_dias_validez | Int | Sí | 7 |  |
| updatedAt | updated_at | DateTime | Sí |  | se actualiza sola |

**Restricciones CHECK:**

- `configuracion_fidelizacion_visitas_check`: `"fidelizacion_visitas_requeridas" IS NULL OR "fidelizacion_visitas_requeridas" > 0`
- `configuracion_fidelizacion_descuento_check`: `"fidelizacion_descuento_porcentaje" IS NULL OR "fidelizacion_descuento_porcentaje" BETWEEN 0 AND 100`
- `configuracion_descuento_empleado_check`: `"descuento_empleado_porcentaje" IS NULL OR "descuento_empleado_porcentaje" BETWEEN 0 AND 100`
- `configuracion_recordatorio_horas_check`: `"recordatorio_horas_antes" > 0`
- `configuracion_reserva_anticipacion_check`: `"reserva_anticipacion_minutos" BETWEEN 0 AND 1440`
- `configuracion_cumple_check`: `"cumple_descuento_porcentaje" > 0 AND "cumple_descuento_porcentaje" <= 100 AND "cumple_dias_anticipacion" BETWEEN 0 AND 30 AND "cumple_dias_validez" BETWEEN 1 AND 60`

---

## categorias

Modelo Prisma: `Categoria`. Categorías de productos.

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idCategoria | idCategoria | Int | Sí | autoincrement() | PK |
| nombre | nombre | String | Sí |  |  |
| vigente | vigente | Boolean | Sí | true |  |
| createdAt | created_at | DateTime | Sí | now() |  |

**Relaciones:** `productos` → productos (muchos)

---

## categorias_servicios

Modelo Prisma: `CategoriaServicio`. Categorías de servicios.

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idCategoria | idCategoria | Int | Sí | autoincrement() | PK |
| nombre | nombre | String | Sí |  |  |
| vigente | vigente | Boolean | Sí | true |  |
| createdAt | created_at | DateTime | Sí | now() |  |

**Relaciones:** `servicios` → servicios (muchos)

---

## productos

Modelo Prisma: `Producto`. Productos de la tienda, con stock opcional.

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idProducto | idProducto | Int | Sí | autoincrement() | PK |
| nombre | nombre | String | Sí |  |  |
| descripcion | descripcion | String | No |  |  |
| precio | precio | Decimal | Sí |  |  |
| urlImagen | urlImagen | String | No |  |  |
| idCategoria | id_categoria | Int | No |  | FK → categorias.idCategoria |
| vigente | vigente | Boolean | Sí | true |  |
| stock | stock | Int | No |  | null = no se controla stock de este producto. Con stockMinimo cargado, el dashboard avisa cuando stock <= stockMinimo. |
| stockMinimo | stock_minimo | Int | No |  |  |
| createdAt | created_at | DateTime | Sí | now() |  |
| updatedAt | updated_at | DateTime | Sí |  | se actualiza sola |

**Relaciones:** `categoria` → categorias (uno, opcional) · `movimientos` → movimientos_caja (muchos)

**Restricciones CHECK:**

- `productos_precio_check`: `"precio" >= 0`
- `productos_stock_check`: `"stock" IS NULL OR "stock" >= 0`
- `productos_stock_minimo_check`: `"stock_minimo" IS NULL OR "stock_minimo" >= 0`

---

## cursos

Modelo Prisma: `Curso`. Cursos de barbería que se publican en la web.

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idCurso | idCurso | Int | Sí | autoincrement() | PK |
| nombre | nombre | String | Sí |  |  |
| subtitulo | subtitulo | String | No |  |  |
| descripcion | descripcion | String | No |  |  |
| precio | precio | Decimal | Sí |  |  |
| duracion | duracion | String | No |  |  |
| temario | temario | String[] | Sí | [] |  |
| fechaInicio | fecha_inicio | DateTime | No |  |  |
| fechaFin | fecha_fin | DateTime | No |  |  |
| diaCursada | dia_cursada | String[] | Sí | [] |  |
| horario | horario | String | No |  |  |
| lugar | lugar | String | No |  |  |
| cupos | cupos | Int | No |  |  |
| inscripcionInicio | inscripcion_inicio | DateTime | No |  |  |
| inscripcionHasta | inscripcion_hasta | DateTime | No |  |  |
| requisitoImportante | requisito_importante | String | No |  |  |
| urlImagen | urlImagen | String | No |  |  |
| vigente | vigente | Boolean | Sí | true |  |
| createdAt | created_at | DateTime | Sí | now() |  |
| updatedAt | updated_at | DateTime | Sí |  | se actualiza sola |

**Restricciones CHECK:**

- `cursos_precio_check`: `"precio" >= 0`
- `cursos_cupos_check`: `"cupos" IS NULL OR "cupos" >= 0`

---

## costos_negocio

Modelo Prisma: `CostosNegocio`. Costos internos para el reporte de rentabilidad (gastos fijos y costo por hora). Una sola fila. No es pública.

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| id | id | Int | Sí | 1 | PK |
| costosFijosMensuales | costos_fijos_mensuales | Decimal | Sí | 0 |  |
| costoHoraTrabajo | costo_hora_trabajo | Decimal | Sí | 0 |  |
| updatedAt | updated_at | DateTime | Sí |  | se actualiza sola |

**Restricciones CHECK:**

- `costos_negocio_valores_check`: `"costos_fijos_mensuales" >= 0 AND "costo_hora_trabajo" >= 0`
- `costos_negocio_fila_unica_check`: `"id" = 1`

---

## cupones

Modelo Prisma: `Cupon`. 

| Campo | Columna | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|---|
| idCupon | idCupon | Int | Sí | autoincrement() | PK |
| codigo | codigo | String | Sí |  | UNIQUE, En mayúsculas, sin espacios. |
| descripcion | descripcion | String | No |  |  |
| descuentoPorcentaje | descuento_porcentaje | Decimal | Sí |  |  |
| vigenteDesde | vigente_desde | DateTime | Sí |  |  |
| vigenteHasta | vigente_hasta | DateTime | Sí |  |  |
| usosMaximos | usos_maximos | Int | No |  | Cupo total ("los primeros 10"); null = sin límite. |
| activo | activo | Boolean | Sí | true | Pausado desde el panel. |
| createdAt | created_at | DateTime | Sí | now() |  |
| origen | origen | String | Sí | PROMO | "PROMO" (creado desde el panel) o "CUMPLEANOS" (automático). |
| idPersona | id_persona | Int | No |  | FK → personas.idPersona, Cupón personal: solo lo puede usar esta persona (el de cumpleaños). |
| anioCumpleanos | anio_cumpleanos | Int | No |  | Año del cumpleaños al que corresponde: uno por persona y por año. |

**Relaciones:** `turnos` → turnos (muchos) · `persona` → personas (uno, opcional)

**Únicos compuestos:** (idPersona, anioCumpleanos)

**Restricciones CHECK:**

- `cupones_descuento_check`: `"descuento_porcentaje" > 0 AND "descuento_porcentaje" <= 100`
- `cupones_vigencia_check`: `"vigente_hasta" > "vigente_desde"`
- `cupones_usos_check`: `"usos_maximos" IS NULL OR "usos_maximos" > 0`
- `cupones_codigo_check`: `"codigo" ~ '^[A-Z0-9_-]{3,30}$'`
- `cupones_origen_check`: `"origen" IN ('PROMO', 'CUMPLEANOS')`
