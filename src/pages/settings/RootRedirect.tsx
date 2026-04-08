import { Navigate, useSearchParams } from 'react-router-dom'
import { ProcoreCallback } from './ProcoreCallback'

/**
 * Root "/" handler: if there's a ?code= param, treat it as
 * a Procore OAuth callback. Otherwise redirect to /dashboard.
 */
export function RootRedirect() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')

  if (code) {
    return <ProcoreCallback />
  }

  return <Navigate to="/dashboard" replace />
}
