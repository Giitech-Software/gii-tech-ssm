import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Activity,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building,
  Calendar,
  ChevronLeft,
  ClipboardList,
  ClipboardCheck,
  DollarSign,
  FileBarChart2,
  FileText,
  GraduationCap,
  Home,
  Layers,
  Link2,
  LogOut,
  Menu,
  Megaphone,
  MessageCircle,
  Send,
  ShieldCheck,
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
};

const SharedLayout = () => {
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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
    { to: "/admin/classes", label: "Classes", icon: <Layers size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/streams", label: "Streams", icon: <GraduationCap size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/students", label: "Students", icon: <GraduationCap size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/staff", label: "Staff", icon: <Users size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/activity", label: "Activity Logs", icon: <Activity size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/communications", label: "Communications", icon: <Megaphone size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/promotions", label: "Student Promotion", icon: <ArrowUpRight size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/assessments", label: "Assessment Setup", icon: <ClipboardCheck size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/report-publishing", label: "Report Publishing", icon: <FileText size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/identity-links", label: "Family Links", icon: <Link2 size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/fees", label: "Fee Structures", icon: <DollarSign size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/finance", label: "Student Ledger", icon: <DollarSign size={18} />, roles: ["superadmin", "admin"] },
    { to: "/superadmin/users", label: "User Management", icon: <UserCog size={18} />, roles: ["superadmin"] },
    { to: "/superadmin/create-user", label: "Create User", icon: <UserPlus size={18} />, roles: ["superadmin"] },
    { to: "/admin/reports", label: "Reports", icon: <FileBarChart2 size={18} />, roles: ["superadmin", "admin"] },
    { to: "/teacher/assignments", label: "Assignments", icon: <ClipboardList size={18} />, roles: ["teacher"] },
    { to: "/teacher/submissions", label: "Submissions", icon: <UploadCloud size={18} />, roles: ["teacher"] },
    { to: "/teacher/grades", label: "Grades", icon: <BookOpen size={18} />, roles: ["teacher"] },
    { to: "/teacher/exam-grades", label: "Exam Grades", icon: <ClipboardCheck size={18} />, roles: ["teacher"] },
    { to: "/teacher/grade-summary", label: "Grade Summary", icon: <BarChart3 size={18} />, roles: ["teacher"] },
    { to: "/teacher/attendance", label: "Attendance", icon: <Calendar size={18} />, roles: ["teacher"] },
    { to: "/teacher/feedback", label: "Feedback", icon: <Send size={18} />, roles: ["teacher"] },
    { to: "/teacher/messages", label: "Messages", icon: <MessageCircle size={18} />, roles: ["teacher"], badge: unreadCount },
    { to: "/student/assignments", label: "Assignments", icon: <FileText size={18} />, roles: ["student"] },
    { to: "/student/submissions", label: "Submissions", icon: <UploadCloud size={18} />, roles: ["student"] },
    { to: "/student/grades", label: "My Grades", icon: <ClipboardList size={18} />, roles: ["student"] },
    { to: "/student/attendance", label: "My Attendance", icon: <Calendar size={18} />, roles: ["student"] },
    { to: "/parent/performance", label: "Performance", icon: <BarChart3 size={18} />, roles: ["parent"] },
    { to: "/parent/attendance", label: "Attendance", icon: <Calendar size={18} />, roles: ["parent"] },
    { to: "/parent/reports", label: "Reports", icon: <FileText size={18} />, roles: ["parent"] },
    { to: "/notifications", label: "Notifications", icon: <Bell size={18} />, roles: ["superadmin", "admin", "teacher", "student", "parent"] },
    { to: "/parent/messages", label: "Messages", icon: <MessageCircle size={18} />, roles: ["parent"], badge: unreadCount },
    { to: "/parent/fees", label: "Fees", icon: <DollarSign size={18} />, roles: ["parent"] },
    { to: "/announcements", label: "Announcements", icon: <Bell size={18} />, roles: ["superadmin", "admin", "teacher", "student", "parent"] },
    { to: "/calendar", label: "Calendar", icon: <Calendar size={18} />, roles: ["superadmin", "admin", "teacher", "student", "parent"] },
  ];

  const visibleItems = navItems.filter((item) => role && item.roles.includes(role));
  const displayName = user?.displayName || user?.email || "User";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const sidebar = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center justify-between border-b px-4">
        <div className={`min-w-0 ${desktopCollapsed ? "md:hidden" : ""}`}>
          <p className="truncate text-base font-bold text-gray-900">Giitech-SSM</p>
          <p className="truncate text-xs text-gray-500">{roleTitles[role || ""] || "School Manager"}</p>
        </div>
        <button
          type="button"
          title="Close menu"
          onClick={() => setMobileOpen(false)}
          className="rounded-md p-2 text-gray-600 hover:bg-gray-100 md:hidden"
        >
          <X size={18} />
        </button>
        <ShieldCheck className={`hidden text-indigo-600 ${desktopCollapsed ? "md:block" : ""}`} size={22} />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        <NavLink
          to="/"
          end
          title="Dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
              isActive ? "bg-indigo-50 font-medium text-indigo-700" : "text-gray-700 hover:bg-gray-100"
            }`
          }
        >
          <Home size={18} />
          <span className={desktopCollapsed ? "md:hidden" : ""}>Dashboard</span>
        </NavLink>

        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={item.label}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                isActive ? "bg-indigo-50 font-medium text-indigo-700" : "text-gray-700 hover:bg-gray-100"
              }`
            }
          >
            {item.icon}
            <span className={`flex-1 ${desktopCollapsed ? "md:hidden" : ""}`}>{item.label}</span>
            {!!item.badge && (
              <span className={`rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white ${desktopCollapsed ? "md:hidden" : ""}`}>
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
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
    <div className="flex h-screen bg-gray-50">
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
        <header className="flex h-16 items-center justify-between border-b bg-white px-4">
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

        <main className="flex-1 overflow-auto bg-gray-50 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SharedLayout;
