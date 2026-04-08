import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/components/layout/AuthProvider'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { SignIn } from '@/pages/auth/SignIn'
import { SignUp } from '@/pages/auth/SignUp'
import { OnboardingWizard } from '@/pages/onboarding/OnboardingWizard'
import { DashboardIndex } from '@/pages/dashboard/DashboardIndex'
import { IntelligenceIndex } from '@/pages/intelligence/IntelligenceIndex'
import { PipelineIndex } from '@/pages/pipeline/PipelineIndex'
import { CRMIndex } from '@/pages/crm/CRMIndex'
import { RelationshipsIndex } from '@/pages/relationships/RelationshipsIndex'
import { ArchitectDetail } from '@/pages/crm/ArchitectDetail'
import { OutreachIndex } from '@/pages/outreach/OutreachIndex'
import { ReconIndex } from '@/pages/recon/ReconIndex'
import { KBIndex } from '@/pages/kb/KBIndex'
import { AddProject } from '@/pages/kb/AddProject'
import { AddVECase } from '@/pages/kb/AddVECase'
import { CompetitorDetail } from '@/pages/competitors/CompetitorDetail'
import { SettingsIndex } from '@/pages/settings/SettingsIndex'
import { ProcoreCallback } from '@/pages/settings/ProcoreCallback'
import { RootRedirect } from '@/pages/settings/RootRedirect'
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
              {/* Core workflow */}
              <Route path="/dashboard" element={<DashboardIndex />} />
              <Route path="/opportunities" element={<IntelligenceIndex />} />
              <Route path="/pipeline" element={<PipelineIndex />} />
              <Route path="/relationships" element={<RelationshipsIndex />} />
              <Route path="/relationships/:id" element={<ArchitectDetail />} />
              <Route path="/outreach" element={<OutreachIndex />} />
              <Route path="/recon" element={<ReconIndex />} />

              {/* Settings (includes company profile / playbook) */}
              <Route path="/settings" element={<SettingsIndex />} />
              <Route path="/settings/procore/callback" element={<ProcoreCallback />} />
              <Route path="/settings/projects/new" element={<AddProject />} />
              <Route path="/settings/ve/new" element={<AddVECase />} />

              {/* Legacy routes that still need to work */}
              <Route path="/crm" element={<Navigate to="/relationships" replace />} />
              <Route path="/crm/:id" element={<ArchitectDetail />} />
              <Route path="/competitors/:id" element={<CompetitorDetail />} />

              {/* KB routes redirect to settings */}
              <Route path="/kb" element={<Navigate to="/settings" replace />} />
              <Route path="/kb/projects/new" element={<AddProject />} />
              <Route path="/kb/ve/new" element={<AddVECase />} />

              {/* All other legacy redirects */}
              <Route path="/intelligence" element={<Navigate to="/opportunities" replace />} />
              <Route path="/map" element={<Navigate to="/recon" replace />} />
              <Route path="/signals" element={<Navigate to="/opportunities" replace />} />
              <Route path="/permits" element={<Navigate to="/opportunities" replace />} />
              <Route path="/competitors" element={<Navigate to="/opportunities" replace />} />
              <Route path="/radar" element={<Navigate to="/opportunities" replace />} />
              <Route path="/territory" element={<Navigate to="/recon" replace />} />
            </Route>
          </Route>

          {/* Root: Procore callback (if ?code=) or redirect to Dashboard */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<RootRedirect />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  )
}
