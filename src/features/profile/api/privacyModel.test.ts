import { describe, expect, it } from 'vitest';
import type { components } from '@/shared/api/generated/schema';
import { privacyModel, privacyPatch } from './privacyModel';

type Settings = components['schemas']['PrivacySettings'];

const settings = (overrides: Partial<Settings> = {}): Settings => ({
  avatar_visibility: 'everyone', profile_visibility: 'everyone', presence_visibility: 'everyone', last_seen_visibility: 'everyone',
  birthday_visibility: 'contacts', read_receipts_enabled: true, direct_messages: 'everyone', group_invites: 'contacts',
  search_visibility: 'everyone', calls_enabled: true, calls_from: 'everyone', typing_indicators_enabled: true, exceptions: {},
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
