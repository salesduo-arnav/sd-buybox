import { Request, Response } from 'express';
import { Product } from '../models';
import { parsePagination, paginateQuery, buildPaginatedResult } from '../utils/pagination';
import { handleError } from '../utils/handle_error';

/**
 * Product Controller
 *
 * GET  /api/products          — List products with visibility data
 * GET  /api/products/:id      — Product detail + snapshot history
 */
export const listProducts = async (req: Request, res: Response) => {
    try {
        const organizationId = req.user!.organization_id;
        const pagination = parsePagination(req.query);
        const { search, account_id } = req.query;

        const where: Record<string, unknown> = { organization_id: organizationId };
        if (account_id) where.integration_account_id = account_id;

        const { count, rows } = await Product.findAndCountAll({
            where,
            ...paginateQuery(pagination),
        });

        res.json(buildPaginatedResult(rows, count, pagination));
    } catch (error) {
        handleError(res, error, 'listProducts');
    }
};

export const getProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({ status: 'error', message: 'Product not found' });
        }

        // TODO: Include snapshot history, alerts, visibility data

        res.json({ status: 'success', data: product });
    } catch (error) {
        handleError(res, error, 'getProduct');
    }
};
