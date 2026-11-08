import { describe, expect, it } from 'vitest';
import { passwordChecks, registerErrorsFromProblem, validateRegisterField, validateRegisterValues } from './registerForm';
import { samples } from '@/test/samples';

const checkRules = (value: string) => validateRegisterField('password', value);

describe('validateRegisterField', () => {
  it('checks usernames like the backend does', () => {
    expect(validateRegisterField('username', 'al')).toBe('usernameShort');
    expect(validateRegisterField('username', 'al ex')).toBe('usernameChars');
    expect(validateRegisterField('username', 'a'.repeat(33))).toBe('usernameChars');
    expect(validateRegisterField('username', ' Alex_M ')).toBeUndefined();
  });

  it('checks the display name after collapsing spaces', () => {
    expect(validateRegisterField('displayName', '  A   B ')).toBeUndefined();
    expect(validateRegisterField('displayName', '  Al  ')).toBe('displayNameLength');
    expect(validateRegisterField('displayName', 'Alex Miller')).toBeUndefined();
    expect(validateRegisterField('displayName', 'x'.repeat(51))).toBe('displayNameLength');
  });

  it('counts password characters, not bytes', () => {
    expect(checkRules(samples.tooShort)).toBe('passwordLength');
    expect(checkRules(samples.strongCyrillic)).toBeUndefined();
    expect(checkRules('x'.repeat(129))).toBe('passwordLength');
  });
});

describe('password rules', () => {
  it('needs a lowercase and uppercase letter, a number and a special character', () => {
    expect(checkRules(samples.lowerOnlyLong)).toBe('passwordWeak');
    expect(checkRules(samples.noDigits)).toBe('passwordWeak');
    expect(checkRules(samples.noSpecial)).toBe('passwordWeak');
    expect(checkRules(samples.noLower)).toBe('passwordWeak');
    expect(checkRules(samples.strong)).toBeUndefined();
  });

  it('reports each rule separately', () => {
    expect(passwordChecks(samples.tiny)).toEqual({ length: false, lower: true, upper: false, digit: false, special: false });
    expect(passwordChecks(samples.allRulesWithSpace)).toEqual({ length: true, lower: true, upper: true, digit: true, special: true });
  });
});

describe('validateRegisterValues', () => {
  it('returns one error per invalid field', () => {
    const validName = ['ok', 'name'].join('_');
    const shortName = 'a';
    expect(validateRegisterValues({ username: validName, password: '' })).toEqual({ password: 'passwordLength' });
    const errors = validateRegisterValues({ username: shortName, password: samples.strong });
    expect(errors).toEqual({ username: 'usernameShort' });
  });
});

describe('registerErrorsFromProblem', () => {
  it('maps a conflict to a taken username', () => {
    expect(registerErrorsFromProblem(409, { code: 'already_exists' })).toEqual({ username: 'usernameTaken' });
  });

  it('maps validation errors to their fields', () => {
    const body = { code: 'validation_failed', errors: [{ field: 'display_name', message: 'x' }, { field: 'password', message: 'y' }, { field: 'bio' }] };
    expect(registerErrorsFromProblem(422, body)).toEqual({ displayName: 'displayNameLength', password: 'passwordLength' });
  });

  it('ignores other answers', () => {
    expect(registerErrorsFromProblem(500, { errors: [{ field: 'username' }] })).toEqual({});
    expect(registerErrorsFromProblem(422, null)).toEqual({});
  });
});
