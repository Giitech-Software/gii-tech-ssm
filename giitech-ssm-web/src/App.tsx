import { BrowserRouter as Router, Navigate, Outlet, Route, Routes } from "react-router-dom";
import type { JSX } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/SuperAdmin/CreateUser";
import FeesPage from "./pages/Admin/FeesPage";
import FinanceLedgerPage from "./pages/Admin/FinanceLedgerPage";
import DepartmentsPage from "./pages/Admin/DepartmentsPage";
import ClassesPage from "./pages/Admin/ClassesPage";
import StreamPage from "./pages/Admin/StreamsPage";
import StudentsDirectoryPage from "./pages/Admin/StudentsDirectoryPage";
import StaffDirectoryPage from "./pages/Admin/StaffDirectoryPage";
import ActivityLogsPage from "./pages/Admin/ActivityLogsPage";
import CommunicationsPage from "./pages/Admin/CommunicationsPage";
import PromotionsPage from "./pages/Admin/PromotionsPage";
import AssessmentManagementPage from "./pages/Admin/AssessmentManagementPage";
import ReportPublishingPage from "./pages/Admin/ReportPublishingPage";
import IdentityLinksPage from "./pages/Admin/IdentityLinksPage";
import AnnouncementsPage from "./pages/Shared/AnnouncementsPage";
import CalendarPage from "./pages/Shared/CalendarPage";
import NotificationsPage from "./pages/Shared/NotificationsPage";
import UserManagementPage from "./pages/SuperAdmin/UserManagementPage";
import ReportsPage from "./pages/Admin/ReportsPage";
import StudentReport from "./pages/Admin/reports/StudentReport";
import PerformanceReport from "./pages/Admin/reports/PerformanceReport";
import AttendanceReport from "./pages/Admin/reports/AttendanceReport";
import StudentReportCard from "./pages/Admin/reports/StudentReportCard";
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import TeacherDashboard from "./pages/Teacher/TeacherDashboard";
import StudentDashboard from "./pages/Student/StudentDashboard";
import ParentDashboard from "./pages/Parent/ParentDashboard";
import StudentGradesPage from "./pages/Student/StudentGradesPage";
import StudentAttendancePage from "./pages/Student/StudentAttendancePage";
import AssignmentsListPage from "./pages/Student/AssignmentsListPage";
import SubmissionsPage from "./pages/Student/SubmissionsPage";
import ParentPerformancePage from "./pages/Parent/ParentPerformancePage";
import ParentAttendancePage from "./pages/Parent/ParentAttendancePage";
import ParentNotificationsPage from "./pages/Parent/ParentNotificationsPage";
import ParentReportsPage from "./pages/Parent/ParentReportsPage";
import ParentMessagesPage from "./pages/Parent/ParentMessagesPage";
import ParentFeesPage from "./pages/Parent/ParentFeesPage";
import TeacherAssignmentsPage from "./pages/Teacher/TeacherAssignmentsPage";
import TeacherGradesPage from "./pages/Teacher/TeacherGradesPage";
import TeacherViewSubmissionsPage from "./pages/Teacher/TeacherViewSubmissionsPage";
import GradeSummaryReportPage from "./pages/Teacher/GradeSummaryReportPage";
import TeacherAttendancePage from "./pages/Teacher/TeacherAttendancePage";
import TeacherFeedbackPage from "./pages/Teacher/TeacherFeedbackPage";
import TeacherMessagesPage from "./pages/Teacher/TeacherMessagesPage";
import TeacherExamGradesPage from "./pages/Teacher/TeacherExamGradesPage";
import SharedLayout from "./components/SharedLayout";

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center text-lg text-gray-600">
      Loading Giitech-SSM...
    </div>
  );
}

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleProtectedRoute({ allowedRoles }: { allowedRoles: string[] }) {
  const { user, role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!role || !allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return <Outlet />;
}

function RoleRouter() {
  const { role } = useAuth();

  switch (role) {
    case "superadmin":
      return <SuperAdminDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "teacher":
      return <TeacherDashboard />;
    case "student":
      return <StudentDashboard />;
    case "parent":
      return <ParentDashboard />;
    default:
      return <div className="p-6 text-red-600">No role assigned. Contact your administrator.</div>;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SharedLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<RoleRouter />} />
            <Route path="announcements" element={<AnnouncementsPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="notifications" element={<NotificationsPage />} />

            <Route element={<RoleProtectedRoute allowedRoles={["superadmin"]} />}>
              <Route path="superadmin" element={<SuperAdminDashboard />} />
              <Route path="superadmin/users" element={<UserManagementPage />} />
              <Route path="superadmin/create-user" element={<Signup />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={["superadmin", "admin"]} />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="admin/departments" element={<DepartmentsPage />} />
              <Route path="admin/classes" element={<ClassesPage />} />
              <Route path="admin/streams" element={<StreamPage />} />
              <Route path="admin/students" element={<StudentsDirectoryPage />} />
              <Route path="admin/staff" element={<StaffDirectoryPage />} />
              <Route path="admin/activity" element={<ActivityLogsPage />} />
              <Route path="admin/communications" element={<CommunicationsPage />} />
              <Route path="admin/promotions" element={<PromotionsPage />} />
              <Route path="admin/assessments" element={<AssessmentManagementPage />} />
              <Route path="admin/report-publishing" element={<ReportPublishingPage />} />
              <Route path="admin/identity-links" element={<IdentityLinksPage />} />
              <Route path="admin/fees" element={<FeesPage />} />
              <Route path="admin/finance" element={<FinanceLedgerPage />} />
              <Route path="admin/reports" element={<ReportsPage />} />
              <Route path="admin/reports/student" element={<StudentReport />} />
              <Route path="admin/reports/performance" element={<PerformanceReport />} />
              <Route path="admin/reports/attendance" element={<AttendanceReport />} />
              <Route path="admin/reports/report-card" element={<StudentReportCard />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={["teacher"]} />}>
              <Route path="teacher" element={<TeacherDashboard />} />
              <Route path="teacher/assignments" element={<TeacherAssignmentsPage />} />
              <Route path="teacher/submissions" element={<TeacherViewSubmissionsPage />} />
              <Route path="teacher/grades" element={<TeacherGradesPage />} />
              <Route path="teacher/exam-grades" element={<TeacherExamGradesPage />} />
              <Route path="teacher/grade-summary" element={<GradeSummaryReportPage />} />
              <Route path="teacher/attendance" element={<TeacherAttendancePage />} />
              <Route path="teacher/feedback" element={<TeacherFeedbackPage />} />
              <Route path="teacher/messages" element={<TeacherMessagesPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={["student"]} />}>
              <Route path="student" element={<StudentDashboard />} />
              <Route path="student/assignments" element={<AssignmentsListPage />} />
              <Route path="student/submissions" element={<SubmissionsPage />} />
              <Route path="student/grades" element={<StudentGradesPage />} />
              <Route path="student/attendance" element={<StudentAttendancePage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={["parent"]} />}>
              <Route path="parent" element={<ParentDashboard />} />
              <Route path="parent/performance" element={<ParentPerformancePage />} />
              <Route path="parent/attendance" element={<ParentAttendancePage />} />
              <Route path="parent/notifications" element={<ParentNotificationsPage />} />
              <Route path="parent/reports" element={<ParentReportsPage />} />
              <Route path="parent/messages" element={<ParentMessagesPage />} />
              <Route path="parent/fees" element={<ParentFeesPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
