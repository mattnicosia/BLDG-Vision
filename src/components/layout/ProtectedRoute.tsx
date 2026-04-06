import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useOrg } from '@/hooks/useOrg'

export function ProtectedRoute() {
  const { user, loading: authLoading } = useAuth()
  const { org, loading: orgLoading } = useOrg()
  const location = useLocation()

  if (authLoading || orgLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />
  }

  // User is authenticated but has no org: send to onboarding
  // (unless they're already there)
  if (!org && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
