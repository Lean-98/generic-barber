# Diagrama de Clases – Authentic Barber

## Versión 2.1 (actualizado a partir del código real, 2026-11-01)

Dos diagramas: el **modelo de dominio** (mismas entidades que `diagrama-er.md`, en forma de clase TS) y las **clases de los patrones de diseño realmente implementados** (State, Facade, Strategy — ver `contexto-proyecto.md` sección 8 para el detalle de cuáles se evaluaron y se descartaron).

---

## 1. Modelo de dominio

```mermaid
classDiagram
    direction LR

    class CategoriaServicio {
        +number idCategoria
        +string nombre
        +boolean vigente
        +Servicio[] servicios
    }

    class Servicio {
        +number idServicio
        +string nombre
        +string descripcion
        +number idCategoria
        +number precio
        +number duracionMinutos
        +string urlImagen
        +boolean vigente
        +boolean cuentaParaFidelizacion
        +number costoInsumos
        +CategoriaServicio categoria
        +TurnoDetalle[] detalles
        +ServicioHistorial[] historial
    }

    class ServicioHistorial {
        +number idHistorial
        +number idServicio
        +number precio
        +number duracionMinutos
        +boolean vigente
        +Date fechaCambio
    }

    class Turno {
        +number idTurno
        +number idPersona
        +Date fechaHoraInicio
        +Date fechaHoraFin
        +TurnoEstado estado
        +string observacion
        +Date fechaCreacion
        +string googleEventId
        +Date recordatorioEnviadoEn
        +number idFormaPagoPreferida
        +Date canceladoEn
        +string canceladoPor
        +Persona persona
        +TurnoDetalle[] detalles
        +Pago[] pagos
        +MovimientoCaja[] movimientos
        +FormaPago formaPagoPreferida
    }

    class TurnoDetalle {
        +number idTurnoDetalle
        +number idTurno
        +number idServicio
        +number precioReal
        +number cantidad
        +number descuentoPorcentaje
        +string descuentoMotivo
        +Turno turno
        +Servicio servicio
    }

    class Persona {
        +number idPersona
        +string nombre
        +string apellido
        +string mail
        +string telefono
        +Date fechaNacimiento
        +string instagram
        +Date ultimoCorte
        +string usuario
        +boolean aplicaDescuentoPersonal
        +Turno[] turnos
        +UsuarioWeb usuarioWeb
    }

    class UsuarioWeb {
        +string usuario
        +string email
        +string hashPass
        +number idPersona
        +string rol
        +string resetTokenHash
        +Date resetTokenExpiresAt
        +string twoFactorCodeHash
        +Date twoFactorCodeExpiresAt
        +Persona persona
        +MovimientoCaja[] movimientos
        +CierreCaja[] cierres
        +DispositivoConfiable[] dispositivosConfiables
    }

    class DispositivoConfiable {
        +number id
        +string usuario
        +string tokenHash
        +Date expiraEn
        +Date creadoEn
        +UsuarioWeb usuarioWeb
    }

    class FormaPago {
        +number idFormaPago
        +string nombre
        +boolean requiereComprobante
        +boolean vigente
        +Pago[] pagos
        +MovimientoCaja[] movimientos
        +Turno[] turnosPreferencia
    }

    class Pago {
        +number idPago
        +number idTurno
        +number idFormaPago
        +number monto
        +string comprobante
        +Date fechaHora
        +Turno turno
        +FormaPago formaPago
    }

    class MovimientoCaja {
        +number idMovimiento
        +Date fechaHora
        +MovimientoTipo tipo
        +number monto
        +string concepto
        +number idFormaPago
        +string idUsuario
        +number idTurno
        +number idProducto
        +number cantidadProducto
        +FormaPago formaPago
        +UsuarioWeb usuario
        +Turno turno
        +Producto producto
    }

    class CierreCaja {
        +number idCierre
        +Date fecha
        +Date horaInicio
        +Date horaFin
        +number totalEfectivo
        +number totalTarjeta
        +number totalTransferencia
        +number totalOtros
        +number totalEsperado
        +number totalReal
        +number diferencia
        +string idUsuarioCierra
        +UsuarioWeb usuarioCierra
    }

    class ConfiguracionNegocio {
        +number id
        +string nombre
        +string logoUrl
        +string colorPrimario
        +Json horarios
        +Json galeriaUrls
        +boolean fidelizacionActiva
        +number fidelizacionVisitasRequeridas
        +number fidelizacionDescuentoPorcentaje
        +boolean descuentoEmpleadoActivo
        +number descuentoEmpleadoPorcentaje
        +number recordatorioHorasAntes
    }

    class CostosNegocio {
        +number id
        +number costosFijosMensuales
        +number costoHoraTrabajo
    }

    class GoogleCalendarConfig {
        +number id
        +string accessToken
        +string refreshToken
        +Date expiryDate
        +string calendarId
    }

    class Categoria {
        +number idCategoria
        +string nombre
        +boolean vigente
        +Producto[] productos
    }

    class Producto {
        +number idProducto
        +string nombre
        +string descripcion
        +number precio
        +string urlImagen
        +number idCategoria
        +boolean vigente
        +number stock
        +number stockMinimo
        +Categoria categoria
        +MovimientoCaja[] movimientos
    }

    class Curso {
        +number idCurso
        +string nombre
        +string subtitulo
        +string descripcion
        +number precio
        +string duracion
        +string[] temario
        +Date fechaInicio
        +Date fechaFin
        +boolean vigente
    }

    class TurnoEstado {
        <<enumeration>>
        PENDIENTE
        CONFIRMADO
        EN_PROCESO
        COMPLETADO
        CANCELADO
        NO_SHOW
    }

    class MovimientoTipo {
        <<enumeration>>
        INGRESO
        EGRESO
    }

    CategoriaServicio "1" --> "0..*" Servicio : servicios
    Servicio "1" --> "0..*" ServicioHistorial : historial
    Servicio "1" --> "0..*" TurnoDetalle : servicio
    Turno "1" --> "0..*" TurnoDetalle : detalles
    Turno "1" --> "0..*" Pago : pagos
    Turno "1" --> "0..*" MovimientoCaja : movimientos
    Turno "0..*" --> "0..1" FormaPago : formaPagoPreferida
    Pago "0..*" --> "1" FormaPago : formaPago
    Turno "1" --> "0..1" Persona : persona
    Persona "1" --> "0..1" UsuarioWeb : usuarioWeb
    UsuarioWeb "1" --> "0..*" MovimientoCaja : movimientos
    UsuarioWeb "1" --> "0..*" CierreCaja : cierres
    UsuarioWeb "1" --> "0..*" DispositivoConfiable : dispositivosConfiables
    FormaPago "1" --> "0..*" MovimientoCaja : movimientos
    Categoria "1" --> "0..*" Producto : productos
    MovimientoCaja "0..*" --> "0..1" Producto : producto
    Turno ..> TurnoEstado : usa
    MovimientoCaja ..> MovimientoTipo : usa
```

---

## 2. Clases de los patrones de diseño implementados

Los tres patrones que están realmente en el código (no solo documentados): **State** para el ciclo de vida del turno, **Facade** para el proceso de cobro, y **Strategy** para el cálculo del cierre de caja por forma de pago. Ninguno usa una capa de Mapper/entidad de dominio separada: el State pattern se arma al vuelo a partir del string `estado` que devuelve Prisma (`getTurnoState(turno.estado)`), no de un objeto rehidratado.

```mermaid
classDiagram
    direction TB

    class ITurnoState {
        <<interface>>
        +confirmar()
        +cancelar()
        +iniciarAtencion()
        +finalizar()
        +registrarPago()
        +marcarNoShow()
        +getEstado() string
    }

    class PendienteState
    class ConfirmadoState
    class EnProcesoState
    class CompletadoState
    class CanceladoState
    class NoShowState

    ITurnoState <|.. PendienteState
    ITurnoState <|.. ConfirmadoState
    ITurnoState <|.. EnProcesoState
    ITurnoState <|.. CompletadoState
    ITurnoState <|.. CanceladoState
    ITurnoState <|.. NoShowState

    class TurnoStateFactory {
        <<function>>
        +getTurnoState(estado string) ITurnoState
    }
    TurnoStateFactory ..> ITurnoState : crea

    class TurnosService {
        +create(dto) Turno
        +confirmar(id) Turno
        +cancelar(id, origen) Turno
        +cancelarPorCliente(token) TurnoParaCancelar
        +getTurnoParaCancelar(token) TurnoParaCancelar
        +urlCancelacionDe(id) string
        +iniciarAtencion(id) Turno
        +finalizar(id) Turno
        +registrarPago(id) Turno
        +marcarNoShow(id) Turno
        -avisarCancelacionAlBarbero(turno, canceladoEn)
        -verificarDisponibilidad(inicio, fin)
        -verificarHorarioAtencion(inicio, fin)
        -cambiarEstado(id, nuevoEstado, validacion)
    }
    TurnosService ..> TurnoStateFactory : usa

    class TurnosCronService {
        +procesarTransicionesAutomaticas()
        -confirmarPendientesRezagados()
        -iniciarTurnosQueArrancan()
        -finalizarTurnosQueTerminan()
    }
    TurnosCronService ..> TurnosService : delega transiciones

    class CajaFacade {
        +procesarPago(dto, idUsuario) resultado
        +venderProducto(dto, idUsuario) resultado
        +registrarEgreso(monto, concepto, idFormaPago, idUsuario)
    }
    CajaFacade ..> PagosService : usa
    CajaFacade ..> MovimientosService : usa
    CajaFacade ..> TurnosService : usa

    class PagosService
    class MovimientosService

    class ICierreStrategy {
        <<interface>>
        +nombre string
        +calcularTotal(prisma, fecha) number
    }

    class EfectivoStrategy
    class TarjetaStrategy
    class TransferenciaStrategy
    class OtrosStrategy

    ICierreStrategy <|.. EfectivoStrategy
    ICierreStrategy <|.. TarjetaStrategy
    ICierreStrategy <|.. TransferenciaStrategy
    ICierreStrategy <|.. OtrosStrategy

    class CierreStrategyFactory {
        <<function>>
        +getCierreStrategy(nombre string) ICierreStrategy
    }
    CierreStrategyFactory ..> ICierreStrategy : crea

    class CierreService {
        +iniciarCierre(fecha)
        +confirmarCierre(id, totalReal)
    }
    CierreService ..> CierreStrategyFactory : usa
```

**Notas**:

- `TurnosCronService` (nuevo) nunca escribe `estado` directo: siempre llama a los métodos del servicio (`confirmar`/`iniciarAtencion`/`finalizar`), así que las transiciones automáticas pasan por la misma validación del patrón State que las manuales — el cron no puede dejar un turno en un estado ilegal.
- `TarjetaStrategy` agrupa "Tarjeta de Crédito" y "Tarjeta de Débito" en un solo total; `OtrosStrategy` es el catch-all para cualquier forma de pago que no sea Efectivo/Tarjeta/Transferencia (hoy, Mercado Pago).
- `EnProcesoState.marcarNoShow()` está permitido: como el cron pasa el turno a `EN_PROCESO` a la hora de inicio, un cliente que no vino casi siempre se detecta en ese estado. Desde `COMPLETADO` el State lo rechaza, pero `TurnosService.marcarNoShow()` hace una excepción explícita si el turno **no tiene pagos** (lo cerró el cron por horario sin que nadie lo atendiera). Es la única regla de transición que depende de datos fuera del estado, por eso vive en el service y no en la clase de estado.
- `cancelarPorCliente(token)` no pasa por `getTurnoState().cancelar()`: hace un `updateMany` condicionado a `estado IN (PENDIENTE, CONFIRMADO)` para que dos clics simultáneos (o el cron pasando el turno a `EN_PROCESO` en el mismo momento) no generen dos avisos al barbero. El token es un HMAC del id del turno firmado con `JWT_SECRET` (`cancelacion-token.util.ts`), sin guardar nada en la base.
- `CajaFacade.venderProducto()` crea el `MovimientoCaja` y descuenta el stock en una sola transacción. El descuento es un `updateMany` condicionado a `stock >= cantidad`, así que dos ventas simultáneas de la última unidad nunca dejan el stock negativo.
- `registrarPago(id)` sigue existiendo en el backend (`POST /turnos/:id/pagar`), pero el panel ya no lo usa: no registraba plata. El cobro real es siempre `CajaFacade.procesarPago()`.
- Ver `contexto-proyecto.md` sección 8 para qué patrones se evaluaron y se descartaron (Builder, Adapter como clase formal, Observer/Mediator vía event bus) y por qué.

---

*Ver también: `diagrama-er.md` (entidad-relación), `diagramas-procesos.md` (secuencia/estados/actividades), `contexto-proyecto.md` (documento consolidado).*
