import { apiClient } from '@/shared/api/client';
import type { components } from '@/shared/api/generated/schema';
import { userModel } from '@/shared/api/goModels';
import { contractData } from '@/shared/api/tasks';
import type { PrivacyExceptionKey, PrivacySettings } from '../model/types';

type Schema = components['schemas'];
const keys: PrivacyExceptionKey[] = [
  'avatar_visibility', 'profile_visibility', 'presence_visibility', 'last_seen_visibility', 'birthday_visibility', 'group_invites', 'direct_messages',
  'search_visibility', 'voice_video_messages', 'forward_link',
];
const visibility = (value: Schema['Visibility']) => value === 'contacts' ? 'shared_chats' as const : value;

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
    avatar_visibility: visibility(settings.avatar_visibility), profile_visibility: visibility(settings.profile_visibility),
    presence_visibility: visibility(settings.presence_visibility),
    last_seen_visibility: visibility(settings.last_seen_visibility ?? settings.presence_visibility),
    birthday_visibility: visibility(settings.birthday_visibility ?? 'contacts'),
    read_receipts_enabled: settings.read_receipts_enabled,
    calls_enabled: settings.calls_enabled ?? true, typing_indicators_enabled: settings.typing_indicators_enabled ?? true,
    direct_messages: settings.direct_messages, group_invites: settings.group_invites === 'contacts' ? 'shared_chats' : settings.group_invites,
    search_visibility: settings.search_visibility,
    voice_video_messages: settings.voice_video_messages === 'contacts' ? 'shared_chats' : 'everyone',
    forward_link: settings.forward_link === 'contacts' ? 'shared_chats' : settings.forward_link ?? 'everyone', privacy_exceptions: {
      avatar_visibility: exceptions('avatar_visibility'), profile_visibility: exceptions('profile_visibility'),
      presence_visibility: exceptions('presence_visibility'), last_seen_visibility: exceptions('last_seen_visibility'),
      birthday_visibility: exceptions('birthday_visibility'), group_invites: exceptions('group_invites'),
      direct_messages: exceptions('direct_messages'), search_visibility: exceptions('search_visibility'),
      voice_video_messages: exceptions('voice_video_messages'), forward_link: exceptions('forward_link'),
    },
  };
};

export const privacyPatch = (patch: Partial<PrivacySettings>): Schema['UpdatePrivacySettingsRequest'] => ({
  avatar_visibility: patch.avatar_visibility === 'shared_chats' ? 'contacts' : patch.avatar_visibility,
  profile_visibility: patch.profile_visibility === 'shared_chats' ? 'contacts' : patch.profile_visibility,
  presence_visibility: patch.presence_visibility === 'shared_chats' ? 'contacts' : patch.presence_visibility,
  last_seen_visibility: patch.last_seen_visibility === 'shared_chats' ? 'contacts' : patch.last_seen_visibility,
  birthday_visibility: patch.birthday_visibility === 'shared_chats' ? 'contacts' : patch.birthday_visibility,
  group_invites: patch.group_invites === 'shared_chats' ? 'contacts' : patch.group_invites,
  direct_messages: patch.direct_messages, search_visibility: patch.search_visibility,
  voice_video_messages: patch.voice_video_messages === 'shared_chats' ? 'contacts' : patch.voice_video_messages,
  forward_link: patch.forward_link === 'shared_chats' ? 'contacts' : patch.forward_link,
  read_receipts_enabled: patch.read_receipts_enabled, calls_enabled: patch.calls_enabled, typing_indicators_enabled: patch.typing_indicators_enabled,
});
