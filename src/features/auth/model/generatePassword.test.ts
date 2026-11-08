import { describe, expect, it } from 'vitest';
import { generatePassword } from './generatePassword';
import { validateRegisterField } from './registerForm';

describe('generatePassword', () => {
  it('creates four groups of five readable characters', () => {
    const password = generatePassword();
    expect(password).toMatch(/^[a-km-zA-HJ-NP-Z2-9]{5}(-[a-km-zA-HJ-NP-Z2-9]{5}){3}$/);
    expect(validateRegisterField('password', password)).toBeUndefined();
  });

  it('always mixes lower case, upper case and digits', () => {
    for (let run = 0; run < 50; run += 1) {
      const password = generatePassword();
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[2-9]/);
    }
  });

  it('gives a different password each time', () => {
    const passwords = new Set(Array.from({ length: 20 }, () => generatePassword()));
    expect(passwords.size).toBe(20);
  });

  it('skips random values that would bias the result', () => {
    const values = [0xffff_ffff, 0, 24, 48];
    let call = 0;
    const random = (buffer: Uint32Array) => {
      buffer[0] = values[call % values.length];
      call += 1;
      return buffer;
    };
    const generated = generatePassword(random);
    expect(generated.slice(0, 5)).toBe(['a', 'A', '2', 'a', 'A'].join(''));
  });
});
