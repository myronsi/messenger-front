import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { de } from '@/shared/lang/de';
import { ru } from '@/shared/lang/ru';
import { es } from '@/shared/lang/es';
import type { EntityId } from '@/shared/api/entityId';
import { systemEventText } from './systemEvents';
import type { SystemEventInfo } from './types';

const me = (id?: EntityId | null) => id === '1';
const event = (overrides: Partial<SystemEventInfo>): SystemEventInfo => ({ kind: 'group_renamed', actor_id: '2', actor_name: 'Anna', ...overrides });

describe('group system lines', () => {
  it('names the old and the new group name', () => {
    const renamed = event({ old_name: 'Team', new_name: 'Crew' });
    expect(systemEventText(renamed, en, me)).toBe('Anna renamed the group from “Team” to “Crew”');
    expect(systemEventText({ ...renamed, actor_id: '1' }, en, me)).toBe('You renamed the group from “Team” to “Crew”');
    expect(systemEventText(renamed, de, me)).toBe('Anna hat die Gruppe von „Team“ in „Crew“ umbenannt');
    expect(systemEventText(renamed, ru, me)).toBe('Anna переименовал(а) группу из «Team» в «Crew»');
  });

  it('tells a changed photo from a removed one', () => {
    expect(systemEventText(event({ kind: 'group_avatar_changed' }), en, me)).toBe('Anna changed the group photo');
    expect(systemEventText(event({ kind: 'group_avatar_changed', avatar_removed: true }), en, me)).toBe('Anna removed the group photo');
    expect(systemEventText(event({ kind: 'group_avatar_changed', avatar_removed: true, actor_id: '1' }), es, me)).toBe('Quitaste la foto del grupo');
  });

  it('names the new owner from every point of view', () => {
    const transfer = event({ kind: 'owner_transferred', target_id: '3', target_name: 'Ben' });
    expect(systemEventText(transfer, en, me)).toBe('Anna made Ben the owner');
    expect(systemEventText({ ...transfer, actor_id: '1' }, en, me)).toBe('You made Ben the owner');
    expect(systemEventText({ ...transfer, target_id: '1' }, en, me)).toBe('Anna made you the owner');
  });

  it('falls back when the people are gone', () => {
    expect(systemEventText(event({ kind: 'owner_transferred', actor_id: null, actor_name: '' }), en, me)).toBe('Someone made Someone the owner');
  });

  it('names pinned polls, contacts and places by their kind', () => {
    const pinned = (type: SystemEventInfo['message_type']) => event({ kind: 'message_pinned', snippet: '', message_type: type });
    expect(systemEventText(pinned('poll'), en, me)).toBe('Anna pinned a poll');
    expect(systemEventText(pinned('contact'), en, me)).toBe('Anna pinned a contact');
    expect(systemEventText(pinned('location'), de, me)).toBe('Anna hat einen Standort angeheftet');
  });
});
