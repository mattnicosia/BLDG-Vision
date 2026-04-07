import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { SignIn } from '@/pages/auth/SignIn'
import { SignUp } from '@/pages/auth/SignUp'
import { OnboardingWizard } from '@/pages/onboarding/OnboardingWizard'
import { CRMIndex } from '@/pages/crm/CRMIndex'
import { ArchitectDetail } from '@/pages/crm/ArchitectDetail'
import { KBIndex } from '@/pages/kb/KBIndex'
import { AddProject } from '@/pages/kb/AddProject'
import { AddVECase } from '@/pages/kb/AddVECase'
import { IntelligenceIndex } from '@/pages/intelligence/IntelligenceIndex'
import { TerritoryIndex } from '@/pages/territory/TerritoryIndex'
import { CompetitorDetail } from '@/pages/competitors/CompetitorDetail'
import { SettingsIndex } from '@/pages/settings/SettingsIndex'
import { Toaster } from '@/components/ui/sonner'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/sign-up" element={<SignUp />} />

          {/* Protected: onboarding */}
          <Route element={<ProtectedRoute />}>
            <Route path="/onboarding" element={<OnboardingWizard />} />
          </Route>

          {/* Protected: app shell */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/crm" element={<CRMIndex />} />
              <Route path="/crm/:id" element={<ArchitectDetail />} />
              <Route path="/kb" element={<KBIndex />} />
              <Route path="/kb/projects/new" element={<AddProject />} />
              <Route path="/kb/ve/new" element={<AddVECase />} />
              <Route path="/intelligence" element={<IntelligenceIndex />} />
              <Route path="/territory" element={<TerritoryIndex />} />
              <Route path="/competitors/:id" element={<CompetitorDetail />} />
              <Route path="/settings" element={<SettingsIndex />} />

              {/* Redirects from old routes */}
              <Route path="/signals" element={<Navigate to="/intelligence" replace />} />
              <Route path="/permits" element={<Navigate to="/intelligence" replace />} />
              <Route path="/competitors" element={<Navigate to="/intelligence" replace />} />
              <Route path="/radar" element={<Navigate to="/territory" replace />} />
              <Route path="/map" element={<Navigate to="/territory" replace />} />
            </Route>
          </Route>

          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/crm" replace />} />
          <Route path="*" element={<Navigate to="/crm" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
