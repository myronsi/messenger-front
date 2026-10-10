import { describe, expect, it } from 'vitest';
import { compareIds, isNewerId, maxId, sameId } from './ids';

describe('compareIds', () => {
  it('orders decimal ids numerically, beyond the safe integer range', () => {
    const ids = ['9', '10', '7348123456789012345', '7348123456789012344', '100'];
    expect([...ids].sort(compareIds)).toEqual(['9', '10', '100', '7348123456789012344', '7348123456789012345']);
    expect(Number('7348123456789012345') === Number('7348123456789012344')).toBe(true);
    expect(compareIds('7348123456789012345', '7348123456789012344')).toBeGreaterThan(0);
  });

  it('ignores leading zeros and puts local placeholders first', () => {
    expect(compareIds('007', '7')).toBe(0);
    expect(compareIds('temp-1', '1')).toBeLessThan(0);
    expect(compareIds('temp-1', 'temp-2')).toBeLessThan(0);
  });
});

describe('helpers', () => {
  it('finds the newest id', () => {
    expect(maxId(['5', null, '12', undefined, '11'])).toBe('12');
    expect(maxId([])).toBeNull();
  });

  it('compares and checks sameness', () => {
    expect(isNewerId('12', '9')).toBe(true);
    expect(sameId('12', 12)).toBe(true);
    expect(sameId(null, null)).toBe(false);
  });
});
