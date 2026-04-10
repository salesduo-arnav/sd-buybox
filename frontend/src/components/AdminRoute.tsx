import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/auth";

/**
 * Route guard that restricts access to superusers.
 * Non-admin users are redirected to /overview.
 */
export default function AdminRoute() {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/overview" replace />;
  }

  return <Outlet />;
}
