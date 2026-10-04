import { describe, expect, it } from 'vitest';
import type { GroupRole } from './GroupProfileTypes';
import type { GroupTranslations } from './groupChatTypes';
import { roleLabel, roleTone } from './groupProfileHelpers';
import { permissionsForRole } from './groupChatUtils';

const translations = { owner: 'Owner', admin: 'Admin', moderator: 'Moderator', member: 'Member' } as unknown as GroupTranslations;

// A MINOR contract update may add a role; unknown values must degrade to the least privileged one.
describe('unknown group role', () => {
  const unknownRole = 'auditor' as GroupRole;

  it('is shown as a regular member', () => {
    expect(roleLabel(unknownRole, translations)).toBe('Member');
    expect(roleTone(unknownRole)).toBe(roleTone('member'));
  });

  it('gets no permissions', () => {
    expect(Object.values(permissionsForRole(unknownRole)).every((allowed) => allowed === false)).toBe(true);
  });
});