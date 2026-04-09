import { Request } from 'express';
import type { CorePlatformUser } from '../types/corePlatform';

// Tiny typed accessors for req.auth fields.
export function getCurrentUser(request: Request): CorePlatformUser {
    return request.auth!.user;
}

export function getUserId(request: Request): string {
    return request.auth!.user.id;
}

export function getSessionId(request: Request): string {
    return request.auth!.sessionId;
}

export function getOrganizationId(request: Request): string {
    return request.auth!.organization!.id;
}
