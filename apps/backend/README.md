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
├── prisma/
│   └── schema.prisma           # Esquema de base de datos
├── src/
│   ├── main.ts                 # Punto de entrada
│   ├── app.module.ts           # Módulo raíz
│   ├── common/
│   │   └── enums/              # Enums del dominio
│   └── modules/
│       ├── prisma/             # PrismaService (global)
│       ├── auth/               # Autenticación (JWT)
│       ├── servicios/          # ABM de servicios
│       ├── turnos/             # Gestión de turnos
│       ├── personas/           # Gestión de clientes
│       └── caja/               # Pagos, movimientos y cierre
├── .env.example                # Variables de entorno de ejemplo
└── package.json
```

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
| `npm run start:dev` | Inicia en modo desarrollo |
| `npm run build` | Compila para producción |
| `npm run start:prod` | Inicia en producción |

## Próximos pasos

- [ ] Implementar endpoints de Servicios
- [ ] Implementar endpoints de Turnos (con patrón State)
- [ ] Implementar endpoints de Personas
- [ ] Implementar lógica de Caja y Pagos (con patrón Strategy)
- [ ] Implementar autenticación JWT
- [ ] Integrar Google Calendar
