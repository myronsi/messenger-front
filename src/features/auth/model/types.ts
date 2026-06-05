import type { User } from '@/entities/user';

export interface AuthResponse {
  access_token?: string | null;
  token_type?: string;
  refresh_token?: string;
  user?: User;
  device_part?: string;
  qr_part?: string;
  two_factor_required?: boolean;
  login_challenge?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface TwoFactorLoginRequest {
  login_challenge: string;
  code: string;
}

export interface RegisterRequest {
  username: string;
  display_name: string;
  password: string;
  email?: string;
}
