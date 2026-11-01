# Authentic Barber

Monorepo del sistema de gestión de peluquería: backend en NestJS y frontend en Angular, administrados con **npm workspaces**.

## Qué hace

**Sitio público**
- Landing configurable desde el panel (marca, horarios, galería, club, tienda, cursos).
- Reserva de turnos online, respetando el horario de atención y sin superposiciones.
- Mails de confirmación y de recordatorio, con un botón para que el cliente cancele solo. Si cancela, el horario se libera y al barbero le llega un aviso.

**Panel de administración**
- **Turnos**: agenda en lista o calendario. Los turnos avanzan solos por el reloj (en proceso → completado); el dueño solo cancela o marca "No vino".
- **Clientes**: alta, búsqueda (también por teléfono) e historial.
- **Caja**: cobro de turnos, venta de productos (descuenta stock), egresos y cierre diario.
- **Catálogo**: servicios (precio, duración, costo de insumos), productos con stock opcional y cursos.
- **Reportes**: ingresos y turnos del período, rentabilidad y punto de equilibrio, y clientes para recontactar por WhatsApp.
- **Configuración**: marca y contenido de la web, horarios, fidelización y descuento de personal, recordatorios y Google Calendar.
- **Seguridad**: login con verificación en dos pasos por mail.

## Estructura

```
.
├── apps/
│   ├── backend/     # API NestJS + Prisma + PostgreSQL
│   └── frontend/    # SPA Angular + Tailwind/daisyUI
├── diagramas-arquitectura-software/  # Diagramas UML y contexto de arquitectura
├── docs/            # Manual del panel, diccionario de datos y guías para el cliente
├── scripts/         # Backups, verificación de datos y pruebas de humo
├── package.json     # Workspace raíz (scripts cruzados)
└── package-lock.json
```

Cada app mantiene su propio `package.json`, `README.md` y configuración (`tsconfig`, `.gitignore`, etc). El `package.json` de la raíz solo declara los workspaces y expone scripts para operar ambas apps desde un mismo lugar.

## Stack

| App | Stack |
|-----|-------|
| `apps/backend` | NestJS, Prisma, PostgreSQL, JWT, Google Calendar API, Swagger |
| `apps/frontend` | Angular 20, Tailwind CSS, daisyUI |

## Primeros pasos

### 1. Instalar dependencias (una sola vez, desde la raíz)

```bash
npm install
```

`npm install` resuelve las dependencias de ambos workspaces y las hoistea a un único `node_modules` en la raíz.

### 2. Configurar y levantar el backend

```bash
cp apps/backend/.env.example apps/backend/.env
npm run --workspace=apps/backend db:up          # PostgreSQL en Docker
npm run --workspace=apps/backend prisma:generate
npm run --workspace=apps/backend prisma:migrate
```

### 3. Levantar ambas apps en desarrollo

```bash
npm run dev:backend    # API en http://localhost:3000/api (Swagger en /api/docs)
npm run dev:frontend   # SPA en http://localhost:4200
```

Correr cada comando en una terminal distinta.

## Scripts disponibles (raíz)

| Comando | Descripción |
|---------|-------------|
| `npm run dev:backend` | Backend en modo watch (`nest start --watch`) |
| `npm run dev:frontend` | Frontend en modo dev (`ng serve`) |
| `npm run build` | Compila backend y frontend |
| `npm run build:backend` | Compila solo el backend |
| `npm run build:frontend` | Compila solo el frontend |
| `npm run test:backend` | Tests del backend (Jest) |
| `npm run test:frontend` | Tests del frontend (Karma) |

Para scripts específicos de cada app que no estén en la tabla (migraciones, Prisma Studio, `ng generate`, etc.), usar `npm run <script> --workspace=apps/backend` o `--workspace=apps/frontend`, o entrar directamente a la carpeta de la app. Ver el detalle en [`apps/backend/README.md`](apps/backend/README.md) y [`apps/frontend/README.md`](apps/frontend/README.md).

## Documentación

| Documento | Para quién | Contenido |
|-----------|------------|-----------|
| [`docs/manual-panel.pdf`](docs/manual-panel.pdf) | Dueño del negocio | Uso del panel: turnos, caja, cierre, descuentos, stock, reportes y mensajes de error |
| [`docs/guia-imagenes-cloudinary.pdf`](docs/guia-imagenes-cloudinary.pdf) | Dueño del negocio | Cómo subir las imágenes de la marca y cargarlas en el panel |
| [`docs/diccionario-datos.md`](docs/diccionario-datos.md) | Desarrollo | Tablas y columnas, generado desde `schema.prisma` (`npm run docs:diccionario --workspace=apps/backend`) |
| [`diagramas-arquitectura-software/`](diagramas-arquitectura-software/) | Desarrollo | Contexto del proyecto, diagrama ER, clases, secuencias, estados y actividades |
| Swagger (`/api/docs`) | Desarrollo | Todos los endpoints de la API |

## Despliegue de cambios con migraciones

El contenedor del backend aplica las migraciones pendientes solo al arrancar (`npx prisma migrate deploy` en el `CMD` del `Dockerfile`). Por eso, en una base con datos reales, **antes de desplegar la imagen nueva** hay que revisar que ninguna fila rompa las restricciones `CHECK`:

```bash
docker compose -f docker-compose.prod.yml exec -T db psql -U "$DB_USER" -d "$DB_NAME" < scripts/verificar-checks.sql
```

Si devuelve filas, hay que corregir esos datos antes de desplegar; si no, la migración falla y el backend no arranca. Para que los mails traigan el botón de cancelar turno, `FRONTEND_URL` y `JWT_SECRET` tienen que estar configuradas en el backend.

## Historial

El historial de commits de `apps/backend` proviene del repo original `peluqueria-backend` (preservado al unificar en este monorepo). `apps/frontend` se incorporó como snapshot, sin historial previo.
