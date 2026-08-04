import { describe, it, expect } from 'vitest';

import en from '@/i18n/en';
import fr from '@/i18n/fr';

const flatten = (obj: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null
      ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`]
  );

describe('i18n resources', () => {
  it('defines exactly the same keys in both locales', () => {
    const enKeys = flatten(en).sort();
    const frKeys = flatten(fr).sort();

    expect(enKeys.filter((k) => !frKeys.includes(k))).toEqual([]);
    expect(frKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it('has no empty values', () => {
    const empty = (obj: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) =>
        typeof v === 'object' && v !== null
          ? empty(v as Record<string, unknown>, `${prefix}${k}.`)
          : String(v).trim() === ''
            ? [`${prefix}${k}`]
            : []
      );

    expect(empty(fr)).toEqual([]);
    expect(empty(en)).toEqual([]);
  });
});
