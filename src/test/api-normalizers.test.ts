import { describe, it, expect } from 'vitest';
import { normalizePaginatedResponse } from '@/lib/api-normalizers';

describe('normalizePaginatedResponse', () => {
  it('normaliza array direto', () => {
    const response = normalizePaginatedResponse([{ id: 1 }, { id: 2 }], 1, 10);
    expect(response).toEqual({
      data: [{ id: 1 }, { id: 2 }],
      total: 2,
      page: 1,
      size: 10,
      totalPages: 1,
    });
  });

  it('normaliza payload backend com items', () => {
    const response = normalizePaginatedResponse(
      { items: ['a', 'b'], totalElements: 4, page: 2, size: 2, totalPages: 2 },
      1,
      10
    );
    expect(response).toEqual({
      data: ['a', 'b'],
      total: 4,
      page: 2,
      size: 2,
      totalPages: 2,
    });
  });

  it('normaliza payload com content e pageNumber', () => {
    const response = normalizePaginatedResponse(
      { content: [1, 2, 3], totalItems: 9, pageNumber: 3, pageSize: 3, pages: 3 },
      1,
      5
    );
    expect(response).toEqual({
      data: [1, 2, 3],
      total: 9,
      page: 3,
      size: 3,
      totalPages: 3,
    });
  });
});
