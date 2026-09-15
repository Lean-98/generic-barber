# --- deps: instala dependencias (incluye devDependencies, necesarias para compilar y para `prisma migrate deploy` en runtime) ---
FROM node:24-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# --- build: genera el cliente de Prisma y compila TypeScript ---
FROM deps AS build
WORKDIR /app
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

# --- runtime: imagen final, sin herramientas de compilación ---
FROM node:24-slim AS runtime
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/prisma ./prisma
COPY --from=build --chown=node:node /app/package.json ./package.json

USER node
EXPOSE 3000

# Aplica migraciones pendientes antes de levantar la API. Es idempotente:
# si no hay migraciones nuevas, no hace nada.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
