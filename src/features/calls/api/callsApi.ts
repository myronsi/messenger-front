import { apiClient } from '@/shared/api/client';
import type { components } from '@/shared/api/generated/schema';
import { ApiProblem } from '@/shared/api/problem';

type Schema = components['schemas'];
export type Call = Schema['Call'];
export type CallParticipant = Schema['CallParticipant'];
export type CallGrant = Schema['CallGrant'];
export type CallConfig = Schema['CallConfig'];
export type CallKeyEnvelope = Schema['CallKeyEnvelope'];
export type CallKeyEnvelopeList = Schema['CallKeyEnvelopeList'];
export type SendCallKeys = Schema['SendCallKeysRequest'];
export type CallJoin = Schema['CallJoin'];

type Result<T> = { data?: T; error?: unknown; response: Response };

const unwrap = <T>(result: Result<T>, message: string): T => {
  if (!result.response.ok) throw new ApiProblem(result.response.status, result.error, message);
  return result.data as T;
};

const call = (callId: string) => ({ params: { path: { call_id: callId } } });

export const callsApi = {
  config: async () => unwrap(await apiClient.GET('/calls/config'), 'Unable to load the call settings.'),
  setIdentity: async (publicKey: string) => {
    unwrap(await apiClient.PUT('/me/call-identity', { body: { public_key: publicKey } }), 'Unable to register the call identity.');
  },
  list: async () => unwrap(await apiClient.GET('/calls'), 'Unable to load calls.').items,
  chatCall: async (chatId: string) => {
    const result = await apiClient.GET('/chats/{chat_id}/call', { params: { path: { chat_id: chatId } } });
    if (result.response.status === 404) return null;
    return unwrap(result, 'Unable to load the call of this chat.');
  },
  start: async (chatId: string) => {
    const result = await apiClient.POST('/chats/{chat_id}/call', {
      params: { path: { chat_id: chatId } }, body: { client_request_id: crypto.randomUUID() },
    });
    return { call: unwrap(result, 'Unable to start the call.'), created: result.response.status === 201 };
  },
  get: async (callId: string) => unwrap(await apiClient.GET('/calls/{call_id}', call(callId)), 'Unable to load the call.'),
  join: async (callId: string, takeover = false) => unwrap(
    await apiClient.POST('/calls/{call_id}/join', { ...call(callId), body: { takeover } }), 'Unable to join the call.',
  ),
  grant: async (callId: string) => unwrap(await apiClient.POST('/calls/{call_id}/grant', call(callId)), 'Unable to renew the media grant.'),
  decline: async (callId: string) => { unwrap(await apiClient.POST('/calls/{call_id}/decline', call(callId)), 'Unable to decline the call.'); },
  leave: async (callId: string) => { unwrap(await apiClient.POST('/calls/{call_id}/leave', call(callId)), 'Unable to leave the call.'); },
  end: async (callId: string) => { unwrap(await apiClient.POST('/calls/{call_id}/end', call(callId)), 'Unable to end the call.'); },
  keys: async (callId: string) => unwrap(await apiClient.GET('/calls/{call_id}/keys', call(callId)), 'Unable to load call keys.'),
  sendKeys: async (callId: string, body: SendCallKeys) => {
    unwrap(await apiClient.POST('/calls/{call_id}/keys', { ...call(callId), body }), 'Unable to send call keys.');
  },
};

export type CallsApi = typeof callsApi;
