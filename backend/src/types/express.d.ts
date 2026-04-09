import type { CorePlatformUser, Organization, Role } from './corePlatform';

// Strict request augmentation.
//
// `req.auth` is populated by the middleware chain in this order:
//   1. authenticate         -> sets { user, sessionId }
//   2. resolveOrganization  -> adds { organization, role }
//
// A route that mounts `authenticate` can assume `req.auth.user` exists.
// A route that also mounts `resolveOrganization` can additionally assume
// `req.auth.organization` and `req.auth.role` exist. Use the helpers in
// utils/request_auth.ts inside handlers instead of non-null assertions.

declare global {
    namespace Express {
        interface Request {
            auth?: {
                user: CorePlatformUser;
                sessionId: string;
                organization?: Organization;
                role?: Role;
            };
        }
    }
}

export {};
