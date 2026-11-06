import type { components } from '@/shared/api/generated/schema';

type Schemas = components['schemas'];

export type QrLoginStatus = Schemas['QrLoginStatus'];
export type QrLoginStart = Schemas['QrLoginStart'];
export type QrLoginPollBody = Schemas['QrLoginPollRequest'];
export type QrLoginPollResult = Schemas['QrLoginPollResult'];
export type QrLoginApproved = Extract<QrLoginPollResult, { status: 'approved' }>;
export type QrLoginDetails = Schemas['QrLoginRequest'];
export type QrLoginApproveBody = Schemas['QrLoginApproval'];
