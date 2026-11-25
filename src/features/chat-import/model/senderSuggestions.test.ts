import { describe, expect, it } from 'vitest';
import { suggestAssignments } from './senderSuggestions';

const sender = (key: string, name = key) => ({ key, name, messageCount: 1 });
const me = { id: '1', username: 'anna', displayName: 'Anna Schmidt' };
const bob = { id: '2', username: 'bobk', displayName: 'Bob Kramer' };
const carla = { id: '3', username: 'carla', displayName: 'Carla' };

describe('suggestAssignments', () => {
  it('matches display names and usernames, ignoring case and spacing, and says me for the current user', () => {
    expect(suggestAssignments([sender('Anna Schmidt'), sender('BOBK')], [me, bob, carla], '1')).toEqual({ 'Anna Schmidt': 'me', BOBK: '2' });
  });

  it('matches a shortened name when only one member fits', () => {
    expect(suggestAssignments([sender('Bob K.')], [me, bob, carla], '1')).toEqual({ 'Bob K.': '2' });
  });

  it('leaves a name open when two members fit', () => {
    const bobby = { id: '4', username: 'bobby', displayName: 'Bob Kowalski' };
    expect(suggestAssignments([sender('Bob K.')], [me, bob, bobby], '1')).toEqual({});
  });

  it('gives every member to one name only', () => {
    expect(suggestAssignments([sender('a', 'Carla'), sender('b', 'carla')], [me, carla], '1')).toEqual({ a: '3' });
  });

  it('pairs the last name with the last member when the counts match', () => {
    expect(suggestAssignments([sender('Anna Schmidt'), sender('+49 151 000')], [me, bob], '1')).toEqual({ 'Anna Schmidt': 'me', '+49 151 000': '2' });
  });

  it('suggests nobody for names without any match', () => {
    expect(suggestAssignments([sender('Zoe'), sender('Max'), sender('Kim')], [me, bob], '1')).toEqual({});
  });
});
