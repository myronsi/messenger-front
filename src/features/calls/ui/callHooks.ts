import { useEffect, useState } from 'react';
import { useGetGroupDetailsQuery } from '@/entities/chat';
import { useGetUserByIdQuery } from '@/entities/user';
import { useAccessToken } from '@/shared/auth/session';
import { DEFAULT_AVATAR, DEFAULT_GROUP_AVATAR } from '@/shared/base/ui';
import { resolveMediaUrl } from '@/shared/lib/resolveMediaUrl';
import { getTokenSession, getTokenSubject } from '@/shared/auth/tokenClaims';
import type { Translations } from '@/shared/contexts/LanguageContext';
import type { Call } from '../api/callsApi';
import { useStore } from '../model/createStore';
import { callsStore, sessionStore, type CallNotice } from '../model/stores';

export const useCallsState = () => useStore(callsStore);
export const useCallSession = () => useStore(sessionStore);

export const useAccount = () => {
  const token = useAccessToken();
  return { userId: getTokenSubject(token), sessionId: getTokenSession(token) };
};

export const useNow = (active = true, intervalMs = 1000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [active, intervalMs]);
  return now;
};

export const useUserName = (userId?: string | null) => {
  const { data } = useGetUserByIdQuery(userId ?? '', { skip: !userId });
  return data?.display_name || data?.username || '';
};

export const useGroupInfo = (call: Pick<Call, 'kind' | 'chat_id'> | null | undefined) => {
  const { data } = useGetGroupDetailsQuery(call?.chat_id ?? '', { skip: !call || call.kind !== 'group' });
  return { name: data?.name || '', role: data?.current_user_role ?? null };
};

export const peerOf = (call: Pick<Call, 'participants' | 'initiator_id'>, userId: string | null) => (
  call.participants.find((participant) => participant.user_id !== userId)?.user_id ?? call.initiator_id
);

export const useCallTitle = (call: Call | null | undefined, userId: string | null) => {
  const peerName = useUserName(call && call.kind === 'direct' ? peerOf(call, userId) : null);
  const callerName = useUserName(call?.initiator_id);
  const group = useGroupInfo(call);
  if (!call) return { title: '', caller: '' };
  return { title: call.kind === 'group' ? group.name || callerName : peerName, caller: callerName };
};

export const noticeText = (translations: Translations, notice: CallNotice) => ({
  'mic-denied': translations.callMicDenied,
  'mic-missing': translations.callMicMissing,
  'mic-in-use': translations.callMicInUse,
  'mic-failed': translations.callMicFailed,
  unsupported: translations.callUnsupported,
  full: translations.callFull,
  ended: translations.callEndedNotice,
  unavailable: translations.callUnavailable,
  'not-allowed': translations.callNotAllowed,
  failed: translations.callFailed,
  removed: translations.callRemoved,
  moved: translations.callMovedAway,
  'rate-limited': translations.callRateLimited,
})[notice];

export const useCallAvatar = (call: Call | null | undefined, userId: string | null) => {
  const peerId = call && call.kind === 'direct' ? peerOf(call, userId) : null;
  const { data: peer } = useGetUserByIdQuery(peerId ?? '', { skip: !peerId });
  const { data: group } = useGetGroupDetailsQuery(call?.chat_id ?? '', { skip: !call || call.kind !== 'group' });
  return call?.kind === 'group' ? resolveMediaUrl(group?.avatar_url, DEFAULT_GROUP_AVATAR) : resolveMediaUrl(peer?.avatar_url, DEFAULT_AVATAR);
};
