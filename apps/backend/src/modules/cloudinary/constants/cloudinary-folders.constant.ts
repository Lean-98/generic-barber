/** Carpetas válidas para `POST /cloudinary/upload?folder=...` — agregar acá antes de usar una nueva. */
export const CLOUDINARY_FOLDERS = {
  PRODUCTOS: 'productos',
  CURSOS: 'cursos',
  SERVICIOS: 'servicios',
  MARCA: 'marca',
  AUTHENTIC_CLUB: 'authentic-club',
} as const;

export type CloudinaryFolder = (typeof CLOUDINARY_FOLDERS)[keyof typeof CLOUDINARY_FOLDERS];
