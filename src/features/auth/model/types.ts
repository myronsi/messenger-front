import type { components } from '@/shared/api/generated/schema';

type Schemas = components['schemas'];

export type LoginRequest = Schemas['LoginRequest'];
export type TwoFactorLoginRequest = Schemas['TwoFactorLoginRequest'];
export type RegisterRequest = Schemas['RegisterRequest'];
export type TokenResponse = Schemas['TokenResponse'];
export type RegisterResponse = Schemas['RegisterResponse'];
export type TwoFactorChallenge = Schemas['TwoFactorChallenge'];
// A login either signs in or, with 2FA on, asks for a code with a challenge.
export type LoginResponse = Schemas['LoginResponse'];
export type RecoveryRequest = Schemas['RecoveryRequest'];
export type RecoveryResponse = Schemas['RecoveryResponse'];
export type ResetPasswordRequest = Schemas['ResetPasswordRequest'];

export const isTwoFactorChallenge = (response: LoginResponse): response is TwoFactorChallenge =>
  'two_factor_required' in response && response.two_factor_required === true;
