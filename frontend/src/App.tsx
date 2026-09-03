import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { CapacitorDeepLinkHandler } from './components/CapacitorDeepLinkHandler'
import { StudentPushHandler } from './components/StudentPushHandler'
import { AuthProvider } from './contexts/AuthContext'
import { AcademyProvider } from './contexts/AcademyContext'
import { AuthLayout } from './layouts/AuthLayout'
import { DashboardLayout } from './layouts/DashboardLayout'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { RoleRoute } from './routes/RoleRoute'
import { LoginPage } from './features/auth/LoginPage'
import { ForgotPasswordPage } from './features/auth/ForgotPasswordPage'
import { ChangePasswordPage } from './features/auth/ChangePasswordPage'
import { VerifyEmailPage } from './features/auth/VerifyEmailPage'
import { PlatformDashboardPage } from './features/platform/PlatformDashboardPage'
import { PlatformTeamPage } from './features/platform/PlatformTeamPage'
import { BranchesPage } from './features/academy/BranchesPage'
import { PlatformStaffInvitePage } from './features/invite/PlatformStaffInvitePage'
import { AcademiesListPage } from './features/platform/AcademiesListPage'
import { NewAcademyPage } from './features/platform/NewAcademyPage'
import { FeatureFlagsPage } from './features/platform/FeatureFlagsPage'
import { PlatformFinancePage } from './features/platform/PlatformFinancePage'
import { PlatformSettingsPage } from './features/platform/PlatformSettingsPage'
import { PlatformAuditPage } from './features/platform/PlatformAuditPage'
import { MfaSettingsPage } from './features/platform/MfaSettingsPage'
import { AcademyDashboardPage } from './features/academy/AcademyDashboardPage'
import { StudentsListPage } from './features/academy/StudentsListPage'
import { NewStudentPage } from './features/academy/NewStudentPage'
import { StudentDetailPage } from './features/academy/StudentDetailPage'
import { ProfessorsPage } from './features/academy/ProfessorsPage'
import { CategoriesPage } from './features/academy/CategoriesPage'
import { ClassGroupsPage } from './features/academy/ClassGroupsPage'
import { ClassGroupDetailPage } from './features/academy/ClassGroupDetailPage'
import { GraduationLevelsPage } from './features/academy/GraduationLevelsPage'
import { PlansPage } from './features/academy/PlansPage'
import { AcademyFinancePage } from './features/academy/AcademyFinancePage'
import { AcademyFinanceReportPage } from './features/academy/AcademyFinanceReportPage'
import { AttendancePage } from './features/academy/AttendancePage'
import { AttendanceQrPage } from './features/academy/AttendanceQrPage'
import { AttendanceReportPage } from './features/academy/AttendanceReportPage'
import { AcademySettingsPage } from './features/academy/AcademySettingsPage'
import { AcademyNotificationsPage } from './features/academy/AcademyNotificationsPage'
import { LandingEditorPage } from './features/landing/LandingEditorPage'
import { PublicLandingPage } from './features/landing/PublicLandingPage'
import { StudentInvitePage } from './features/invite/StudentInvitePage'
import { StaffInvitePage } from './features/invite/StaffInvitePage'
import { AcademyLeadsPage } from './features/academy/AcademyLeadsPage'
import { StudentInvitesPage } from './features/academy/StudentInvitesPage'
import { StudentSchedulePage } from './features/schedule/StudentSchedulePage'
import { AcademySchedulePage } from './features/schedule/AcademySchedulePage'
import { StudentDashboardPage } from './features/student/StudentDashboardPage'
import { MyPlanPage } from './features/student/MyPlanPage'
import { StudentClassGroupsPage } from './features/student/StudentClassGroupsPage'
import { ModalitiesPage } from './features/student/ModalitiesPage'
import { PaymentPage } from './features/student/PaymentPage'
import { PaymentHistoryPage } from './features/student/PaymentHistoryPage'
import { StudentProfilePage } from './features/student/StudentProfilePage'
import { StudentOnboardingWizard } from './features/student/StudentOnboardingWizard'
import { StudentGraduationPage } from './features/student/StudentGraduationPage'
import { StudentQrCheckInPage } from './features/student/StudentQrCheckInPage'
import { NotFoundPage } from './features/shared/NotFoundPage'
import { DevUiPage } from './features/dev/DevUiPage'
import { getAcademyNav, platformNav, studentNav } from './routes/nav-config'
import { useAuth } from './contexts/AuthContext'
import { canAccessFinanceiro } from './lib/auth-utils'
import { useAcademyContext } from './contexts/AcademyContext'
import { AcademyOwnerGuard } from './routes/AcademyOwnerGuard'
import { AcademyOnboardingGuard } from './routes/AcademyOnboardingGuard'
import { AcademyOnboardingLayout } from './layouts/AcademyOnboardingLayout'
import { AcademyOnboardingWizard } from './features/academy/AcademyOnboardingWizard'
import { StudentProvider } from './contexts/StudentContext'
import { StudentOnboardingGuard } from './routes/StudentOnboardingGuard'
import { StudentOnboardingLayout } from './layouts/StudentOnboardingLayout'

import { useFeatureFlag } from './hooks/useFeatureFlag'

function AcademyLayoutWrapper() {
  const { roles } = useAuth()
  const { academyRoles, activeAcademyId, setActiveAcademyId, activeRole } = useAcademyContext()
  const showFinance = activeRole ? canAccessFinanceiro([activeRole]) : canAccessFinanceiro(roles)
  const { enabled: showAttendance } = useFeatureFlag(activeAcademyId, 'module_attendance')
  const { enabled: showSchedule } = useFeatureFlag(activeAcademyId, 'module_class_schedule')
  const { enabled: showClassGroups } = useFeatureFlag(activeAcademyId, 'module_class_groups')
  const { enabled: showGraduation } = useFeatureFlag(activeAcademyId, 'module_graduation')
  const { enabled: landingEnabled } = useFeatureFlag(activeAcademyId, 'module_landing')
  const showLanding = landingEnabled

  return (
    <DashboardLayout
      logo="RINGPRO"
      navItems={getAcademyNav(activeRole, showFinance, showAttendance, showSchedule, showLanding, showClassGroups, showGraduation)}
      title="Portal Academia"
      topbarExtra={
        academyRoles.length > 1 ? (
          <select
            className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-elevated)] px-2 py-1 text-sm"
            value={activeAcademyId ?? ''}
            onChange={(e) => setActiveAcademyId(e.target.value)}
          >
            {academyRoles.map((r) => (
              <option key={r.academy_id ?? r.id} value={r.academy_id ?? ''}>
                {r.academy?.name ?? r.academy_id}
              </option>
            ))}
          </select>
        ) : null
      }
    />
  )
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/dev/ui" element={<DevUiPage />} />

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/auth/verificar-email" element={<VerifyEmailPage />} />
        <Route
          path="/auth/trocar-senha"
          element={
            <ProtectedRoute>
              <ChangePasswordPage />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route
        path="/platform"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['PLATFORM_OWNER', 'PLATFORM_SUPPORT', 'PLATFORM_FINANCE']}>
              <DashboardLayout logo="RINGPRO" navItems={platformNav} title="Portal Plataforma" />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PlatformDashboardPage />} />
        <Route path="equipe" element={<PlatformTeamPage />} />
        <Route path="academias" element={<AcademiesListPage />} />
        <Route path="academias/nova" element={<NewAcademyPage />} />
        <Route path="academias/:academyId/flags" element={<FeatureFlagsPage />} />
        <Route path="financeiro" element={<PlatformFinancePage />} />
        <Route path="configuracoes" element={<PlatformSettingsPage />} />
        <Route path="auditoria" element={<PlatformAuditPage />} />
        <Route path="seguranca" element={<MfaSettingsPage />} />
      </Route>

      <Route
        path="/academy"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['SCHOOL_OWNER', 'PROFESSOR', 'ASSISTANT']}>
              <AcademyProvider>
                <AcademyOnboardingGuard />
              </AcademyProvider>
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route element={<AcademyOnboardingLayout />}>
          <Route path="onboarding" element={<AcademyOnboardingWizard />} />
        </Route>
        <Route element={<AcademyLayoutWrapper />}>
        <Route path="dashboard" element={<AcademyDashboardPage />} />
        <Route path="alunos" element={<StudentsListPage />} />
        <Route
          path="alunos/convites"
          element={
            <AcademyOwnerGuard>
              <StudentInvitesPage />
            </AcademyOwnerGuard>
          }
        />
        <Route path="alunos/novo" element={<NewStudentPage />} />
        <Route path="alunos/:studentId" element={<StudentDetailPage />} />
        <Route
          path="professores"
          element={
            <AcademyOwnerGuard>
              <ProfessorsPage />
            </AcademyOwnerGuard>
          }
        />
        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="turmas" element={<ClassGroupsPage />} />
        <Route path="turmas/:groupId" element={<ClassGroupDetailPage />} />
        <Route path="graduacao" element={<GraduationLevelsPage />} />
        <Route
          path="planos"
          element={
            <AcademyOwnerGuard>
              <PlansPage />
            </AcademyOwnerGuard>
          }
        />
        <Route
          path="financeiro"
          element={
            <AcademyOwnerGuard>
              <AcademyFinancePage />
            </AcademyOwnerGuard>
          }
        />
        <Route
          path="financeiro/relatorio"
          element={
            <AcademyOwnerGuard>
              <AcademyFinanceReportPage />
            </AcademyOwnerGuard>
          }
        />
        <Route path="presenca" element={<AttendancePage />} />
        <Route path="presenca/qr" element={<AttendanceQrPage />} />
        <Route path="relatorios/presenca" element={<AttendanceReportPage />} />
        <Route path="agenda" element={<AcademySchedulePage />} />
        <Route
          path="configuracoes"
          element={
            <AcademyOwnerGuard>
              <AcademySettingsPage />
            </AcademyOwnerGuard>
          }
        />
        <Route
          path="filiais"
          element={
            <AcademyOwnerGuard>
              <BranchesPage />
            </AcademyOwnerGuard>
          }
        />
        <Route path="notificacoes" element={<AcademyNotificationsPage />} />
        <Route
          path="landing"
          element={
            <AcademyOwnerGuard>
              <LandingEditorPage />
            </AcademyOwnerGuard>
          }
        />
        <Route
          path="leads"
          element={
            <AcademyOwnerGuard>
              <AcademyLeadsPage />
            </AcademyOwnerGuard>
          }
        />
        </Route>
      </Route>

      <Route
        path="/student"
        element={
          <ProtectedRoute>
            <RoleRoute allowed={['STUDENT']}>
              <StudentProvider>
                <StudentPushHandler />
                <StudentOnboardingGuard />
              </StudentProvider>
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route element={<StudentOnboardingLayout />}>
          <Route path="onboarding" element={<StudentOnboardingWizard />} />
        </Route>
        <Route
          element={
            <DashboardLayout logo="RINGPRO" navItems={studentNav} title="Portal Aluno" />
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StudentDashboardPage />} />
          <Route path="agenda" element={<StudentSchedulePage />} />
          <Route path="check-in/:token" element={<StudentQrCheckInPage />} />
          <Route path="meu-plano" element={<MyPlanPage />} />
          <Route path="modalidades" element={<ModalitiesPage />} />
          <Route path="turmas" element={<StudentClassGroupsPage />} />
          <Route path="graduacao" element={<StudentGraduationPage />} />
          <Route path="pagamento" element={<PaymentPage />} />
          <Route path="historico" element={<PaymentHistoryPage />} />
          <Route path="perfil" element={<StudentProfilePage />} />
        </Route>
      </Route>

      <Route path="/convite/:token" element={<StudentInvitePage />} />
      <Route path="/convite-equipe/:token" element={<StaffInvitePage />} />
      <Route path="/convite-plataforma/:token" element={<PlatformStaffInvitePage />} />
      <Route path="/a/:slug" element={<PublicLandingPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CapacitorDeepLinkHandler />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
