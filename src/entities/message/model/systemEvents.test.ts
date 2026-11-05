import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import type { EntityId } from '@/shared/api/entityId';
import { systemEventText } from './systemEvents';

const translations = en;
const me = (id?: EntityId | null) => id === '1';

describe('systemEventText', () => {
  it('names the actor and the target', () => {
    expect(systemEventText({ kind: 'member_added', actor_id: '2', actor_name: 'Anna', target_id: '3', target_name: 'Max' }, translations, me)).toBe('Anna added Max');
    expect(systemEventText({ kind: 'member_left', actor_id: '3', actor_name: 'Max' }, translations, me)).toBe('Max left the group');
  });

  it('says you for the current user', () => {
    expect(systemEventText({ kind: 'member_added', actor_id: '1', actor_name: 'Me', target_id: '3', target_name: 'Max' }, translations, me)).toBe('You added Max');
    expect(systemEventText({ kind: 'member_added', actor_id: '2', actor_name: 'Anna', target_id: '1', target_name: 'Me' }, translations, me)).toBe('Anna added you');
    expect(systemEventText({ kind: 'group_created', actor_id: '1', actor_name: 'Me' }, translations, me)).toBe('You created the group');
  });

  it('falls back when the account is gone', () => {
    expect(systemEventText({ kind: 'member_joined', actor_id: null, actor_name: '' }, translations, me)).toBe('Someone joined the group');
  });
});
