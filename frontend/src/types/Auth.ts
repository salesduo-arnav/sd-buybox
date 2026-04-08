/**
 * Auth types — shapes returned by sd-core-platform's `/auth/me`, proxied
 * through buybox's `/api/auth/me`.
 *
 * This is the single source of truth for the frontend. `AuthContext`,
 * components, and services should all import from this file rather than
 * redefining the `User` / `Membership` interfaces inline.
 */

export interface Organization {
  id: string;
  name: string;
  slug?: string;
  status?: string;
}

export interface Role {
  id: number;
  name: string;
  slug?: string;
  description?: string;
}

export interface Membership {
  organization: Organization;
  role: Role;
}

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  is_superuser?: boolean;
  has_password?: boolean;
  memberships: Membership[];
}
