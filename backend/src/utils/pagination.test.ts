import { parsePagination, paginateQuery, buildPaginatedResult } from './pagination';

describe('parsePagination', () => {
    it('returns sane defaults for an empty query', () => {
        expect(parsePagination({})).toEqual({
            page: 1,
            limit: 20,
            sortBy: 'created_at',
            sortOrder: 'DESC',
        });
    });

    it('clamps page to a minimum of 1', () => {
        expect(parsePagination({ page: '0' }).page).toBe(1);
        expect(parsePagination({ page: '-5' }).page).toBe(1);
    });

    it('clamps limit between 1 and 100', () => {
        expect(parsePagination({ limit: '0' }).limit).toBe(20); // 0 is falsy, falls back to default
        expect(parsePagination({ limit: '-5' }).limit).toBe(1);
        expect(parsePagination({ limit: '500' }).limit).toBe(100);
        expect(parsePagination({ limit: '50' }).limit).toBe(50);
    });

    it('falls back to created_at / DESC for invalid sort input', () => {
        const parsed = parsePagination({ sortBy: 42, sortOrder: 'sideways' });
        expect(parsed.sortBy).toBe('created_at');
        expect(parsed.sortOrder).toBe('DESC');
    });

    it('honors a valid ASC sortOrder', () => {
        expect(parsePagination({ sortOrder: 'ASC' }).sortOrder).toBe('ASC');
    });
});

describe('paginateQuery', () => {
    it('calculates offset from page and limit', () => {
        expect(paginateQuery({ page: 1, limit: 20 })).toEqual({
            limit: 20,
            offset: 0,
            order: [['created_at', 'DESC']],
        });
        expect(paginateQuery({ page: 3, limit: 20 })).toEqual({
            limit: 20,
            offset: 40,
            order: [['created_at', 'DESC']],
        });
    });

    it('respects custom sortBy / sortOrder', () => {
        const query = paginateQuery({ page: 1, limit: 10, sortBy: 'name', sortOrder: 'ASC' });
        expect(query.order).toEqual([['name', 'ASC']]);
    });
});

describe('buildPaginatedResult', () => {
    it('computes totalPages and hasMore correctly', () => {
        const result = buildPaginatedResult(['a', 'b'], 42, { page: 1, limit: 20 });
        expect(result).toEqual({
            status: 'success',
            data: ['a', 'b'],
            pagination: {
                page: 1,
                limit: 20,
                total: 42,
                totalPages: 3,
                hasMore: true,
            },
        });
    });

    it('marks hasMore=false on the last page', () => {
        const result = buildPaginatedResult([], 40, { page: 2, limit: 20 });
        expect(result.pagination.hasMore).toBe(false);
        expect(result.pagination.totalPages).toBe(2);
    });

    it('handles empty result sets', () => {
        const result = buildPaginatedResult([], 0, { page: 1, limit: 20 });
        expect(result.pagination).toEqual({
            page: 1,
            limit: 20,
            total: 0,
            totalPages: 0,
            hasMore: false,
        });
    });
});
