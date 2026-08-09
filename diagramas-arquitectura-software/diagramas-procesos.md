# Diagramas de Procesos – Sistema de Peluquería

---

## 1. Diagramas de Secuencia

### 1.1. Agendar Turno

```mermaid
sequenceDiagram
    actor Cliente
    actor Usuario as Usuario (Peluquero)
    participant UI as Interfaz Web
    participant API as Backend (API)
    participant DB as Base de Datos

    Cliente->>Usuario: Solicita turno (teléfono/presencial)
    Usuario->>UI: Ingresa datos: servicio, fecha/hora, cliente
    UI->>API: POST /turnos (datos del turno)
    API->>DB: Verificar disponibilidad horario
    DB-->>API: Horario disponible
    API->>DB: INSERT Turno + TurnoDetalle
    DB-->>API: Turno creado (idTurno)
    API-->>UI: Respuesta 201 (turno confirmado)
    UI-->>Usuario: Muestra confirmación
    Usuario-->>Cliente: Informa turno agendado
```

### 1.2. Cobrar en Caja

```mermaid
sequenceDiagram
    actor Usuario as Usuario (Peluquero)
    participant UI as Interfaz Web
    participant API as Backend (API)
    participant DB as Base de Datos

    Usuario->>UI: Selecciona turno finalizado
    UI->>API: GET /turno/{id}
    API->>DB: Obtener turno y detalles
    DB-->>API: Datos del turno
    API-->>UI: Muestra total a pagar
    Usuario->>UI: Ingresa forma de pago y monto
    UI->>API: POST /pagos (idTurno, formaPago, monto)
    API->>DB: INSERT Pago
    DB-->>API: Pago registrado
    API->>DB: INSERT MovimientoCaja (ingreso)
    DB-->>API: Movimiento registrado
    API->>DB: UPDATE Turno estado = PAGADO
    DB-->>API: Turno actualizado
    API-->>UI: Respuesta 200 (pago exitoso)
    UI-->>Usuario: Muestra comprobante / cierre
```

### 1.3. Cancelar Turno

```mermaid
sequenceDiagram
    actor Usuario as Usuario (Peluquero)
    participant UI as Interfaz Web
    participant API as Backend (API)
    participant DB as Base de Datos

    Usuario->>UI: Selecciona turno a cancelar
    UI->>API: GET /turno/{id}
    API->>DB: Consultar estado del turno
    DB-->>API: Estado: PENDIENTE o CONFIRMADO
    API-->>UI: Muestra datos y opción de cancelar
    Usuario->>UI: Confirma cancelación
    UI->>API: PUT /turno/{id}/cancelar
    API->>DB: Verificar que no esté PAGADO o FINALIZADO
    DB-->>API: Validación OK
    API->>DB: UPDATE Turno estado = CANCELADO
    DB-->>API: Turno cancelado
    API-->>UI: Respuesta 200 (cancelación exitosa)
    UI-->>Usuario: Muestra confirmación
```

### 1.4. Cierre de Caja Diario

```mermaid
sequenceDiagram
    actor Usuario as Usuario (Peluquero)
    participant UI as Interfaz Web
    participant API as Backend (API)
    participant DB as Base de Datos

    Usuario->>UI: Solicita cierre de caja
    UI->>API: POST /cierre-caja
    API->>DB: Calcular totales por forma de pago del día
    DB-->>API: Totales: efectivo, tarjeta, transferencia, otros
    API->>API: Calcular totalEsperado vs totalReal
    Usuario->>UI: Ingresa totalReal (conteo físico)
    UI->>API: PUT /cierre-caja/{id} (totalReal)
    API->>API: Calcular diferencia = totalReal - totalEsperado
    API->>DB: INSERT/UPDATE CierreCaja
    DB-->>API: Cierre registrado
    API-->>UI: Respuesta 200 (resumen del cierre)
    UI-->>Usuario: Muestra diferencia y reporte
```

---

## 2. Diagrama de Estados – Turno

```mermaid
stateDiagram-v2
    [*] --> PENDIENTE : crearTurno()

    PENDIENTE --> CONFIRMADO : confirmar()
    PENDIENTE --> CANCELADO : cancelar()

    CONFIRMADO --> EN_ATENCION : iniciarAtencion()
    CONFIRMADO --> CANCELADO : cancelar()
    CONFIRMADO --> NO_SHOW : marcarNoShow()

    EN_ATENCION --> FINALIZADO : finalizarServicio()

    FINALIZADO --> PAGADO : registrarPago()
    FINALIZADO --> PAGADO : cobrar()

    PAGADO --> [*] : ciclo completo
    CANCELADO --> [*] : ciclo terminado
    NO_SHOW --> [*] : ciclo terminado

    note right of PENDIENTE
        Turno creado pero aún no confirmado.
        Puede editarse o cancelarse sin costo.
    end note

    note right of CONFIRMADO
        Cliente confirmado.
        Se bloquea el horario en la agenda.
    end note

    note right of EN_ATENCION
        El cliente está siendo atendido.
        Se pueden agregar servicios extra.
    end note

    note right of FINALIZADO
        Atención terminada.
        Esperando registro del pago.
    end note

    note right of PAGADO
        Pago registrado.
        Movimiento de caja generado.
    end note
```

---

## 3. Diagrama de Actividades – Flujo del Día

```mermaid
flowchart TD
    A([Inicio del día]) --> B{Cliente llega}
    B -->|Sí| C{¿Tiene turno agendado?}
    C -->|Sí| D[Buscar turno en agenda]
    C -->|No| E[Crear turno walk-in]
    D --> F[Iniciar atención]
    E --> F

    F --> G[Seleccionar servicios realizados]
    G --> H[Finalizar atención]
    H --> I{¿Cobrar ahora?}
    I -->|Sí| J[Registrar forma de pago]
    I -->|No| K[Dejar como pendiente de pago]
    J --> L[Registrar movimiento en caja]
    K --> M{¿Más clientes?}
    L --> M

    M -->|Sí| B
    M -->|No| N[Realizar cierre de caja]
    N --> O[Verificar totales vs efectivo real]
    O --> P{¿Cuadra?}
    P -->|Sí| Q[Confirmar cierre y guardar]
    P -->|No| R[Registrar diferencia y observación]
    R --> Q
    Q --> S([Fin del día])
```

---

## Resumen

| Diagrama | Propósito |
|----------|-----------|
| **Secuencia** | Detalla la interacción paso a paso entre el usuario, la interfaz, el backend y la base de datos para cada operación crítica. |
| **Estados – Turno** | Modela el ciclo de vida completo de un turno, desde su creación hasta su cierre, incluyendo estados intermedios y transiciones. |
| **Actividades** | Visualiza el flujo de trabajo global en la peluquería durante una jornada completa. |

Estos diagramas te sirven como base para desarrollar los endpoints de la API, las pantallas del frontend y las reglas de negocio en el backend.
