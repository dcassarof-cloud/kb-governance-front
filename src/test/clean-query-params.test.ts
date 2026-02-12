import { describe, expect, it } from 'vitest';

import { cleanQueryParams } from '@/lib/clean-query-params';

describe('cleanQueryParams', () => {
  it('remove strings vazias e nulas', () => {
    const result = cleanQueryParams({
      q: '   ',
      systemCode: '',
      responsibleId: null,
      status: undefined,
      page: 1,
    });

    expect(result).toEqual({ page: 1 });
  });

  it('mantém booleans somente quando true', () => {
    const result = cleanQueryParams({ overdue: true, unassigned: false });
    expect(result).toEqual({ overdue: true });
  });

  it('trim em strings válidas', () => {
    const result = cleanQueryParams({ q: '  abc  ', status: ' OPEN ' });
    expect(result).toEqual({ q: 'abc', status: 'OPEN' });
  });
});
