# Peluquería Backend

Backend API para el Sistema de Gestión de Peluquería.

> Parte del monorepo [Authentic Barber](../../README.md). Las dependencias se instalan desde la raíz del repo (`npm install`), no dentro de esta carpeta.

## Stack

- **Framework**: NestJS
- **Base de Datos**: PostgreSQL
- **ORM**: Prisma
- **Contenedores**: Docker
- **API**: RESTful + Swagger

## Estructura del Proyecto

```
apps/backend/
├── docker-compose.yml          # PostgreSQL en Docker
├── Dockerfile                  # Imagen de producción (aplica migraciones al arrancar)
├── prisma/
│   ├── schema.prisma           # Esquema de base de datos
│   ├── migrations/             # Migraciones (incluyen restricciones CHECK)
│   └── seed.ts                 # Datos de demo
├── scripts/
│   └── generar-diccionario-datos.ts   # Genera docs/diccionario-datos.md
├── src/
│   ├── main.ts                 # Punto de entrada
│   ├── app.module.ts           # Módulo raíz
│   ├── common/                 # Decoradores (@Public, @IsTelefono), enums, filtros, utils de fecha AR
│   └── modules/
│       ├── prisma/             # PrismaService (global)
│       ├── auth/               # Login, 2FA por mail, dispositivos confiables, guards JWT
│       ├── personas/           # Clientes
│       ├── servicios/          # Servicios, historial de precios
│       ├── categorias-servicios/
│       ├── turnos/             # Turnos (patrón State), reserva y cancelación públicas, cron de estados
│       ├── caja/               # Pagos, venta de productos, movimientos y cierre (Facade + Strategy)
│       ├── productos/          # Productos y stock
│       ├── categorias/         # Categorías de productos
│       ├── cursos/             # Cursos
│       ├── reportes/           # Reportes, rentabilidad, clientes inactivos y costos
│       ├── configuracion/      # Marca, horarios, fidelización (pública para la landing)
│       ├── notifications/      # Cron de recordatorios por mail
│       ├── mail/               # Mails transaccionales (Resend)
│       ├── google-calendar/    # Sincronización con Google Calendar
│       └── cloudinary/         # Subida de imágenes
├── test/                       # Tests e2e y mocks
├── .env.example                # Variables de entorno de ejemplo
└── package.json
```

## Módulos y endpoints principales

Todos bajo `/api`. El detalle completo está en Swagger (`/api/docs`).

| Módulo | Endpoints destacados | Notas |
|--------|----------------------|-------|
| Turnos (panel) | `POST /turnos`, `DELETE /turnos/:id`, `POST /turnos/:id/no-show` | "No vino" se acepta en turnos confirmados, en proceso o completados sin pagos |
| Turnos públicos | `GET /turnos-publicos/disponibilidad`, `POST /turnos-publicos/reservar`, `GET /turnos-publicos/cancelacion`, `POST /turnos-publicos/cancelar` | Sin sesión, con rate limiting. La cancelación usa un token firmado que llega por mail |
| Caja | `POST /caja/pagos`, `POST /caja/ventas-producto`, `POST /caja/cierre/iniciar`, `POST /caja/cierre/confirmar` | La venta de productos descuenta stock en la misma transacción |
| Productos | `GET /productos`, `GET /productos/stock-bajo` | Stock opcional por producto |
| Reportes | `GET /reportes/rentabilidad`, `GET /reportes/clientes-inactivos?dias=60`, `GET /reportes/clientes-sin-visitas`, `GET`/`PUT /reportes/costos` | Los costos son internos (tabla `costos_negocio`) |
| Servicios | `GET /servicios` | Público, pero `costoInsumos` solo se devuelve con sesión (`OptionalJwtAuthGuard`) |

## Variables de entorno

Ver `.env.example`. Las que afectan funcionalidades:

| Variable | Para qué |
|----------|----------|
| `JWT_SECRET` | Firma de sesiones, clave del token de Google Calendar y firma del link "Cancelar turno". Si se cambia, los links de los mails ya enviados dejan de funcionar y hay que revincular Google Calendar |
| `FRONTEND_URL` | Base de los links de los mails (recuperar contraseña y cancelar turno). Sin ella, los mails salen sin el botón de cancelar |
| `RESEND_API_KEY`, `MAIL_FROM` | Envío de mails (confirmación, recordatorio, aviso de cancelación, código 2FA, recuperar contraseña). Sin API key no se manda ninguno: los turnos funcionan igual, pero el login queda esperando un código de 2FA que nunca llega |
| `GOOGLE_*` | Integración con Google Calendar |
| `CLOUDINARY_*` | Subida de imágenes desde el panel |

## Primeros pasos

Todos los comandos `npm run <script>` de esta sección se pueden ejecutar parado en `apps/backend/`, o desde la raíz del monorepo con `npm run <script> --workspace=apps/backend`.

### 1. Instalar dependencias (desde la raíz del monorepo)

```bash
cd ../..
npm install
```

### 2. Levantar la base de datos

```bash
cd apps/backend
cp .env.example .env
npm run db:up
```

### 3. Generar el cliente de Prisma

```bash
npm run prisma:generate
```

### 4. Ejecutar migraciones

```bash
npm run prisma:migrate
```

### 5. Iniciar la aplicación

```bash
npm run start:dev
```

La API estará disponible en:
- API: `http://localhost:3000/api`
- Swagger: `http://localhost:3000/api/docs`

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `npm run db:up` | Levanta PostgreSQL en Docker |
| `npm run db:down` | Detiene PostgreSQL |
| `npm run db:reset` | Resetea la base de datos |
| `npm run prisma:generate` | Genera el cliente Prisma |
| `npm run prisma:migrate` | Crea y ejecuta migraciones |
| `npm run prisma:studio` | Abre Prisma Studio (GUI) |
| `npm run prisma:seed` | Carga datos de demo |
| `npm run docs:diccionario` | Regenera `docs/diccionario-datos.md` desde el schema (correr `prisma:generate` antes si cambió) |
| `npm test` | Tests unitarios (Jest) |
| `npm run test:e2e` | Tests e2e (necesitan la base levantada) |
| `npm run start:dev` | Inicia en modo desarrollo |
| `npm run build` | Compila para producción |
| `npm run start:prod` | Inicia en producción |

## Restricciones de la base

Además de los DTOs, la base tiene restricciones `CHECK` (estado del turno, montos, cantidades,
porcentajes). Antes de desplegar en una base con datos reales, correr
`scripts/verificar-checks.sql` (en la raíz del repo): el `Dockerfile` aplica las migraciones al
arrancar y, si alguna fila viola un `CHECK`, el backend no levanta. Ver la lista completa en
[`diagramas-arquitectura-software/diagrama-er.md`](../../diagramas-arquitectura-software/diagrama-er.md).

## Más documentación

- [`docs/diccionario-datos.md`](../../docs/diccionario-datos.md): tablas y columnas.
- [`diagramas-arquitectura-software/`](../../diagramas-arquitectura-software/): arquitectura, patrones y flujos.
