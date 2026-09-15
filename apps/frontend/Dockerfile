# --- build: compila la app Angular en modo producción ---
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production

# --- runtime: sirve el build estático con Nginx ---
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist/peluqueria-frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
