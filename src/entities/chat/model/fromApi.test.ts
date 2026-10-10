import { describe, expect, it } from 'vitest';
import type { Schema } from '@/shared/api/contract';
import { toAppMessage, toChatLastMessage } from '@/entities/message/model/fromApi';
import { toApprovalRequest, toDirectChatItem, toGroupChatItem, toGroupDetails } from './fromApi';

const user = (id: string, username: string, extra: Partial<Schema<'User'>> = {}): Schema<'User'> => ({
  id, username, display_name: username.toUpperCase(), avatar_url: null, bio: null, is_online: false, last_seen: null, is_deleted: false, ...extra,
});

const message = (extra: Partial<Schema<'Message'>> = {}): Schema<'Message'> => ({
  id: '7348123456789012345', chat_id: '10', type: 'text', sender: user('2', 'bob'), content: 'hi', attachment: null,
  reply_to: null, forwarded_from: null, reactions: [{ emoji: '👍', user_id: '3' }], read_by: [{ user_id: '3', read_at: 't' }],
  created_at: '2026-10-10T10:00:00Z', edited_at: null, is_deleted: false, ...extra,
});

const chat = (extra: Partial<Schema<'Chat'>> = {}): Schema<'Chat'> => ({
  id: '10', type: 'direct', name: 'carol', avatar_url: null, peer: user('3', 'carol', { contact_name: 'Caro', is_online: true }),
  is_pinned: true, unread_count: 2, last_message: message(), created_at: 't', ...extra,
});

describe('chats', () => {
  it('maps a direct chat to the list item, with the peer and the last message', () => {
    expect(toDirectChatItem(chat())).toMatchObject({
      id: '10', interlocutor_id: '3', interlocutor_name: 'carol', interlocutor_display_name: 'Caro',
      interlocutor_is_online: true, is_pinned: true, unread_count: 2,
      last_message: { id: '7348123456789012345', sender_name: 'BOB', content: 'hi', type: 'message' },
    });
  });

  it('maps a group chat', () => {
    expect(toGroupChatItem(chat({ id: '20', type: 'group', name: 'Team', peer: null, my_role: 'admin', last_message: null })))
      .toMatchObject({ chat_id: '20', name: 'Team', my_role: 'admin', last_message: null });
  });

  it('maps group details, with an unknown role shown as member', () => {
    const details = toGroupDetails({
      id: '20', name: 'Team', description: null, avatar_url: null, owner_id: '2', my_role: 'owner', created_at: 't',
      members: [
        { user: user('2', 'bob'), role: 'owner', joined_at: 't' },
        { user: user('3', 'carol'), role: 'superuser' as Schema<'GroupRole'>, joined_at: 't' },
      ],
    });
    expect(details).toMatchObject({ chat_id: '20', owner_id: '2', owner_username: 'bob', current_user_role: 'owner', description: '' });
    expect(details.participants?.map((p) => [p.username, p.role, p.is_owner])).toEqual([['bob', 'owner', true], ['carol', 'member', false]]);
  });

  it('maps approval requests', () => {
    const request = toApprovalRequest({
      id: '5', type: 'group_invite', status: 'pending', requester: user('2', 'bob'), group_name: 'Team', preview: null, created_at: 't',
    });
    expect(request).toMatchObject({ id: '5', requester: { username: 'bob' }, group: { name: 'Team' } });
  });
});

describe('messages', () => {
  it('is a file only with an attachment, whatever the text looks like', () => {
    const text = toAppMessage(message({ content: '{"file_url":"/static/a.png"}' }), '2');
    expect(text).toMatchObject({ type: 'message', content: '{"file_url":"/static/a.png"}', is_own: true });
  });

  it('maps an attachment to file content, voice by kind, waveform to 0-1', () => {
    const voice = toAppMessage(message({
      type: 'voice', content: null,
      attachment: {
        id: 'a1', kind: 'voice', filename: 'voice.webm', content_type: 'audio/webm', size: 20,
        url: '/api/v2/attachments/a1/content', duration_ms: 2500, waveform: [0, 255],
      },
    }));
    expect(voice.type).toBe('file');
    expect(voice.content).toMatchObject({
      file_url: '/api/v2/attachments/a1/content', file_name: 'voice.webm', file_type: 'voice',
      audio_metadata: { duration: 2.5, waveform: [0, 1] },
    });
  });

  it('keeps ids as strings and maps reactions and read receipts', () => {
    const mapped = toAppMessage(message({ reply_to: '7348123456789012344' }), '3');
    expect(mapped).toMatchObject({ id: '7348123456789012345', reply_to: '7348123456789012344', is_own: false });
    expect(mapped.reactions).toEqual([{ user_id: '3', reaction: '👍' }]);
    expect(mapped.read_by).toEqual([{ user_id: '3', read_at: 't' }]);
    expect(toChatLastMessage(message()).sender_id).toBe('2');
  });
});
