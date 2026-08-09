// Ruta relativa: asume que el backend se sirve bajo /api en el mismo origen
// (detrás de un reverse proxy o sirviendo el build de Angular directamente).
// Si el backend vive en otro dominio, reemplazar por su URL absoluta.
export const environment = {
  production: true,
  apiUrl: '/api',
};
