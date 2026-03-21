/**
 * components/SharedLayout.tsx
 *
 * Shared layout (Topbar + Sidebar + Logout)
 * for Giitech Smart School Manager (Giitech-SSM)
 */

import React, { useState, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
// 🔹 STUDENT ───────────────────────────
// 🔹 STUDENT ───────────────────────────
import {
  Menu,
  Home,
  Users,
  BookOpen,
  Building,
  GraduationCap,
  Calendar,
  DollarSign,
  LogOut,
  Layers,
  FileBarChart2,
  UserCog,
  ClipboardList,
  MessageCircle,
  ChevronDown,
  ChevronRight,
  FileText,     // ✅ Add this (for Assignments)
  UploadCloud,  // ✅ Add this (for Submissions)
} from "lucide-react";

import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

type NavItem = {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  badge?: number;
};

const SharedLayout: React.FC = () => {
  const [open, setOpen] = useState(true);
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const displayName = user?.displayName || user?.email || "User";

  // 🔹 Listen for unread messages
  useEffect(() => {
    if (!user?.email) return;

    const q = query(
      collection(db, "messages"),
      where("participants", "array-contains", user.email)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      let unread = 0;
      snapshot.forEach((doc) => {
        const data = doc.data() as any;
        const lastMsg = data.lastMessage;
        if (
          lastMsg &&
          lastMsg.sender !== user.email &&
          !lastMsg.readBy?.includes(user.email)
        ) {
          unread++;
        }
      });
      setUnreadCount(unread);
    });

    return () => unsub();
  }, [user?.email]);

  // 🔹 Base Nav Items
  const NAV_ITEMS: NavItem[] = [
    { to: "/", label: "Dashboard", icon: <Home size={18} /> },

    // ─── ADMIN / SUPERADMIN ───────────────────────────
    { to: "/admin/departments", label: "Departments", icon: <Building size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/classes", label: "Classes", icon: <Layers size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/streams", label: "Streams", icon: <Layers size={18} />, roles: ["superadmin", "admin"] },
    { to: "/students", label: "Students", icon: <GraduationCap size={18} />, roles: ["superadmin", "admin", "teacher"] },
    { to: "/teachers", label: "Teachers", icon: <Users size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/attendance", label: "Attendance", icon: <Calendar size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/fees", label: "Fees", icon: <DollarSign size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/users", label: "User Management", icon: <UserCog size={18} />, roles: ["superadmin", "admin"] },
    { to: "/admin/reports", label: "Reports", icon: <FileBarChart2 size={18} />, roles: ["superadmin", "admin"] },

    // ─── TEACHER ───────────────────────────
    { to: "/teacher/classes", label: "My Classes", icon: <Layers size={18} />, roles: ["teacher"] },
    { to: "/teacher/students", label: "My Students", icon: <GraduationCap size={18} />, roles: ["teacher"] },
    { to: "/teacher/attendance", label: "Attendance", icon: <Calendar size={18} />, roles: ["teacher"] },
    { to: "/teacher/grades", label: "Grades", icon: <ClipboardList size={18} />, roles: ["teacher"] },
    { to: "/teacher/messages", label: "Messages", icon: <MessageCircle size={18} />, roles: ["teacher"], badge: unreadCount },

    // ─── STUDENT ───────────────────────────
{
  to: "/student/assignments",
  label: "Assignments",
  icon: <FileText size={18} />,
  roles: ["student"],
},
{
  to: "/student/submissions",
  label: "Submissions",
  icon: <UploadCloud size={18} />,
  roles: ["student"],
},
{
  to: "/student/grades",
  label: "My Grades",
  icon: <ClipboardList size={18} />,
  roles: ["student"],
},
{
  to: "/student/attendance",
  label: "My Attendance",
  icon: <Calendar size={18} />,
  roles: ["student"],
},

    // ─── PARENT ───────────────────────────
    { to: "/parent/ward", label: "Ward Info", icon: <BookOpen size={18} />, roles: ["parent"] },
    { to: "/parent/messages", label: "Messages", icon: <MessageCircle size={18} />, roles: ["parent"], badge: unreadCount },
  ];

  const roleTitles: Record<string, string> = {
    superadmin: "SuperAdmin Dashboard",
    admin: "Admin Panel",
    teacher: "Teacher Dashboard",
    student: "Student Dashboard",
    parent: "Parent Portal",
  };

  const handleLogout = async () => {
    try {
      if (logout) await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // 🔹 Group items by role
  const groupedMenus = {
    admin: NAV_ITEMS.filter((i) => i.roles?.includes("superadmin") || i.roles?.includes("admin")),
    teacher: NAV_ITEMS.filter((i) => i.roles?.includes("teacher")),
    student: NAV_ITEMS.filter((i) => i.roles?.includes("student")),
    parent: NAV_ITEMS.filter((i) => i.roles?.includes("parent")),
  };

  const [collapsed, setCollapsed] = useState({
    admin: true,
    teacher: true,
    student: true,
    parent: true,
  });

  const toggleGroup = (group: keyof typeof collapsed) =>
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }));

  const roleTitle = roleTitles[role || ""] || "Dashboard";

  // ────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r transition-all duration-200 hidden md:flex md:flex-col ${
          open ? "w-64" : "w-20"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="px-4 py-6 flex items-center gap-3 border-b">
            <div className="text-xl font-bold">Giitech-SSM</div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-2 overflow-auto">
            {/* Always show Dashboard */}
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-medium"
                    : "text-gray-700"
                }`
              }
            >
              <Home size={18} />
              <span className={`${open ? "inline" : "hidden"}`}>Dashboard</span>
            </NavLink>

            {/* ─── Role-based Groups ─── */}
            {role === "superadmin" || role === "admin" ? (
              <div>
                <button
                  onClick={() => toggleGroup("admin")}
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 px-3 py-2 hover:bg-gray-100 rounded-md"
                >
                  <span>{open && "Admin Menu"}</span>
                  {open &&
                    (collapsed.admin ? (
                      <ChevronRight size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    ))}
                </button>

                {!collapsed.admin && (
                  <div className="ml-2 mt-1 space-y-1">
                    {groupedMenus.admin.map((item) => (
                      <NavLink
                        to={item.to}
                        key={item.to}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition ${
                            isActive
                              ? "bg-indigo-50 text-indigo-700 font-medium"
                              : "text-gray-700"
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span className={`${open ? "inline" : "hidden"}`}>
                            {item.label}
                          </span>
                        </div>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {role === "teacher" ? (
              <div>
                <button
                  onClick={() => toggleGroup("teacher")}
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 px-3 py-2 hover:bg-gray-100 rounded-md"
                >
                  <span>{open && "Teacher Menu"}</span>
                  {open &&
                    (collapsed.teacher ? (
                      <ChevronRight size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    ))}
                </button>

                {!collapsed.teacher && (
                  <div className="ml-2 mt-1 space-y-1">
                    {groupedMenus.teacher.map((item) => (
                      <NavLink
                        to={item.to}
                        key={item.to}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition ${
                            isActive
                              ? "bg-indigo-50 text-indigo-700 font-medium"
                              : "text-gray-700"
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span className={`${open ? "inline" : "hidden"}`}>
                            {item.label}
                          </span>
                        </div>
                        {item.badge && item.badge > 0 && (
                          <span className="ml-auto text-xs font-bold text-white bg-red-500 rounded-full px-2 py-0.5">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {role === "student" ? (
              <div>
                <button
                  onClick={() => toggleGroup("student")}
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 px-3 py-2 hover:bg-gray-100 rounded-md"
                >
                  <span>{open && "Student Menu"}</span>
                  {open &&
                    (collapsed.student ? (
                      <ChevronRight size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    ))}
                </button>

                {!collapsed.student && (
                  <div className="ml-2 mt-1 space-y-1">
                    {groupedMenus.student.map((item) => (
                      <NavLink
                        to={item.to}
                        key={item.to}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition ${
                            isActive
                              ? "bg-indigo-50 text-indigo-700 font-medium"
                              : "text-gray-700"
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span className={`${open ? "inline" : "hidden"}`}>
                            {item.label}
                          </span>
                        </div>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {role === "parent" ? (
              <div>
                <button
                  onClick={() => toggleGroup("parent")}
                  className="flex items-center justify-between w-full text-sm font-semibold text-gray-700 px-3 py-2 hover:bg-gray-100 rounded-md"
                >
                  <span>{open && "Parent Menu"}</span>
                  {open &&
                    (collapsed.parent ? (
                      <ChevronRight size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    ))}
                </button>

                {!collapsed.parent && (
                  <div className="ml-2 mt-1 space-y-1">
                    {groupedMenus.parent.map((item) => (
                      <NavLink
                        to={item.to}
                        key={item.to}
                        className={({ isActive }) =>
                          `flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-gray-100 transition ${
                            isActive
                              ? "bg-indigo-50 text-indigo-700 font-medium"
                              : "text-gray-700"
                          }`
                        }
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span className={`${open ? "inline" : "hidden"}`}>
                            {item.label}
                          </span>
                        </div>
                        {item.badge && item.badge > 0 && (
                          <span className="ml-auto text-xs font-bold text-white bg-red-500 rounded-full px-2 py-0.5">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </nav>

          {/* Collapse Sidebar Button */}
          <div className="px-4 py-4 border-t">
            <button
              onClick={() => setOpen((s) => !s)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-gray-100"
            >
              <Menu size={16} />
              <span className={`${open ? "inline" : "hidden"}`}>Collapse</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="h-14 bg-white flex items-center justify-between px-4 border-b">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden p-2 rounded-md"
              onClick={() => setOpen((s) => !s)}
            >
              <Menu size={18} />
            </button>
            <div className="text-lg font-semibold hidden md:block">
              {roleTitle}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600 hidden sm:flex flex-col sm:items-end">
              <span className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    role === "superadmin"
                      ? "bg-purple-100 text-purple-700"
                      : role === "admin"
                      ? "bg-blue-100 text-blue-700"
                      : role === "teacher"
                      ? "bg-green-100 text-green-700"
                      : role === "student"
                      ? "bg-yellow-100 text-yellow-700"
                      : role === "parent"
                      ? "bg-pink-100 text-pink-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {role ? role.charAt(0).toUpperCase() + role.slice(1) : "User"}
                </span>
                •
                <span className="font-medium text-gray-800">
                  {displayName}
                </span>
              </span>
            </div>

            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-gray-100"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline text-sm">Logout</span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 overflow-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SharedLayout;
