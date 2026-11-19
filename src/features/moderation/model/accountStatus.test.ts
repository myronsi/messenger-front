import { describe, expect, it } from 'vitest';
import { en } from '@/shared/lang/en';
import { decidedByStaff, decisionReasonLabel, outcomeNotice, restrictionLabel, restrictionToast, showsBanner, statusLevel } from './accountStatus';

const t = en.moderation;

describe('account status helpers', () => {
  it.each([
    ['good', false], ['warned', true], ['limited', true], ['restricted', true], ['suspended', true], [undefined, false],
  ] as const)('shows the banner for %s: %s', (status, shown) => {
    expect(showsBanner(status)).toBe(shown);
  });

  it('treats an unknown status like restricted', () => {
    expect(statusLevel('frozen')).toBe('restricted');
    expect(statusLevel(null)).toBe('good');
  });

  it.each([
    ['send', 'Sending messages'], ['start_direct', 'Starting chats with people who are not your contacts'], ['create_group', 'Creating groups'],
    ['call', 'Calling people who are not your contacts'], ['edit_profile', 'Changing your name, username or picture'], ['upload', 'Uploading files'],
    ['publish_pack', 'Publishing sticker and emoji packs'], ['forward', 'Forwarding files'], ['invite_to_group', 'Adding people who are not your contacts to groups'],
    ['manage_group', 'Changing groups you manage'],
  ])('names the restriction %s in the shared toast', (restriction, label) => {
    expect(restrictionToast(restriction, t)).toEqual({ title: t.restrictedToastTitle, description: `${label} is blocked by your account status.` });
  });

  it('falls back to a generic action for unknown or missing restrictions', () => {
    expect(restrictionLabel('teleport', t)).toBe('This action');
    expect(restrictionLabel(null, t)).toBe('This action');
  });

  it('reads staff decisions and their rule', () => {
    const base = {
      status: 'warned' as const, since: null, restrictions: [], can_appeal: false, probation_until: null,
      review_requested_at: null, can_request_review: false,
    };
    expect(decidedByStaff({ ...base, decided_by: 'staff' })).toBe(true);
    expect(decidedByStaff({ ...base, decided_by: 'automatic' })).toBe(false);
    expect(decidedByStaff(base)).toBe(false);
    expect(decisionReasonLabel('illegal', t)).toBe('Illegal content');
    expect(decisionReasonLabel('teleport', t)).toBe('Other');
    expect(decisionReasonLabel(null, t)).toBe('Other');
  });

  it('words report outcomes without details', () => {
    expect(outcomeNotice({ subject_type: 'emoji_pack', outcome: 'no_violation' }, t)).toEqual({
      title: 'Your report about an emoji pack', description: 'We reviewed it and found no violation of our rules.',
    });
    expect(outcomeNotice({ subject_type: 'group' as 'user', outcome: 'escalated' as 'action_taken' }, t)).toEqual({
      title: 'Your report', description: 'We reviewed it.',
    });
  });
});
