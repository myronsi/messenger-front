import { apiClient } from '@/shared/api/client';
import { ApiProblem, problemCode, problemStatus } from '@/shared/api/problem';
import { confirmWithPasskey } from '@/shared/api/passkeys';

export class ApprovalSessionTooNew extends Error {
  constructor(readonly approvableFrom?: string) {
    super('This session is too new to approve account recovery.');
    this.name = 'ApprovalSessionTooNew';
  }
}

type PasskeyProof = { challenge_id: string; credential: Awaited<ReturnType<typeof confirmWithPasskey>> };

const keepsChallenge = (error: unknown) => problemCode(error) === 'two_factor_required';
const challengeGone = (error: unknown) => problemStatus(error) === 400 && problemCode(error) === 'invalid_request';

export const createRecoveryApproval = (requestId: string, matchNumber: number) => {
  const params = { path: { requestId } };
  let approvableFrom: string | undefined;
  let proof: PasskeyProof | undefined;

  const verify = async (): Promise<PasskeyProof | undefined> => {
    const options = await apiClient.POST('/auth/recovery-requests/{requestId}/approve/options', { params });
    if (options.error || !options.data) throw new ApiProblem(options.response.status, options.error);
    const { method, challenge_id: challengeId, public_key: publicKey, approvable_from: from } = options.data;
    approvableFrom = from ?? undefined;
    return method === 'passkey' && challengeId && publicKey ? { challenge_id: challengeId, credential: await confirmWithPasskey(publicKey) } : undefined;
  };

  const send = async (code?: string) => {
    const result = await apiClient.POST('/auth/recovery-requests/{requestId}/approve', {
      params, body: { match_number: matchNumber, ...(proof ? { passkey: proof } : {}), ...(code ? { code } : {}) },
    });
    if (result.error) throw new ApiProblem(result.response.status, result.error);
    return result;
  };

  return async (code?: string) => {
    const reused = Boolean(proof);
    proof ??= await verify();
    try {
      return await send(code);
    } catch (caught) {
      if (!keepsChallenge(caught)) proof = undefined;
      if (reused && challengeGone(caught)) {
        proof = await verify();
        return send(code);
      }
      if (problemCode(caught) === 'session_too_new') throw new ApprovalSessionTooNew(approvableFrom);
      throw caught;
    }
  };
};
