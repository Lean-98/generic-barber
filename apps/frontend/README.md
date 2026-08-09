# Peluquería Frontend

SPA Angular del Sistema de Gestión de Peluquería, generada con [Angular CLI](https://github.com/angular/angular-cli) (v20.0.4).

> Parte del monorepo [Authentic Barber](../../README.md). Las dependencias se instalan desde la raíz del repo (`npm install`), no dentro de esta carpeta. El binario `ng` no está hoisteado a la raíz, así que usá los scripts de `npm` (que lo resuelven localmente) en lugar de invocar `ng` directamente, salvo que estés parado en `apps/frontend/`.

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
