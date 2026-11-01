# Diagramas de Procesos – Authentic Barber

## Versión 2.1 (actualizado a partir del código real, 2026-11-01)

> Reemplaza la v1.0 (diseño inicial, pre-implementación). La diferencia más importante:
> el turno ya **no** nace `PENDIENTE` ni pasa por `EN_ATENCION`/`FINALIZADO`/`PAGADO` — nace
> `CONFIRMADO` y un cron lo avanza solo por el reloj (`EN_PROCESO` → `COMPLETADO`), sin que
> el dueño tenga que tocar la pantalla entre cliente y cliente. Ver el diagrama de estados
> (sección 2) y el detalle en `contexto-proyecto.md`.
>
> **v2.1** agrega: la cancelación del turno por el propio cliente desde el mail (1.9), la
> venta de productos en caja con descuento de stock (1.10) y el botón "No vino" (1.11), que
> ahora también funciona sobre turnos `EN_PROCESO` y `COMPLETADO` sin pagos.

---

## 1. Diagramas de Secuencia

### 1.1. Reservar turno – sitio público (cliente)

Reemplaza el viejo "Agendar Turno por teléfono/presencial". Hoy el circuito principal es
self-service desde la web; el alta manual (1.2) queda para walk-ins o excepciones.

```mermaid
sequenceDiagram
    actor Cliente
    participant UI as Sitio Público (Angular)
    participant API as Backend (NestJS)
    participant DB as PostgreSQL

    Cliente->>UI: Elige servicio(s) y fecha
    UI->>API: GET /turnos-publicos/disponibilidad?fecha&servicios
    API->>DB: Leer configuracion_negocio.horarios + turnos del día
    DB-->>API: Franjas abiertas y turnos ocupados
    API-->>UI: Slots disponibles
    Cliente->>UI: Elige slot e ingresa email
    UI->>API: GET /turnos-publicos/cliente?email
    API-->>UI: ¿Cliente existente? (salta nombre/apellido si sí)
    UI->>API: GET /turnos-publicos/formas-pago
    API-->>UI: Formas de pago vigentes (sin preseleccionar ninguna)
    Cliente->>UI: Completa datos + forma de pago preferida (obligatoria)
    UI->>API: POST /turnos-publicos/reservar (Throttle 5/60s)
    API->>API: reservarPublica() -> busca/crea Persona por email
    API->>DB: Transacción Serializable
    API->>API: verificarHorarioAtencion(inicio, fin)
    API->>API: verificarDisponibilidad(inicio, fin) — excluye CANCELADO/NO_SHOW
    API->>DB: INSERT Turno (estado=CONFIRMADO) + TurnoDetalle
    DB-->>API: Turno creado (idTurno)
    API->>API: GoogleCalendarService.createEvent() (silencioso si falla)
    API->>API: MailService.sendTurnoConfirmacion() con link "Cancelar turno" (silencioso si falla)
    API-->>UI: 201 (turno CONFIRMADO)
    UI-->>Cliente: Muestra confirmación
```

**Reglas que no estaban en la v1.0**:
- El turno nace directo `CONFIRMADO`, no `PENDIENTE`.
- Se valida el horario de atención real del negocio (día cerrado o fuera de franja → 400), no solo el solapamiento.
- La forma de pago preferida es obligatoria en este flujo (no en el alta manual).
- El endpoint está limitado a 5 reservas por minuto por IP (rate limiting).
- El teléfono se normaliza a solo dígitos y tiene que tener entre 8 y 15 (si no, 400).
- El mail de confirmación incluye un link firmado para que el cliente cancele solo (ver 1.9).

### 1.2. Alta manual de turno – panel (dueño)

```mermaid
sequenceDiagram
    actor Dueño
    participant UI as Panel Admin (Angular)
    participant API as Backend (NestJS)
    participant DB as PostgreSQL

    Dueño->>UI: Completa cliente, servicios, fecha y hora
    UI->>UI: Arma fechaHoraInicio con offset -03:00 explícito
    UI->>API: POST /turnos (JWT)
    API->>DB: Transacción Serializable
    API->>API: verificarHorarioAtencion(inicio, fin)
    API->>API: verificarDisponibilidad(inicio, fin)
    API->>DB: INSERT Turno (estado=CONFIRMADO) + TurnoDetalle
    DB-->>API: Turno creado
    API-->>UI: 201
    UI-->>Dueño: Turno agendado
```

**Nota de huso horario**: el frontend construye la fecha con el offset `-03:00` fijo (hora
de Argentina, sin horario de verano), no como string ambiguo — necesario porque el backend
está hosteado en un VPS fuera de Argentina, y un string sin zona horaria se interpretaría
con la hora local del servidor.

### 1.3. Transición automática de turnos por reloj (cron)

Nuevo — no existía en la v1.0. Es el cambio de estrategia central: el sistema avanza los
turnos solo, y el dueño (que también atiende) solo interviene para las excepciones
(cancelar, no-show).

```mermaid
sequenceDiagram
    participant Cron as TurnosCronService (@Cron */5 * * * *)
    participant SVC as TurnosService (patrón State)
    participant DB as PostgreSQL

    loop cada 5 minutos
        Cron->>DB: SELECT Turno WHERE estado=PENDIENTE
        Note over Cron,DB: Barrido único de legado,<br/>no debería encontrar nada tras el primer despliegue
        Cron->>SVC: confirmar(id) por cada uno encontrado

        Cron->>DB: SELECT Turno WHERE estado=CONFIRMADO AND fechaHoraInicio<=ahora
        loop por cada turno
            Cron->>SVC: iniciarAtencion(id)
            SVC->>SVC: getTurnoState('CONFIRMADO').iniciarAtencion() — valida transición
            SVC->>DB: UPDATE estado=EN_PROCESO
        end

        Cron->>DB: SELECT Turno WHERE estado=EN_PROCESO AND fechaHoraFin<=ahora
        loop por cada turno
            Cron->>SVC: finalizar(id)
            SVC->>SVC: getTurnoState('EN_PROCESO').finalizar() — valida transición
            SVC->>DB: UPDATE estado=COMPLETADO
        end
    end
```

**Por qué es seguro**: el cron nunca escribe `estado` directo — siempre llama a los mismos
métodos del servicio que usa el panel manual, así que pasa por la misma validación del
patrón State. Un error en un turno (try/catch por turno) no frena el resto del lote.
`CANCELADO` y `NO_SHOW` nunca se tocan automáticamente: son siempre decisión manual del
dueño.

### 1.4. Login con verificación en dos pasos (2FA por email)

Nuevo — no existía en la v1.0.

```mermaid
sequenceDiagram
    actor Dueño
    participant UI as Panel Admin
    participant API as Backend (NestJS)
    participant DB as PostgreSQL
    participant Mail as Resend

    Dueño->>UI: Ingresa usuario/email + contraseña
    UI->>API: POST /auth/login (+ cookie device_token si existe)
    API->>DB: Validar credenciales
    alt dispositivo ya confiable (cookie válida y vigente)
        API-->>UI: 200 { access_token } — 2FA salteado
    else requiere 2FA
        API->>API: Genera código de 6 dígitos, lo hashea (SHA-256)
        API->>DB: Guarda hash + expiración (10 min) en UsuarioWeb
        API->>Mail: Envía el código por email
        API-->>UI: 200 { requiresTwoFactor: true }
        Dueño->>UI: Ingresa el código recibido
        UI->>API: POST /auth/verify-2fa (código, recordarDispositivo?)
        API->>DB: Valida hash y que no esté expirado
        API->>API: Firma JWT
        opt recordarDispositivo = true
            API->>DB: Genera token de dispositivo, guarda su hash (30 días)
            API-->>UI: Set-Cookie device_token (httpOnly, 30 días)
        end
        API-->>UI: 200 { access_token }
    end
```

### 1.5. Cobrar en caja

```mermaid
sequenceDiagram
    actor Dueño
    participant UI as Panel Admin
    participant API as Backend (NestJS)
    participant DB as PostgreSQL

    Dueño->>UI: Selecciona turno COMPLETADO
    UI->>UI: Precarga forma de pago con idFormaPagoPreferida (sugerencia editable)
    Dueño->>UI: Confirma forma de pago y monto
    UI->>API: POST /caja/pagos
    API->>API: CajaFacade.procesarPago()
    API->>DB: Verificar turno.estado === COMPLETADO (si no, 400)
    API->>DB: Transacción: INSERT Pago + INSERT MovimientoCaja (INGRESO)
    DB-->>API: Pago y movimiento creados
    API->>API: Compara totalPagado vs calcularTotal(turno)
    API-->>UI: 201 { pago, movimiento, turnoActualizado }
    UI-->>Dueño: Muestra comprobante
```

**Nota**: no existe un estado `PAGADO` separado. El turno queda `COMPLETADO`; el pago (o
los pagos parciales) se registran aparte en `Pago`/`MovimientoCaja`, y `turnoActualizado`
le dice al frontend si ya está completamente cobrado.

### 1.6. Cancelar turno

```mermaid
sequenceDiagram
    actor Dueño
    participant UI as Panel Admin
    participant API as Backend (NestJS)
    participant DB as PostgreSQL

    Dueño->>UI: Selecciona turno y confirma cancelar
    UI->>API: DELETE /turnos/:id
    API->>API: getTurnoState(turno.estado).cancelar()
    Note over API: Solo permitido desde CONFIRMADO.<br/>Lanza 400 desde EN_PROCESO, COMPLETADO, CANCELADO o NO_SHOW.
    opt turno tenía evento en Google Calendar
        API->>API: GoogleCalendarService.deleteEvent() (silencioso si falla)
    end
    API->>DB: UPDATE estado=CANCELADO, googleEventId=null,<br/>canceladoEn=ahora, canceladoPor=PANEL
    API-->>UI: 200
    UI-->>Dueño: Turno cancelado
```

El cliente también puede cancelar por su cuenta desde el mail: ver 1.9.

### 1.7. Cierre de caja diario

```mermaid
sequenceDiagram
    actor Dueño
    participant UI as Panel Admin
    participant API as Backend (NestJS)
    participant DB as PostgreSQL

    Dueño->>UI: Solicita iniciar el cierre del día
    UI->>API: POST /caja/cierre/iniciar (fecha)
    API->>DB: Verificar que no exista ya un cierre para esa fecha (si existe, 400)
    loop por cada estrategia (Efectivo, Tarjeta, Transferencia, Otros)
        API->>DB: Sumar INGRESO - EGRESO del día (hora AR) para sus formas de pago
    end
    API->>DB: INSERT CierreCaja (totales esperados, horaFin=NULL)
    API-->>UI: Cierre iniciado con totalEsperado por forma de pago
    Dueño->>UI: Cuenta el efectivo físico e ingresa totalReal
    UI->>API: POST /caja/cierre/confirmar (id, totalReal)
    API->>DB: Verificar que no esté ya confirmado (horaFin NULL, si no, 400)
    API->>API: diferencia = totalReal - totalEsperado
    API->>DB: UPDATE CierreCaja (totalReal, diferencia, horaFin=ahora)
    API-->>UI: 200 (resumen del cierre)
    UI-->>Dueño: Muestra diferencia y reporte
```

### 1.8. Recordatorio automático por email (cron)

```mermaid
sequenceDiagram
    participant Cron as NotificationsService (@Cron */15 * * * *)
    participant DB as PostgreSQL
    participant Mail as Resend

    loop cada 15 minutos
        Cron->>DB: Leer configuracion_negocio.recordatorioHorasAntes
        Cron->>DB: SELECT Turno WHERE estado NOT IN (CANCELADO, NO_SHOW, COMPLETADO)<br/>AND recordatorioEnviadoEn IS NULL<br/>AND fechaHoraInicio entre ahora y ahora+horasAntes
        loop por cada turno encontrado
            Cron->>Mail: sendTurnoRecordatorio() con link "Cancelar turno"
            alt envío exitoso
                Cron->>DB: UPDATE recordatorioEnviadoEn=ahora (evita reenviar)
            else falló el envío
                Note over Cron: No marca el turno,<br/>se reintenta en el próximo tick
            end
        end
    end
```

### 1.9. Cancelar turno desde el mail (cliente)

Nuevo en la v2.1. El mail de confirmación (1.1) y el de recordatorio (1.8) traen un botón
"Cancelar turno" con un token firmado (HMAC del id del turno con `JWT_SECRET`; no se guarda
nada en la base). El cliente puede cancelar **siempre**, sin límite de horas, mientras el
turno no haya empezado: se prefirió eso a bloquear la cancelación cerca del horario, porque
un cliente bloqueado suele no avisar y directamente no ir.

```mermaid
sequenceDiagram
    actor Cliente
    participant UI as Página /cancelar-turno
    participant API as Backend (NestJS)
    participant DB as PostgreSQL
    participant Mail as Resend
    actor Barbero

    Cliente->>UI: Abre el link del mail (?token=...)
    UI->>API: GET /turnos-publicos/cancelacion?token
    API->>API: verificarTokenCancelacion() — firma inválida → 404
    API->>DB: Leer turno + servicios
    API-->>UI: { fecha, servicios, estado, puedeCancelar }
    Cliente->>UI: Confirma "Sí, cancelar turno"
    UI->>API: POST /turnos-publicos/cancelar { token } (Throttle 5/60s)
    alt ya estaba CANCELADO
        API-->>UI: 200 (idempotente, sin aviso nuevo)
    else empezó o no está PENDIENTE/CONFIRMADO
        API-->>UI: 400 "ya no se puede cancelar desde la web"
    else se puede cancelar
        API->>DB: UPDATE ... WHERE estado IN (PENDIENTE, CONFIRMADO)<br/>estado=CANCELADO, canceladoEn=ahora, canceladoPor=CLIENTE
        alt actualizó 1 fila
            API->>API: GoogleCalendarService.deleteEvent() (silencioso)
            API->>Mail: sendAvisoCancelacion() al email del negocio<br/>(o a los usuarios del panel si no hay)
            Mail-->>Barbero: Cliente, turno, anticipación y botón de WhatsApp
        else 0 filas (otro clic o el cron lo cambió en el medio)
            Note over API: No se manda un segundo aviso
        end
        API-->>UI: 200
    end
    UI-->>Cliente: "Turno cancelado. El horario quedó libre."
```

El horario queda libre en la web al instante: la disponibilidad ya excluye los turnos
`CANCELADO`. El aviso al barbero es best effort: si falla, la cancelación queda hecha igual.

### 1.10. Vender un producto en caja

Nuevo en la v2.1.

```mermaid
sequenceDiagram
    actor Dueño
    participant UI as Panel Admin (Caja → Vender Producto)
    participant API as Backend (NestJS)
    participant DB as PostgreSQL

    Dueño->>UI: Elige producto, cantidad y forma de pago
    UI->>API: POST /caja/ventas-producto
    API->>API: CajaFacade.venderProducto()
    API->>DB: Transacción
    API->>DB: Leer producto (no vigente → 400) y forma de pago (no vigente → 400)
    opt el producto controla stock (stock no es NULL)
        API->>DB: UPDATE producto SET stock = stock - cantidad<br/>WHERE stock >= cantidad
        alt 0 filas actualizadas
            API-->>UI: 400 "No hay stock suficiente: quedan N"
        end
    end
    API->>DB: INSERT MovimientoCaja (INGRESO, idProducto, cantidadProducto)
    DB-->>API: OK (commit)
    API-->>UI: 201 { movimiento, stockRestante }
    UI-->>Dueño: "Venta registrada. Quedan N en stock."
```

El ingreso entra al cierre de caja como cualquier otro movimiento. Si un producto queda en su
stock mínimo o en 0, el dashboard lo avisa (`GET /productos/stock-bajo`) y la tienda de la web
lo muestra como "Sin stock".

### 1.11. Marcar que el cliente no vino

Nuevo en la v2.1. Antes `NO_SHOW` solo se podía marcar desde `CONFIRMADO`, pero el cron pasa el
turno a `EN_PROCESO` a la hora de inicio: cuando el dueño se daba cuenta de que el cliente no
había venido, el turno ya no estaba confirmado y la transición se rechazaba.

```mermaid
sequenceDiagram
    actor Dueño
    participant UI as Panel Admin (Turnos)
    participant API as Backend (NestJS)
    participant DB as PostgreSQL

    Note over UI: El botón "No vino" aparece en turnos CONFIRMADO<br/>cuya hora ya pasó, EN_PROCESO, y COMPLETADO sin pagos
    Dueño->>UI: "No vino" y confirma
    UI->>API: POST /turnos/:id/no-show
    alt turno COMPLETADO
        API->>DB: ¿Tiene pagos?
        alt tiene pagos
            API-->>UI: 400 "el turno ya tiene pagos registrados"
        end
    else cualquier otro estado
        API->>API: getTurnoState(estado).marcarNoShow()<br/>(permitido en CONFIRMADO y EN_PROCESO)
    end
    API->>API: GoogleCalendarService.deleteEvent() (silencioso)
    API->>DB: UPDATE estado=NO_SHOW, googleEventId=null
    API-->>UI: 200
    UI-->>Dueño: Turno marcado como "No vino"
```

Un turno `NO_SHOW` no cuenta como visita para la fidelización (solo cuentan los `COMPLETADO`).

---

## 2. Diagrama de Estados – Turno

**Estados reales**: `CONFIRMADO`, `EN_PROCESO`, `COMPLETADO`, `CANCELADO`, `NO_SHOW`.
`PENDIENTE` sigue existiendo en el código (patrón State completo, por compatibilidad) pero
ningún turno nuevo nace ahí — es un estado de transición única para turnos viejos, barrido
automáticamente a `CONFIRMADO` por el cron la primera vez que corre tras el despliegue de
este cambio.

```mermaid
stateDiagram-v2
    [*] --> CONFIRMADO : create() / reservarPublica()<br/>(valida horario de atención + disponibilidad)

    state "PENDIENTE (legado)" as PENDIENTE
    [*] --> PENDIENTE : turnos creados antes de este cambio
    PENDIENTE --> CONFIRMADO : confirmar()<br/>[barrido automático, una sola vez]

    CONFIRMADO --> EN_PROCESO : iniciarAtencion()<br/>[manual o automático al llegar fechaHoraInicio]
    CONFIRMADO --> CANCELADO : cancelar() [panel]<br/>o cancelarPorCliente() [link del mail]
    CONFIRMADO --> NO_SHOW : marcarNoShow() [manual]

    EN_PROCESO --> COMPLETADO : finalizar()<br/>[manual o automático al llegar fechaHoraFin]
    EN_PROCESO --> NO_SHOW : marcarNoShow() [manual]
    COMPLETADO --> NO_SHOW : marcarNoShow() [manual,<br/>solo si no tiene pagos]

    COMPLETADO --> [*]
    CANCELADO --> [*]
    NO_SHOW --> [*]

    note right of CONFIRMADO
        El chequeo de disponibilidad ya garantiza
        (transacción Serializable) que el horario
        no se pisa con otro turno — por eso puede
        nacer confirmado sin paso intermedio.
    end note

    note right of EN_PROCESO
        El cliente está siendo atendido.
    end note

    note right of COMPLETADO
        Atención terminada. No implica que ya
        esté cobrado: eso se registra aparte en
        Pago/MovimientoCaja (ver secuencia 1.5).
        registrarPago() es una transición permitida
        desde este mismo estado (no cambia el estado);
        el panel ya no la usa: el cobro es siempre
        por Caja → Registrar Pago.
    end note

    note right of CANCELADO
        Nunca se toca por reloj. Lo cancela el
        dueño o el cliente desde el mail
        (canceladoPor = PANEL | CLIENTE). Si tenía
        evento en Google Calendar, se elimina.
    end note

    note right of NO_SHOW
        El cliente no se presentó. Nunca se toca
        por reloj. Desde COMPLETADO solo si el
        turno no tiene pagos (lo cerró el cron
        sin que nadie lo atendiera).
    end note
```

---

## 3. Diagrama de Actividades – Flujo del Día

Actualizado: la mayoría de los turnos ya llegan agendados desde el sitio público y
avanzan solos por el cron; el dueño interviene sobre todo para cobrar, para las
excepciones (cancelar/no-show) y para los walk-ins sin turno previo.

```mermaid
flowchart TD
    A([Inicio del día]) --> B[El cron corre cada 5 min<br/>de fondo todo el día]
    B --> C{¿Llega un cliente?}
    C -->|Con turno agendado online| D[El turno ya está CONFIRMADO<br/>y el cron lo pasó a EN_PROCESO solo]
    C -->|Walk-in sin turno| E[Dueño crea el turno a mano<br/>nace CONFIRMADO]
    E --> F[Dueño inicia la atención a mano<br/>iniciarAtencion]
    D --> G[Atiende al cliente]
    F --> G

    G --> H{¿Termina justo a la hora prevista?}
    H -->|Sí| I[El cron lo pasa solo a COMPLETADO]
    H -->|No, termina antes/después| J[Dueño finaliza a mano<br/>finalizar]
    I --> K
    J --> K[Turno COMPLETADO]

    K --> L{¿Cobra ahora?}
    L -->|Sí| M[Selecciona forma de pago<br/>precargada con la preferida del cliente]
    M --> N[Registra el pago -> genera movimiento de caja]
    L -->|No| O[Deja el cobro pendiente<br/>para más tarde]

    N --> P{¿Hubo un problema con este turno?}
    O --> P
    P -->|Cliente no se presentó| Q[Dueño toca 'No vino'<br/>NO_SHOW]
    P -->|Se canceló antes de atender| R[Lo cancela el dueño, o el cliente<br/>desde el mail con aviso al barbero;<br/>el horario queda libre]
    P -->|Todo normal| S{¿Más clientes?}
    Q --> S
    R --> S

    S -->|Sí| C
    S -->|No| T[Fin de atención del día]
    S -.->|Venta de mostrador| VP[Caja → Vender Producto<br/>ingreso + descuento de stock]
    VP -.-> S
    T --> U[Dueño inicia el cierre de caja<br/>POST /caja/cierre/iniciar]
    U --> V[Sistema calcula lo esperado<br/>por forma de pago, Strategy por cada una]
    V --> W[Dueño cuenta el efectivo físico]
    W --> X[Confirma el cierre con el total real<br/>POST /caja/cierre/confirmar]
    X --> Y{¿Cuadra con lo esperado?}
    Y -->|Sí| Z([Cierre guardado, diferencia = 0])
    Y -->|No| AA[Queda registrada la diferencia<br/>para revisar]
    AA --> Z
```

---

## Resumen

| Diagrama | Propósito |
|----------|-----------|
| **Secuencia (1.1–1.11)** | Interacción paso a paso para cada operación crítica: reserva pública, alta manual, transición automática por cron, login 2FA, cobro, cancelación desde el panel, cierre de caja, recordatorio por email, cancelación por el cliente desde el mail, venta de productos y "No vino". |
| **Estados – Turno** | Ciclo de vida real del turno: nace `CONFIRMADO`, avanza por reloj o a mano, con `CANCELADO` (dueño o cliente) y `NO_SHOW` (manual, también desde `EN_PROCESO` o `COMPLETADO` sin pagos) como excepciones. |
| **Actividades** | Flujo de trabajo de una jornada completa, con la mayoría de los turnos auto-avanzando y el dueño interviniendo solo en excepciones y cobro. |

---

*Ver también: `diagrama-er.md` (entidad-relación), `diagrama-clases.md` (modelo de dominio + patrones), `contexto-proyecto.md` (documento consolidado).*
