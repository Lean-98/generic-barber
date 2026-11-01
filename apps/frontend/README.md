# Peluquería Frontend

SPA Angular del Sistema de Gestión de Peluquería, generada con [Angular CLI](https://github.com/angular/angular-cli) (v20.0.4).

> Parte del monorepo [Authentic Barber](../../README.md). Las dependencias se instalan desde la raíz del repo (`npm install`), no dentro de esta carpeta. El binario `ng` no está hoisteado a la raíz, así que usá los scripts de `npm` (que lo resuelven localmente) en lugar de invocar `ng` directamente, salvo que estés parado en `apps/frontend/`.

## Pantallas

**Públicas** (sin sesión):

| Ruta | Pantalla |
|------|----------|
| `/` | Landing (contenido y secciones configurables desde Marca) |
| `/reservar` | Reserva de turnos online |
| `/cancelar-turno?token=…` | Cancelación del turno por el cliente (link que llega por mail) |
| `/tienda`, `/cursos-info`, `/nosotros`, `/club` | Secciones de la web (la tienda muestra "Sin stock" cuando corresponde) |
| `/login`, `/forgot-password`, `/reset-password` | Acceso al panel (con verificación en dos pasos por mail) |

**Panel** (con sesión):

| Ruta | Pantalla |
|------|----------|
| `/dashboard` | Resumen del día y aviso de productos con poco stock |
| `/turnos`, `/turnos/nuevo` | Agenda (lista y calendario), alta de turnos, cancelar y "No vino" |
| `/personas` | Clientes |
| `/caja` | Movimientos, registrar pago, vender producto, egresos y cierre de caja |
| `/servicios`, `/productos`, `/cursos` | Catálogo (costo de insumos por servicio, stock por producto) |
| `/reportes` | Resumen, rentabilidad y punto de equilibrio, clientes para recontactar |
| `/configuracion/marca`, `/configuracion/google-calendar` | Configuración del negocio y de la web |

Los errores de validación del backend se muestran con `mensajeDeErrorHttp()` (`shared/utils/error-http.util.ts`), que une los mensajes por campo que devuelve NestJS. Los links de WhatsApp a clientes se arman con `whatsappDeTelefono()` (`shared/utils/whatsapp.util.ts`).

El manual de uso para el dueño está en [`docs/manual-panel.pdf`](../../docs/manual-panel.pdf).

## Development server

Desde `apps/frontend/`:

```bash
npm start
```

O desde la raíz del monorepo:

```bash
npm run dev:frontend
```

Una vez levantado el servidor, abrí `http://localhost:4200/`. La app se recarga automáticamente al modificar los archivos fuente.

## Code scaffolding

Parado en `apps/frontend/`, Angular CLI incluye herramientas de scaffolding. Para generar un componente nuevo:

```bash
npx ng generate component component-name
```

Para ver todos los schematics disponibles (`components`, `directives`, `pipes`, etc.):

```bash
npx ng generate --help
```

## Building

Desde `apps/frontend/`:

```bash
npm run build
```

O desde la raíz:

```bash
npm run build:frontend
```

Esto compila el proyecto y guarda los artefactos en `dist/`. Por defecto, el build de producción optimiza la app para performance y tamaño.

## Running unit tests

Con [Karma](https://karma-runner.github.io), desde `apps/frontend/`:

```bash
npm test
```

O desde la raíz:

```bash
npm run test:frontend
```

## Running end-to-end tests

Angular CLI no incluye un framework de e2e por defecto; hay que elegir uno según necesidad.

## Additional Resources

Para más información sobre Angular CLI, ver la [referencia de comandos](https://angular.dev/tools/cli).
