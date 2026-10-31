export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
  requiresTwoFactor: boolean;
  access_token?: string;
  user?: {
    usuario: string;
    email: string;
    rol: string;
  };
  /** Presente solo cuando requiresTwoFactor es true: identifica al usuario para el paso de verify-2fa. */
  login?: string;
  message?: string;
}

export interface Verify2faRequest {
  login: string;
  code: string;
  recordarDispositivo?: boolean;
}

export interface Verify2faResponse {
  access_token: string;
  user: {
    usuario: string;
    email: string;
    rol: string;
  };
}

export interface RegisterRequest {
  usuario: string;
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  telefono?: string;
}

export interface UserProfile {
  usuario: string;
  email: string;
  rol: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface MessageResponse {
  message: string;
}
