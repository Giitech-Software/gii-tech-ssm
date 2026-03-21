import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import type { JSX } from "react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import SeedPage from "./pages/SeedPage";

// 🔹 Auth pages
import Login from "./pages/Login";
import Signup from "./pages/SuperAdmin/CreateUser";

// 🔹 Admin pages
import FeesPage from "./pages/Admin/FeesPage";
import DepartmentsPage from "./pages/Admin/DepartmentsPage";
import ClassesPage from "./pages/Admin/ClassesPage";
import StreamPage from "./pages/Admin/StreamsPage";
import UserManagementPage from "./pages/SuperAdmin/UserManagementPage";

// 🔹 Reports
import ReportsPage from "./pages/Admin/ReportsPage";
import StudentReport from "./pages/Admin/reports/StudentReport";
import PerformanceReport from "./pages/Admin/reports/PerformanceReport";
import AttendanceReport from "./pages/Admin/reports/AttendanceReport";
import StudentReportCard from "./pages/Admin/reports/StudentReportCard";

// 🔹 Dashboards
import SuperAdminDashboard from "./pages/SuperAdmin/SuperAdminDashboard";
import AdminDashboard from "./pages/Admin/AdminDashboard";
import TeacherDashboard from "./pages/Teacher/TeacherDashboard";
import StudentDashboard from "./pages/Student/StudentDashboard";
import ParentDashboard from "./pages/Parent/ParentDashboard";

// 🔹 Student-specific pages
import StudentGradesPage from "./pages/Student/StudentGradesPage";
import StudentAttendancePage from "./pages/Student/StudentAttendancePage";
import AssignmentsListPage from "./pages/Student/AssignmentsListPage";
import SubmissionsPage from "./pages/Student/SubmissionsPage";

// 🔹 Parent-specific pages
import ParentPerformancePage from "./pages/Parent/ParentPerformancePage";
import ParentAttendancePage from "./pages/Parent/ParentAttendancePage";
import ParentNotificationsPage from "./pages/Parent/ParentNotificationsPage";
import ParentReportsPage from "./pages/Parent/ParentReportsPage";
import ParentMessagesPage from "./pages/Parent/ParentMessagesPage";

// 🔹 Teacher-specific pages
import TeacherAssignmentsPage from "./pages/Teacher/TeacherAssignmentsPage";
import TeacherGradesPage from "./pages/Teacher/TeacherGradesPage";
import TeacherViewSubmissionsPage from "./pages/Teacher/TeacherViewSubmissionsPage";
import GradeSummaryReportPage from "./pages/Teacher/GradeSummaryReportPage";
import TeacherAttendancePage from "./pages/Teacher/TeacherAttendancePage";
import TeacherFeedbackPage from "./pages/Teacher/TeacherFeedbackPage";
import TeacherMessagesPage from "./pages/Teacher/TeacherMessagesPage";

// 🔹 Shared layout
import SharedLayout from "./components/SharedLayout";

// ----------------------------------------------------------------
// Utility Components
// ----------------------------------------------------------------

function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center text-gray-600 text-lg">
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

// 🔹 Role-based router (auto dashboard redirect)
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
      return (
        <div className="p-6 text-red-600">
          🚨 No role assigned. Contact administrator.
        </div>
      );
  }
}

// ----------------------------------------------------------------
// App Entry Point
// ----------------------------------------------------------------

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* 🔹 Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/seed" element={<SeedPage />} />

          {/* 🔹 Protected application layout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <SharedLayout />
              </ProtectedRoute>
            }
          >
            {/* Default route (role-based landing) */}
            <Route index element={<RoleRouter />} />

            {/* ---------------------------------------------------------------- */}
            {/* 🔹 SuperAdmin Routes */}
            {/* ---------------------------------------------------------------- */}
            <Route path="superadmin" element={<SuperAdminDashboard />} />
            <Route path="superadmin/users" element={<UserManagementPage />} />
            <Route path="superadmin/create-user" element={<Signup />} />

            {/* ---------------------------------------------------------------- */}
            {/* 🔹 Admin Routes */}
            {/* ---------------------------------------------------------------- */}
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="admin/departments" element={<DepartmentsPage />} />
            <Route path="admin/classes" element={<ClassesPage />} />
            <Route path="admin/streams" element={<StreamPage />} />
            <Route path="admin/fees" element={<FeesPage />} />
            <Route path="admin/users" element={<UserManagementPage />} />

            {/* 🔹 Reports */}
            <Route path="admin/reports" element={<ReportsPage />} />
            <Route path="admin/reports/student" element={<StudentReport />} />
            <Route path="admin/reports/performance" element={<PerformanceReport />} />
            <Route path="admin/reports/attendance" element={<AttendanceReport />} />
            <Route path="admin/reports/report-card" element={<StudentReportCard />} />

            {/* ---------------------------------------------------------------- */}
            {/* 🔹 Teacher Routes */}
            {/* ---------------------------------------------------------------- */}
            <Route path="teacher" element={<TeacherDashboard />} />
            <Route path="teacher/assignments" element={<TeacherAssignmentsPage />} />
            <Route path="teacher/submissions" element={<TeacherViewSubmissionsPage />} />
            <Route path="teacher/grades" element={<TeacherGradesPage />} />
            <Route path="teacher/grade-summary" element={<GradeSummaryReportPage />} />
            <Route path="teacher/attendance" element={<TeacherAttendancePage />} />
            <Route path="teacher/feedback" element={<TeacherFeedbackPage />} />
            <Route path="teacher/messages" element={<TeacherMessagesPage />} />

            {/* ---------------------------------------------------------------- */}
            {/* 🔹 Student Routes */}
            {/* ---------------------------------------------------------------- */}
            <Route path="student" element={<StudentDashboard />} />
            <Route path="student/assignments" element={<AssignmentsListPage />} />
            <Route path="student/submissions" element={<SubmissionsPage />} />
            <Route path="student/grades" element={<StudentGradesPage />} />
            <Route path="student/attendance" element={<StudentAttendancePage />} />

            {/* ---------------------------------------------------------------- */}
            {/* 🔹 Parent Routes */}
            {/* ---------------------------------------------------------------- */}
            <Route path="parent" element={<ParentDashboard />} />
            <Route path="parent/performance" element={<ParentPerformancePage />} />
            <Route path="parent/attendance" element={<ParentAttendancePage />} />
            <Route path="parent/notifications" element={<ParentNotificationsPage />} />
            <Route path="parent/reports" element={<ParentReportsPage />} />
            <Route path="parent/messages" element={<ParentMessagesPage />} />
          </Route>

          {/* ---------------------------------------------------------------- */}
          {/* 🔹 Fallback Route */}
          {/* ---------------------------------------------------------------- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
