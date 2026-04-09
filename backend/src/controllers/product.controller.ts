import { Request, Response } from 'express';
import { Product } from '../models';
import { parsePagination, paginateQuery, buildPaginatedResult } from '../utils/pagination';
import { handleError, apiSuccess, apiError } from '../utils/handle_error';
import { getOrganizationId } from '../utils/request_auth';

// Product Controller
//
// GET /api/products      — List products with visibility data
// GET /api/products/:id  — Product detail + snapshot history

export const listProducts = async (req: Request, res: Response) => {
    try {
        const organizationId = getOrganizationId(req);
        const pagination = parsePagination(req.query);
        const { account_id: accountIdFilter } = req.query;

        const whereClause: Record<string, unknown> = { organization_id: organizationId };
        if (accountIdFilter) whereClause.integration_account_id = accountIdFilter;

        const { count, rows } = await Product.findAndCountAll({
            where: whereClause,
            ...paginateQuery(pagination),
        });

        res.json(buildPaginatedResult(rows, count, pagination));
    } catch (error) {
        handleError(res, error, 'listProducts');
    }
};

export const getProduct = async (req: Request, res: Response) => {
    try {
        const { id: productId } = req.params;
        const organizationId = getOrganizationId(req);

        const product = await Product.findOne({
            where: { id: productId, organization_id: organizationId },
        });

        if (!product) {
            return apiError(res, 404, 'NOT_FOUND', 'Product not found');
        }

        // TODO: Include snapshot history, alerts, visibility data
        return apiSuccess(res, product);
    } catch (error) {
        handleError(res, error, 'getProduct');
    }
};
