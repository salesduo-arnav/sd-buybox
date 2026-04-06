import { Request, Response, NextFunction } from 'express';

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user?.is_superuser) {
        return res.status(403).json({ status: 'error', message: 'Admin access required' });
    }
    next();
};
