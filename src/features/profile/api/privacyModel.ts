import { apiClient } from '@/shared/api/client';
import type { components } from '@/shared/api/generated/schema';
import { userModel } from '@/shared/api/goModels';
import { contractData } from '@/shared/api/tasks';
import type { PrivacyExceptionKey, PrivacySettings } from '../model/types';

type Schema = components['schemas'];
const keys: PrivacyExceptionKey[] = [
  'avatar_visibility', 'profile_visibility', 'presence_visibility', 'last_seen_visibility', 'birthday_visibility', 'group_invites', 'direct_messages',
  'search_visibility', 'calls_from', 'voice_video_messages', 'forward_link',
];
const fromApi = <T extends string>(value: T) => {
  if (value === 'contacts') return 'shared_chats' as const;
  if (value === 'everyone_except') return 'everyone' as const;
  if (value === 'nobody_except') return 'nobody' as const;
  return value as Exclude<T, 'contacts' | 'everyone_except' | 'nobody_except'>;
};
const toApi = <T extends string>(value: T | undefined) => (value === 'shared_chats' ? 'contacts' as const : value as Exclude<T, 'shared_chats'> | undefined);

export const privacyModel = async (settings: Schema['PrivacySettings'], signal?: AbortSignal): Promise<PrivacySettings> => {
  const ids = new Set(keys.flatMap(key => [...(settings.exceptions[key]?.allow || []), ...(settings.exceptions[key]?.deny || [])]));
  const users = new Map(await Promise.all([...ids].map(async id => [id, userModel(contractData(await apiClient.GET('/users/{user_id}', {
    params: { path: { user_id: id } }, signal,
  })))] as const)));
  const exceptions = (key: PrivacyExceptionKey) => ({
    allow: (settings.exceptions[key]?.allow || []).map(id => users.get(id)!),
    deny: (settings.exceptions[key]?.deny || []).map(id => users.get(id)!),
  });
  return {
    avatar_visibility: fromApi(settings.avatar_visibility), profile_visibility: fromApi(settings.profile_visibility),
    presence_visibility: fromApi(settings.presence_visibility),
    last_seen_visibility: fromApi(settings.last_seen_visibility ?? settings.presence_visibility),
    birthday_visibility: fromApi(settings.birthday_visibility ?? 'contacts'),
    read_receipts_enabled: settings.read_receipts_enabled,
    calls_from: fromApi(settings.calls_from ?? (settings.calls_enabled === false ? 'nobody' : 'everyone')),
    typing_indicators_enabled: settings.typing_indicators_enabled ?? true,
    direct_messages: fromApi(settings.direct_messages), group_invites: fromApi(settings.group_invites),
    search_visibility: settings.search_visibility,
    voice_video_messages: settings.voice_video_messages === 'contacts' ? 'shared_chats' : 'everyone',
    forward_link: fromApi(settings.forward_link ?? 'everyone'), privacy_exceptions: {
      avatar_visibility: exceptions('avatar_visibility'), profile_visibility: exceptions('profile_visibility'),
      presence_visibility: exceptions('presence_visibility'), last_seen_visibility: exceptions('last_seen_visibility'),
      birthday_visibility: exceptions('birthday_visibility'), group_invites: exceptions('group_invites'),
      direct_messages: exceptions('direct_messages'), search_visibility: exceptions('search_visibility'), calls_from: exceptions('calls_from'),
      voice_video_messages: exceptions('voice_video_messages'), forward_link: exceptions('forward_link'),
    },
  };
};

export const privacyPatch = (patch: Partial<PrivacySettings>): Schema['UpdatePrivacySettingsRequest'] => ({
  avatar_visibility: toApi(patch.avatar_visibility), profile_visibility: toApi(patch.profile_visibility),
  presence_visibility: toApi(patch.presence_visibility), last_seen_visibility: toApi(patch.last_seen_visibility),
  birthday_visibility: toApi(patch.birthday_visibility), group_invites: toApi(patch.group_invites),
  direct_messages: toApi(patch.direct_messages), calls_from: toApi(patch.calls_from), search_visibility: patch.search_visibility,
  voice_video_messages: toApi(patch.voice_video_messages), forward_link: toApi(patch.forward_link),
  read_receipts_enabled: patch.read_receipts_enabled, typing_indicators_enabled: patch.typing_indicators_enabled,
});
