# Diagrama Entidad-Relación – Sistema de Peluquería

## Versión 1.0

```mermaid
erDiagram
    %% Catálogo
    Servicios {
        INT idServicio PK "IDENTITY"
        VARCHAR nombre
        TEXT descripcion
        DECIMAL precio
        INT duracionMinutos
        VARCHAR urlImagen
        BOOLEAN vigente
    }

    %% Agenda
    Turno {
        INT idTurno PK "IDENTITY"
        INT idPersona FK
        DATETIME fechaHoraInicio
        DATETIME fechaHoraFin
        VARCHAR estado
        TEXT observacion
        DATETIME fechaCreacion
    }

    TurnoDetalle {
        INT idTurnoDetalle PK "IDENTITY"
        INT idTurno FK
        INT idServicio FK
        DECIMAL precioReal
        INT cantidad DEFAULT 1
    }

    %% Personas
    Persona {
        INT idPersona PK "IDENTITY"
        VARCHAR nombre
        VARCHAR apellido
        VARCHAR mail
        VARCHAR telefono
        DATE fechaNacimiento
        VARCHAR instagram
        DATETIME ultimoCorte
        VARCHAR usuario FK
    }

    UsuariosWeb {
        VARCHAR usuario PK
        VARCHAR email
        VARCHAR hashPass
        INT idPersona FK
        CHAR rol
    }

    %% Pagos y Caja
    FormaPago {
        INT idFormaPago PK "IDENTITY"
        VARCHAR nombre
        BOOLEAN requiereComprobante
        BOOLEAN vigente
    }

    Pago {
        INT idPago PK "IDENTITY"
        INT idTurno FK
        INT idFormaPago FK
        DECIMAL monto
        VARCHAR comprobante
        DATETIME fechaHora
    }

    MovimientoCaja {
        INT idMovimiento PK "IDENTITY"
        DATETIME fechaHora
        VARCHAR tipo
        DECIMAL monto
        VARCHAR concepto
        INT idFormaPago FK
        INT idUsuario FK
        INT idTurno FK "NULL"
    }

    CierreCaja {
        INT idCierre PK "IDENTITY"
        DATE fecha
        DATETIME horaInicio
        DATETIME horaFin
        DECIMAL totalEfectivo
        DECIMAL totalTarjeta
        DECIMAL totalTransferencia
        DECIMAL totalOtros
        DECIMAL totalEsperado
        DECIMAL totalReal
        DECIMAL diferencia
        INT idUsuarioCierra FK
    }

    %% Relaciones
    Persona ||--o{ Turno : "idPersona"

    Turno ||--o{ TurnoDetalle : "idTurno"
    Servicios ||--o{ TurnoDetalle : "idServicio"

    Turno ||--o{ Pago : "idTurno"
    FormaPago ||--o{ Pago : "idFormaPago"

    Turno ||--o| MovimientoCaja : "idTurno"
    FormaPago ||--o{ MovimientoCaja : "idFormaPago"
    UsuariosWeb ||--o{ MovimientoCaja : "idUsuario"

    UsuariosWeb ||--o{ Persona : "idPersona"
    UsuariosWeb ||--o{ CierreCaja : "idUsuarioCierra"
```

---

## Descripción de Entidades

| Entidad | Descripción |
|---------|-------------|
| **Servicios** | Catálogo de servicios ofrecidos (corte, color, barba, etc.). |
| **Turno** | Registro de la agenda con fecha, hora y estado del turno. |
| **TurnoDetalle** | Servicios específicos incluidos dentro de un turno. |
| **Persona** | Datos de clientes (también puede usarse para el peluquero si se extiende). |
| **UsuariosWeb** | Credenciales de acceso al sistema (roles: admin, peluquero, etc.). |
| **FormaPago** | Catálogo de medios de pago (efectivo, tarjeta, transferencia, etc.). |
| **Pago** | Registro de cada pago realizado por un turno. |
| **MovimientoCaja** | Todos los ingresos y egresos de la caja diaria. |
| **CierreCaja** | Resumen diario con arqueo de caja y diferencias. |

---

## Relaciones

| Relación | Tipo | Descripción |
|----------|------|-------------|
| Persona → Turno | 1:N | Un cliente puede tener múltiples turnos. |
| Turno → TurnoDetalle | 1:N | Un turno puede incluir varios servicios. |
| Servicios → TurnoDetalle | 1:N | Un servicio puede aparecer en múltiples turnos. |
| Turno → Pago | 1:N | Un turno puede tener varios pagos parciales. |
| FormaPago → Pago | 1:N | Una forma de pago se usa en múltiples pagos. |
| Turno → MovimientoCaja | 1:1 | Cada turno genera un movimiento de caja (ingreso). |
| FormaPago → MovimientoCaja | 1:N | Una forma de pago se usa en múltiples movimientos. |
| UsuariosWeb → MovimientoCaja | 1:N | Un usuario registra múltiples movimientos. |
| UsuariosWeb → Persona | 1:1 | Cada usuario web está vinculado a una persona. |
| UsuariosWeb → CierreCaja | 1:N | Un usuario puede realizar múltiples cierres de caja. |

---

*Documento generado para el proyecto de Sistema de Gestión de Peluquería.*
