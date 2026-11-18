import { describe, expect, it, vi } from 'vitest';
import type { components } from '@/shared/api/generated/schema';
import { privacyModel, privacyPatch } from './privacyModel';

const getUser = vi.hoisted(() => vi.fn());
vi.mock('@/shared/api/client', () => ({ apiClient: { GET: getUser } }));

type Settings = components['schemas']['PrivacySettings'];
const empty = { allow: [], deny: [] };
const settings = (extra: Partial<Settings>): Settings => ({
  avatar_visibility: 'everyone', profile_visibility: 'everyone', presence_visibility: 'everyone', last_seen_visibility: 'everyone',
  birthday_visibility: 'contacts', read_receipts_enabled: true, direct_messages: 'everyone', group_invites: 'everyone',
  search_visibility: 'everyone', calls_enabled: true, typing_indicators_enabled: true, voice_video_messages: 'everyone', forward_link: 'everyone',
  exceptions: {},
  ...extra,
});

describe('voice/video and forward link privacy', () => {
  it('reads contacts as shared chats and keeps the other values', async () => {
    const model = await privacyModel(settings({ voice_video_messages: 'contacts', forward_link: 'contacts' }));
    expect(model.voice_video_messages).toBe('shared_chats');
    expect(model.forward_link).toBe('shared_chats');
    expect((await privacyModel(settings({ forward_link: 'nobody' }))).forward_link).toBe('nobody');
  });

  it('treats an older server without the settings as everyone', async () => {
    const { voice_video_messages: _voice, forward_link: _link, ...older } = settings({});
    const model = await privacyModel(older as Settings);
    expect(model.voice_video_messages).toBe('everyone');
    expect(model.forward_link).toBe('everyone');
    expect(model.privacy_exceptions.voice_video_messages).toEqual(empty);
  });

  it('loads the people on both exception lists', async () => {
    getUser.mockImplementation(async (_path: string, { params }: { params: { path: { user_id: string } } }) => ({
      data: { id: params.path.user_id, username: `user${params.path.user_id}`, display_name: 'U', avatar_url: null, is_deleted: false },
      response: new Response(null, { status: 200 }),
    }));
    const model = await privacyModel(settings({ exceptions: { voice_video_messages: { allow: ['4'], deny: [] }, forward_link: { allow: [], deny: ['5'] } } }));
    expect(model.privacy_exceptions.voice_video_messages.allow.map(user => user.username)).toEqual(['user4']);
    expect(model.privacy_exceptions.forward_link.deny.map(user => user.username)).toEqual(['user5']);
  });

  it('writes shared chats as contacts', () => {
    expect(privacyPatch({ voice_video_messages: 'shared_chats', forward_link: 'shared_chats' })).toMatchObject({
      voice_video_messages: 'contacts', forward_link: 'contacts',
    });
    expect(privacyPatch({ voice_video_messages: 'everyone', forward_link: 'nobody' })).toMatchObject({
      voice_video_messages: 'everyone', forward_link: 'nobody',
    });
    expect(privacyPatch({ read_receipts_enabled: false }).voice_video_messages).toBeUndefined();
  });
});
