import { describe, expect, it } from 'vitest';
import { getRecordLabelName, slugifyRecordLabelName } from './recordLabels';

describe('recordLabels utils', () => {
  it('slugifies a label name consistently', () => {
    expect(slugifyRecordLabelName("  Warp Records  ")).toBe('warp-records');
    expect(slugifyRecordLabelName("D'Angelo Label")).toBe('dangelo-label');
  });

  it('reads label name from linked field object', () => {
    const recordLabelField = { fields: { name: 'Ninja Tune' } };
    expect(getRecordLabelName(recordLabelField)).toBe('Ninja Tune');
  });
});
