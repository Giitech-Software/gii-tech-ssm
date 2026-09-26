import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Activity,
  AlertTriangle,
  CalendarRange,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building,
  Calendar,
  CalendarCheck2,
  ChevronLeft,
  ChevronDown,
  Clock3,
  ClipboardList,
  ClipboardCheck,
  DollarSign,
  FileBarChart2,
  FileText,
  ReceiptText,
  GraduationCap,
  Home,
  Layers,
  Link2,
  LibraryBig,
  WalletCards,
  LogOut,
  Menu,
  Megaphone,
  MessageCircle,
  Send,
  ShieldCheck,
  ScanLine,
  ScanFace,
  Sparkles,
  UploadCloud,
  Users,
  UserCog,
  UserPlus,
  X,
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebaseConfig";

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: number;
};

const roleTitles: Record<string, string> = {
  superadmin: "Super Admin",
  admin: "Administrator",
  teacher: "Teacher",
  student: "Student",
  parent: "Parent",
  staff: "Non-Teaching Staff",
};

const SharedLayout = () => {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [openAdminGroup, setOpenAdminGroup] = useState<string | null>(null);
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    if (!user?.email) return;

    const messagesQuery = query(
      collection(db, "messages"),
      where("participants", "array-contains", user.email)
    );

    return onSnapshot(
      messagesQuery,
      (snapshot) => {
        const unread = snapshot.docs.filter(({ data }) => {
          const lastMessage = data().lastMessage;
          return (
            lastMessage &&
            lastMessage.sender !== user.email &&
            !lastMessage.readBy?.includes(user.email)
          );
        }).length;
        setUnreadCount(unread);
      },
      (error) => console.warn("Unable to load unread messages:", error)
    );
  }, [user?.email]);

  const navItems: NavItem[] = [
    { to: "/admin/departments", label: "Departments", icon: <Building size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/academic-years", label: "Academic Years", icon: <CalendarRange size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/classes", label: "Classes", icon: <Layers size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/streams", label: "Streams", icon: <GraduationCap size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/students", label: "Students", icon: <GraduationCap size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/staff", label: "Staff", icon: <Users size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/create-staff", label: "Create Staff", icon: <UserPlus size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/attendance", label: "Attendance Workspace", icon: <CalendarCheck2 size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/staff-attendance", label: "Staff Attendance", icon: <Calendar size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/qr-attendance", label: "QR Attendance", icon: <ScanLine size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/qr-identities", label: "Student QR Cards", icon: <ScanLine size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/face-enrollment", label: "Face Enrollment", icon: <ScanFace size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/attendance-analytics", label: "Attendance Analytics", icon: <BarChart3 size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/grading", label: "Grading Configuration", icon: <BookOpen size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/rankings", label: "Student Rankings", icon: <BarChart3 size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/payment-intents", label: "Payment Intents", icon: <DollarSign size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/ai-audit", label: "AI Grading Audit", icon: <ShieldCheck size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/ai-settings", label: "AI Usage Settings", icon: <ShieldCheck size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/ai-usage", label: "AI Usage Report", icon: <BarChart3 size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/ai-costs", label: "AI Cost Controls", icon: <DollarSign size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/ai-alerts", label: "AI Budget Alerts", icon: <AlertTriangle size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/ai-monthly-costs", label: "AI Monthly Costs", icon: <BarChart3 size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/activity", label: "Activity Logs", icon: <Activity size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/communications", label: "Communications", icon: <Megaphone size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/promotions", label: "Student Promotion", icon: <ArrowUpRight size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/assessments", label: "Assessment Setup", icon: <ClipboardCheck size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/report-publishing", label: "Report Publishing", icon: <FileText size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/identity-links", label: "Family Links", icon: <Link2 size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/fees", label: "Fee Structures", icon: <DollarSign size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/finance", label: "Student Ledger", icon: <DollarSign size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/library", label: "School Library", icon: <LibraryBig size={18} />, roles: ["superadmin", "admin"] },
  { to: "/admin/staff-finance", label: "Staff Financial Records", icon: <WalletCards size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/staff-loan-repayments", label: "Staff Loan Repayments", icon: <WalletCards size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/staff-finance-reports", label: "Staff Finance Reports", icon: <FileBarChart2 size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/ssnit-report", label: "SSNIT Contribution Report", icon: <FileBarChart2 size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/ssnit-remittance", label: "SSNIT Remittance Tracking", icon: <ShieldCheck size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/staff-attendance-settings", label: "Staff Attendance Times", icon: <Clock3 size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/staff-qr-identities", label: "Staff QR Identity Cards", icon: <ScanLine size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/staff-movement-report", label: "Early Departure Report", icon: <AlertTriangle size={18} />, roles: ["superadmin", "admin"] },
    { to: "/superadmin/users", label: "User Management", icon: <UserCog size={18} />, roles: ["superadmin"] },
    { to: "/superadmin/create-user", label: "Create User", icon: <UserPlus size={18} />, roles: ["superadmin"] },
    { to: "/admin/reports", label: "Reports", icon: <FileBarChart2 size={18} />, roles: ["superadmin", "admin"] },
    { to: "/teacher/assignments", label: "Assignments", icon: <ClipboardList size={18} />, roles: ["teacher"] },
    { to: "/teacher/materials", label: "Learning Materials", icon: <BookOpen size={18} />, roles: ["teacher"] },
    { to: "/teacher/assessment-summary", label: "Assessment Summary", icon: <BarChart3 size={18} />, roles: ["teacher"] },
    { to: "/teacher/ai-review", label: "AI Mark Review", icon: <Sparkles size={18} />, roles: ["teacher"] },
    { to: "/teacher/submissions", label: "Submissions", icon: <UploadCloud size={18} />, roles: ["teacher"] },
    { to: "/teacher/grades", label: "Grades", icon: <BookOpen size={18} />, roles: ["teacher"] },
    { to: "/teacher/exam-grades", label: "Exam Grades", icon: <ClipboardCheck size={18} />, roles: ["teacher"] },
    { to: "/teacher/grade-summary", label: "Grade Summary", icon: <BarChart3 size={18} />, roles: ["teacher"] },
    { to: "/teacher/attendance", label: "Attendance", icon: <Calendar size={18} />, roles: ["teacher"] },
    { to: "/teacher/qr-attendance", label: "QR Attendance", icon: <ScanLine size={18} />, roles: ["teacher"] },
    { to: "/teacher/feedback", label: "Feedback", icon: <Send size={18} />, roles: ["teacher"] },
    { to: "/teacher/messages", label: "Messages", icon: <MessageCircle size={18} />, roles: ["teacher"], badge: unreadCount },
    { to: "/student/assignments", label: "Assignments", icon: <FileText size={18} />, roles: ["student"] },
    { to: "/student/materials", label: "Learning Materials", icon: <BookOpen size={18} />, roles: ["student"] },
    { to: "/student/submissions", label: "Submissions", icon: <UploadCloud size={18} />, roles: ["student"] },
    { to: "/student/grades", label: "My Grades", icon: <ClipboardList size={18} />, roles: ["student"] },
    { to: "/student/attendance", label: "My Attendance", icon: <Calendar size={18} />, roles: ["student"] },
    { to: "/student/library", label: "My Library", icon: <LibraryBig size={18} />, roles: ["student"] },
    { to: "/parent/performance", label: "Performance", icon: <BarChart3 size={18} />, roles: ["parent"] },
    { to: "/parent/attendance", label: "Attendance", icon: <Calendar size={18} />, roles: ["parent"] },
    { to: "/parent/reports", label: "Reports", icon: <FileText size={18} />, roles: ["parent"] },
    { to: "/notifications", label: "Notifications", icon: <Bell size={18} />, roles: ["superadmin", "admin", "teacher", "student", "parent", "staff"] },
    { to: "/notification-preferences", label: "Delivery Preferences", icon: <Bell size={18} />, roles: ["superadmin", "admin", "teacher", "student", "parent", "staff"] },
    { to: "/parent/messages", label: "Messages", icon: <MessageCircle size={18} />, roles: ["parent"], badge: unreadCount },
    { to: "/parent/fees", label: "Fees", icon: <DollarSign size={18} />, roles: ["parent"] },
    { to: "/staff/attendance", label: "Attendance", icon: <Calendar size={18} />, roles: ["staff"] },
    { to: "/staff/qr-attendance", label: "QR Attendance", icon: <ScanLine size={18} />, roles: ["staff"] },
    { to: "/staff/messages", label: "Communication", icon: <MessageCircle size={18} />, roles: ["staff"], badge: unreadCount },
    { to: "/staff/finance", label: "My Financial Records", icon: <WalletCards size={18} />, roles: ["staff"] },
    { to: "/staff/payslips", label: "My Payslips", icon: <ReceiptText size={18} />, roles: ["staff"] },
    { to: "/announcements", label: "Announcements", icon: <Bell size={18} />, roles: ["superadmin", "admin", "teacher", "student", "parent", "staff"] },
    { to: "/calendar", label: "Calendar", icon: <Calendar size={18} />, roles: ["superadmin", "admin", "teacher", "student", "parent", "staff"] },
  ];

  const visibleItems = navItems.filter((item) => role && item.roles.includes(role));
  const displayName = user?.displayName || user?.email || "User";

  const renderNavItems = (items: NavItem[]) => items.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      title={item.label}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
          isActive ? "bg-blue-50 font-semibold text-primary" : "text-slate-600 hover:bg-slate-50"
        }`
      }
    >
      {item.icon}
      <span className={`flex-1 ${desktopCollapsed ? "md:hidden" : ""}`}>{item.label}</span>
      {!!item.badge && <span className={`rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white ${desktopCollapsed ? "md:hidden" : ""}`}>{item.badge}</span>}
    </NavLink>
  ));

  const renderAdminGroup = (key: string, label: string, icon: React.ReactNode, items: NavItem[]) => (
    <div className="space-y-1" key={key}>
      <button type="button" onClick={() => setOpenAdminGroup(openAdminGroup === key ? null : key)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition ${openAdminGroup === key ? "border-primary/30 bg-blue-50 text-primary" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
        <span className="text-primary">{icon}</span><span className={`flex-1 ${desktopCollapsed ? "md:hidden" : ""}`}>{label}</span><ChevronDown className={`transition-transform ${openAdminGroup === key ? "rotate-180" : ""} ${desktopCollapsed ? "md:hidden" : ""}`} size={16} />
      </button>
      {openAdminGroup === key && <div className="ml-2 space-y-1 border-l border-blue-100 pl-2">{renderNavItems(items)}</div>}
    </div>
  );

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center justify-between border-b px-4">
        <div className={`min-w-0 ${desktopCollapsed ? "md:hidden" : ""}`}>
          <p className="truncate text-base font-black tracking-tight text-primary">ASTEM-SSM</p>
          <p className="truncate text-xs font-medium text-slate-500">{roleTitles[role || ""] || "School Manager"}</p>
        </div>
        <button
          type="button"
          title="Close menu"
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden"
        >
          <X size={18} />
        </button>
        <ShieldCheck className={`hidden text-primary ${desktopCollapsed ? "md:block" : ""}`} size={22} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <NavLink
          to="/"
          end
          title="Dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
              isActive ? "bg-blue-50 font-semibold text-primary" : "text-slate-600 hover:bg-slate-50"
            }`
          }
        >
          <Home size={18} />
          <span className={desktopCollapsed ? "md:hidden" : ""}>Dashboard</span>
        </NavLink>

        {role === "admin" || role === "superadmin" ? <>
          {renderAdminGroup("academic", "Academic operations", <GraduationCap size={18} />, visibleItems.filter(item => ["Departments", "Academic Years", "Classes", "Streams", "Students", "Staff", "Grading Configuration", "Student Rankings"].includes(item.label)))}
          {renderAdminGroup("attendance", "Attendance", <CalendarCheck2 size={18} />, visibleItems.filter(item => ["Attendance Workspace", "Staff Attendance", "QR Attendance", "Student QR Cards", "Face Enrollment", "Attendance Analytics", "Staff Attendance Times", "Staff QR Identity Cards", "Early Departure Report"].includes(item.label)))}
          {renderAdminGroup("finance", "Finance", <DollarSign size={18} />, visibleItems.filter(item => ["Payment Intents", "Fee Structures", "Student Ledger"].includes(item.label)))}
          {renderAdminGroup("ai", "AI controls", <Sparkles size={18} />, visibleItems.filter(item => ["AI Grading Audit", "AI Usage Settings", "AI Usage Report", "AI Cost Controls", "AI Budget Alerts", "AI Monthly Costs"].includes(item.label)))}
          {renderAdminGroup("school", "School administration", <ShieldCheck size={18} />, visibleItems.filter(item => !["Departments", "Academic Years", "Classes", "Streams", "Students", "Staff", "Attendance Workspace", "Staff Attendance", "QR Attendance", "Student QR Cards", "Face Enrollment", "Attendance Analytics", "Staff Attendance Times", "Staff QR Identity Cards", "Early Departure Report", "Grading Configuration", "Student Rankings", "Payment Intents", "Fee Structures", "Student Ledger", "School Library", "Staff Financial Records", "AI Grading Audit", "AI Usage Settings", "AI Usage Report", "AI Cost Controls", "AI Budget Alerts", "AI Monthly Costs"].includes(item.label)))}
        </> : renderNavItems(visibleItems)}
      </nav>

      <div className="space-y-1 border-t p-3">
        <button
          type="button"
          title={desktopCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setDesktopCollapsed((value) => !value)}
          className="hidden w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 md:flex"
        >
          <ChevronLeft className={desktopCollapsed ? "rotate-180" : ""} size={18} />
          <span className={desktopCollapsed ? "md:hidden" : ""}>Collapse</span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          title="Logout"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          <LogOut size={18} />
          <span className={desktopCollapsed ? "md:hidden" : ""}>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-gray-900/40 md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r transition-transform duration-200 md:relative md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${desktopCollapsed ? "md:w-20" : "md:w-64"}`}
      >
        {sidebar}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 shadow-sm backdrop-blur">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              title="Open menu"
              onClick={() => setMobileOpen(true)}
              className="rounded-md p-2 text-gray-700 hover:bg-gray-100 md:hidden"
            >
              <Menu size={20} />
            </button>
            <p className="truncate text-sm font-semibold text-gray-800">{roleTitles[role || ""] || "Dashboard"}</p>
          </div>
          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-medium text-gray-800">{displayName}</p>
            <p className="truncate text-xs capitalize text-gray-500">{role || "user"}</p>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-7">
          <Outlet />
          <footer className="mt-8 border-t border-slate-200 px-2 py-5 text-center text-xs text-slate-500">
            <p>ASTEM-SSM, all rights reserved.</p>
            <p className="mt-1">Powered by ASTEM Software Lab.</p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default SharedLayout;
