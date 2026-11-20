import { describe, expect, it, vi } from 'vitest';
import type { components } from '@/shared/api/generated/schema';
import { privacyModel, privacyPatch } from './privacyModel';

const getUser = vi.hoisted(() => vi.fn());
vi.mock('@/shared/api/client', () => ({ apiClient: { GET: getUser } }));

type Settings = components['schemas']['PrivacySettings'];
const empty = { allow: [], deny: [] };

const settings = (overrides: Partial<Settings> = {}): Settings => ({
  avatar_visibility: 'everyone', profile_visibility: 'everyone', presence_visibility: 'everyone', last_seen_visibility: 'everyone',
  birthday_visibility: 'contacts', read_receipts_enabled: true, direct_messages: 'everyone', group_invites: 'contacts',
  search_visibility: 'everyone', web_profile_visibility: 'everyone', calls_enabled: true, calls_from: 'everyone', typing_indicators_enabled: true,
  voice_video_messages: 'everyone', forward_link: 'everyone', exceptions: {},
  ...overrides,
});

describe('privacyModel', () => {
  it('reads contacts as shared chats and the old except values as plain ones', async () => {
    const model = await privacyModel(settings({
      avatar_visibility: 'everyone_except', profile_visibility: 'nobody_except', group_invites: 'nobody_except',
      direct_messages: 'contacts', calls_from: 'contacts',
    }));
    expect(model.avatar_visibility).toBe('everyone');
    expect(model.profile_visibility).toBe('nobody');
    expect(model.group_invites).toBe('nobody');
    expect(model.direct_messages).toBe('shared_chats');
    expect(model.calls_from).toBe('shared_chats');
    expect(model.birthday_visibility).toBe('shared_chats');
  });

  it('keeps direct messages from nobody and the old shared_chats name', async () => {
    expect((await privacyModel(settings({ direct_messages: 'nobody' }))).direct_messages).toBe('nobody');
    expect((await privacyModel(settings({ direct_messages: 'shared_chats' }))).direct_messages).toBe('shared_chats');
  });

  it('falls back to calls_enabled from a server without calls_from', async () => {
    const old = settings({ calls_enabled: false }) as Partial<Settings>;
    delete old.calls_from;
    expect((await privacyModel(old as Settings)).calls_from).toBe('nobody');
  });

  it('writes shared chats as contacts and sends calls_from instead of calls_enabled', () => {
    expect(privacyPatch({ direct_messages: 'shared_chats', calls_from: 'shared_chats', group_invites: 'nobody' })).toEqual({
      direct_messages: 'contacts', calls_from: 'contacts', group_invites: 'nobody',
    });
    expect(JSON.parse(JSON.stringify(privacyPatch({ calls_from: 'nobody' })))).toEqual({ calls_from: 'nobody' });
  });
});

describe('voice/video and forward link privacy', () => {
  it('reads contacts as shared chats and keeps the other values', async () => {
    const model = await privacyModel(settings({ voice_video_messages: 'contacts', forward_link: 'contacts' }));
    expect(model.voice_video_messages).toBe('shared_chats');
    expect(model.forward_link).toBe('shared_chats');
    expect((await privacyModel(settings({ forward_link: 'nobody' }))).forward_link).toBe('nobody');
  });

  it('treats an older server without the settings as everyone', async () => {
    const { voice_video_messages: _voice, forward_link: _link, ...older } = settings();
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

describe('web profile visibility', () => {
  it('reads the setting, defaults to everyone and sends a change', async () => {
    expect((await privacyModel(settings({ web_profile_visibility: 'nobody' }))).web_profile_visibility).toBe('nobody');
    expect((await privacyModel({ ...settings(), web_profile_visibility: undefined as unknown as 'everyone' })).web_profile_visibility).toBe('everyone');
    expect(privacyPatch({ web_profile_visibility: 'nobody' })).toMatchObject({ web_profile_visibility: 'nobody' });
  });
});
