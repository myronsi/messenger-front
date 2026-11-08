import { apiClient } from '@/shared/api/client';
import { ApiProblem } from '@/shared/api/problem';
import { confirmWithPasskey } from '@/shared/api/passkeys';

export class ApprovalSessionTooNew extends Error {
  constructor(readonly approvableFrom: string) {
    super('This session is too new to approve account recovery.');
    this.name = 'ApprovalSessionTooNew';
  }
}

export const approveRecoveryRequest = async (requestId: string, matchNumber: number, code?: string) => {
  const params = { path: { requestId } };
  const options = await apiClient.POST('/auth/recovery-requests/{requestId}/approve/options', { params });
  if (options.error || !options.data) throw new ApiProblem(options.response.status, options.error);
  const { method, challenge_id: challengeId, public_key: publicKey, approvable_from: approvableFrom } = options.data;
  if (approvableFrom) throw new ApprovalSessionTooNew(approvableFrom);
  const passkey = method === 'passkey' && challengeId && publicKey
    ? { challenge_id: challengeId, credential: await confirmWithPasskey(publicKey) } : undefined;
  const result = await apiClient.POST('/auth/recovery-requests/{requestId}/approve', {
    params, body: { match_number: matchNumber, ...(passkey ? { passkey } : {}), ...(code ? { code } : {}) },
  });
  if (result.error) throw new ApiProblem(result.response.status, result.error);
  return result;
};
