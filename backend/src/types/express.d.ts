declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name: string;
                organization_id: string;
                is_superuser?: boolean;
                memberships?: Array<{
                    organization: { id: string; name: string; slug?: string };
                    role: { id: number; name: string; slug?: string };
                }>;
            };
        }
    }
}

export {};
