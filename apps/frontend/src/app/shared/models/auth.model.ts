export interface LoginRequest {
  login: string;
  password: string;
}

export interface LoginResponse {
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
