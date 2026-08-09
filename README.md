# Authentic Barber

Monorepo del sistema de gestión de peluquería: backend en NestJS y frontend en Angular, administrados con **npm workspaces**.

## Estructura

```
.
├── apps/
│   ├── backend/     # API NestJS + Prisma + PostgreSQL
│   └── frontend/    # SPA Angular + Tailwind/daisyUI
├── diagramas-arquitectura-software/  # Diagramas UML del proyecto
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

## Historial

El historial de commits de `apps/backend` proviene del repo original `peluqueria-backend` (preservado al unificar en este monorepo). `apps/frontend` se incorporó como snapshot, sin historial previo.
