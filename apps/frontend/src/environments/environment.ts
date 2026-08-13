// Ruta relativa: el dev server de Angular reenvía /api al backend
// via proxy.conf.json. Esto evita hardcodear localhost:3000, que
// se rompe al exponer el frontend por un túnel (ngrok/cloudflared).
export const environment = {
  production: false,
  apiUrl: '/api',
};
