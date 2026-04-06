// Shared TypeScript interfaces

export interface IntegrationCredentials {
    refresh_token: string;
    client_id: string;
    client_secret: string;
    marketplace_id: string;
    seller_id: string;
    region: string;
}

export interface CorePlatformUser {
    id: string;
    email: string;
    full_name: string;
    is_superuser?: boolean;
    memberships: Array<{
        organization: { id: string; name: string; slug?: string };
        role: { id: number; name: string; slug?: string };
    }>;
}
