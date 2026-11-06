import { describe, expect, it } from 'vitest';
import { recoveryKeyGroups } from './recoveryKeyGroups';

describe('recoveryKeyGroups', () => {
  it('splits a dashed key into its groups', () => {
    expect(recoveryKeyGroups('IPNQ-NIBS-N2NS-6RE2-QK2S-HIVE-OPQC-EHEA')).toEqual(['IPNQ', 'NIBS', 'N2NS', '6RE2', 'QK2S', 'HIVE', 'OPQC', 'EHEA']);
  });

  it('chunks a key without dashes into groups of four', () => {
    expect(recoveryKeyGroups(' ABCDEFGHIJ ')).toEqual(['ABCD', 'EFGH', 'IJ']);
  });
});
