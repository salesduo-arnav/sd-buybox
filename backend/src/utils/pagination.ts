import { FindAndCountOptions } from 'sequelize';

export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
    status: 'success';
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
    };
}

export function parsePagination(query: Record<string, any>): PaginationParams {
    return {
        page: Math.max(1, parseInt(query.page) || 1),
        limit: Math.min(100, Math.max(1, parseInt(query.limit) || 20)),
        sortBy: query.sortBy || 'created_at',
        sortOrder: query.sortOrder === 'ASC' ? 'ASC' : 'DESC',
    };
}

export function paginateQuery(params: PaginationParams): Pick<FindAndCountOptions, 'limit' | 'offset' | 'order'> {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'DESC' } = params;
    return {
        limit,
        offset: (page - 1) * limit,
        order: [[sortBy, sortOrder]],
    };
}

export function buildPaginatedResult<T>(data: T[], total: number, params: PaginationParams): PaginatedResult<T> {
    const { page = 1, limit = 20 } = params;
    const totalPages = Math.ceil(total / limit);
    return {
        status: 'success',
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasMore: page < totalPages,
        },
    };
}
