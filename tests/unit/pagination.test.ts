import { describe, it, expect } from 'vitest';
import { parsePagination, toPaginatedResponse } from '../../src/common/pagination';

describe('Pagination Helper (Unit)', () => {
  describe('parsePagination', () => {
    it('should return default page (1) and limit (20) when empty query is provided', () => {
      const result = parsePagination({});
      expect(result).toEqual({ page: 1, limit: 20, skip: 0 });
    });

    it('should correctly calculate skip offset for page 2', () => {
      const result = parsePagination({ page: '2', limit: '20' });
      expect(result).toEqual({ page: 2, limit: 20, skip: 20 });
    });

    it('should enforce default page = 1 for page < 1 or invalid numbers', () => {
      expect(parsePagination({ page: '0' }).page).toBe(1);
      expect(parsePagination({ page: '-5' }).page).toBe(1);
      expect(parsePagination({ page: 'invalid' }).page).toBe(1);
    });

    it('should cap limit at maximum threshold (100)', () => {
      const result = parsePagination({ limit: '500' });
      expect(result.limit).toBe(100);
    });

    it('should enforce default limit = 20 for invalid limits', () => {
      expect(parsePagination({ limit: '0' }).limit).toBe(20);
      expect(parsePagination({ limit: '-10' }).limit).toBe(20);
      expect(parsePagination({ limit: 'abc' }).limit).toBe(20);
    });
  });

  describe('toPaginatedResponse', () => {
    it('should format paginated data into mandated shape { data, total, page, limit }', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const response = toPaginatedResponse(items, 50, 2, 20);

      expect(response).toEqual({
        data: items,
        total: 50,
        page: 2,
        limit: 20,
      });
      expect(Object.keys(response)).toEqual(['data', 'total', 'page', 'limit']);
    });
  });
});
