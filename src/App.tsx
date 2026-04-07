import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { SignIn } from '@/pages/auth/SignIn'
import { SignUp } from '@/pages/auth/SignUp'
import { OnboardingWizard } from '@/pages/onboarding/OnboardingWizard'
import { PipelineIndex } from '@/pages/pipeline/PipelineIndex'
import { CRMIndex } from '@/pages/crm/CRMIndex'
import { ArchitectDetail } from '@/pages/crm/ArchitectDetail'
import { KBIndex } from '@/pages/kb/KBIndex'
import { AddProject } from '@/pages/kb/AddProject'
import { AddVECase } from '@/pages/kb/AddVECase'
import { IntelligenceIndex } from '@/pages/intelligence/IntelligenceIndex'
import { MapIndex } from '@/pages/map/MapIndex'
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
              <Route path="/pipeline" element={<PipelineIndex />} />
              <Route path="/crm" element={<CRMIndex />} />
              <Route path="/crm/:id" element={<ArchitectDetail />} />
              <Route path="/map" element={<MapIndex />} />
              <Route path="/intelligence" element={<IntelligenceIndex />} />
              <Route path="/kb" element={<KBIndex />} />
              <Route path="/kb/projects/new" element={<AddProject />} />
              <Route path="/kb/ve/new" element={<AddVECase />} />
              <Route path="/competitors/:id" element={<CompetitorDetail />} />
              <Route path="/settings" element={<SettingsIndex />} />

              {/* Redirects from old routes */}
              <Route path="/signals" element={<Navigate to="/intelligence" replace />} />
              <Route path="/permits" element={<Navigate to="/intelligence" replace />} />
              <Route path="/competitors" element={<Navigate to="/intelligence" replace />} />
              <Route path="/radar" element={<Navigate to="/intelligence" replace />} />
              <Route path="/territory" element={<Navigate to="/intelligence" replace />} />
            </Route>
          </Route>

          {/* Root redirect -> Pipeline */}
          <Route path="/" element={<Navigate to="/pipeline" replace />} />
          <Route path="*" element={<Navigate to="/pipeline" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
