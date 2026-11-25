import { describe, expect, it } from 'vitest';
import { applyPollUpdate } from './pollUpdates';
import { draftPoll, isPollClosed, locationLinks, pollShowsResults, richCopyText, richFields, richSendBody, richSummary } from './richMessage';
import type { MessagePoll } from './types';

const poll = (extra: Partial<MessagePoll> = {}): MessagePoll => ({
  ...draftPoll({ question: 'Lunch?', options: ['Pizza', 'Soup'], multiple_answers: false, anonymous: true }), version: 1, ...extra,
});

describe('rich message drafts', () => {
  it('shows a poll at once and keeps what to send', () => {
    const send = { type: 'poll' as const, poll: { question: 'Lunch?', options: ['Pizza', 'Soup'], multiple_answers: true, anonymous: false } };
    expect(richFields(send).poll).toMatchObject({ question: 'Lunch?', options: [{ text: 'Pizza', voter_count: null }, { text: 'Soup', voter_count: null }] });
    expect(richFields(send).outgoing).toBe(send);
    expect(richSummary(send)).toBe('📊 Lunch?');
  });

  it('never sends the preview user of a contact', () => {
    const send = { type: 'contact' as const, contact: { user_id: '2' }, user: { id: '2', username: 'ann', display_name: 'Ann' } };
    expect(richSendBody(send)).toEqual({ type: 'contact', contact: { user_id: '2' } });
    expect(richSummary(send)).toBe('👤 @ann');
  });

  it('shows a sent place without a map until the server answers', () => {
    const send = { type: 'location' as const, location: { latitude: 48.1, longitude: 11.5 } };
    expect(richFields(send).location).toEqual({ latitude: 48.1, longitude: 11.5, accuracy_m: null, title: null, map: null });
    expect(richSummary(send)).toBe('📍');
  });
});

describe('location links', () => {
  it('opens the place in each map service only from plain links', () => {
    const links = locationLinks({ latitude: 48.137154, longitude: 11.576124, title: 'Marienplatz' });
    expect(links.openStreetMap).toBe('https://www.openstreetmap.org/?mlat=48.137154&mlon=11.576124#map=16/48.137154/11.576124');
    expect(links.googleMaps).toBe('https://www.google.com/maps/search/?api=1&query=48.137154,11.576124');
    expect(links.appleMaps).toBe('https://maps.apple.com/?ll=48.137154,11.576124&q=Marienplatz');
  });

  it('copies the question, the place link or the username', () => {
    expect(richCopyText({ poll: poll() })).toBe('Lunch?');
    expect(richCopyText({ location: { latitude: 1, longitude: 2, accuracy_m: null, title: 'Home', map: null } }))
      .toBe('Home\nhttps://www.openstreetmap.org/?mlat=1&mlon=2#map=16/1/2');
    expect(richCopyText({ contact: { user_id: '2', user: { id: '2', username: 'ann', display_name: 'Ann' } } })).toBe('@ann');
    expect(richCopyText({ contact: { user_id: '2', user: null } })).toBeNull();
  });
});

describe('poll state', () => {
  it('is closed once closed_at is set or close_at has passed', () => {
    const now = Date.parse('2026-11-25T12:00:00Z');
    expect(isPollClosed(poll(), now)).toBe(false);
    expect(isPollClosed(poll({ closed_at: '2026-11-25T11:00:00Z' }), now)).toBe(true);
    expect(isPollClosed(poll({ close_at: '2026-11-25T11:59:59Z' }), now)).toBe(true);
    expect(isPollClosed(poll({ close_at: '2026-11-25T12:00:01Z' }), now)).toBe(false);
  });

  it('shows results only when the server sends counts', () => {
    expect(pollShowsResults(poll())).toBe(false);
    expect(pollShowsResults(poll({ total_voters: 0, options: [{ text: 'Pizza', voter_count: 0 }] }))).toBe(true);
  });

  it('keeps the poll with the highest version', () => {
    const messages = [{ id: '30', poll: poll({ version: 3 }) }, { id: '31' }];
    expect(applyPollUpdate(messages, '30', poll({ version: 2, total_voters: 9 }))).toBe(messages);
    const updated = applyPollUpdate(messages, '30', poll({ version: 4, total_voters: 1 }));
    expect(updated[0].poll?.total_voters).toBe(1);
    expect(updated[1]).toBe(messages[1]);
    expect(applyPollUpdate(messages, '31', poll({ version: 9 }))).toBe(messages);
  });
});
