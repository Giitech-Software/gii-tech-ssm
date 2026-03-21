// src/pages/Admin/SuperAdminDashboard.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
  Users,
  GraduationCap,
  UserCog,
  ShieldCheck,
  UserCircle,
  BarChart3,
  UserPlus, // 👈 added for create user card
} from "lucide-react";

interface UserData {
  role?: string;
  createdAt?: string;
}

interface Stats {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalAdmins: number;
  totalParents: number;
}

const AnimatedNumber: React.FC<{ value: number }> = ({ value }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame: number;
    const duration = 1000;
    const start = performance.now();

    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const current = Math.floor(progress * value);
      setDisplay(current);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <span>{display.toLocaleString()}</span>;
};

const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalTeachers: 0,
    totalStudents: 0,
    totalAdmins: 0,
    totalParents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"));
        const users: UserData[] = snapshot.docs.map((doc) => doc.data() as UserData);

        const safeCount = (role: string) =>
          users.filter((u) => u?.role?.toLowerCase() === role).length || 0;

        setStats({
          totalUsers: users.length || 0,
          totalTeachers: safeCount("teacher"),
          totalStudents: safeCount("student"),
          totalAdmins: safeCount("admin"),
          totalParents: safeCount("parent"),
        });
        setLastUpdated(new Date());
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // 🔗 Dashboard cards
  const cards = [
    {
      title: "Reports Overview",
      value: 0,
      color: "from-yellow-500 to-yellow-700",
      icon: <BarChart3 className="h-6 w-6 text-yellow-100" />,
      route: "/admin/reports",
    },
   {
  title: "Create New User",
  value: 0,
  color: "from-orange-500 to-orange-700",
  icon: <UserPlus className="h-6 w-6 text-orange-100" />,
  route: "/superadmin/create-user", // ✅ correct route
},

    {
      title: "Total Users",
      value: stats.totalUsers,
      color: "from-indigo-500 to-indigo-700",
      icon: <Users className="h-6 w-6 text-indigo-100" />,
      route: "/admin/users",
    },
    {
      title: "Total Teachers",
      value: stats.totalTeachers,
      color: "from-blue-500 to-blue-700",
      icon: <UserCog className="h-6 w-6 text-blue-100" />,
      route: "/admin/users/teachers",
    },
    {
      title: "Total Students",
      value: stats.totalStudents,
      color: "from-green-500 to-green-700",
      icon: <GraduationCap className="h-6 w-6 text-green-100" />,
      route: "/admin/users/students",
    },
    {
      title: "Total Admins",
      value: stats.totalAdmins,
      color: "from-purple-500 to-purple-700",
      icon: <ShieldCheck className="h-6 w-6 text-purple-100" />,
      route: "/admin/users/admins",
    },
    {
      title: "Total Parents",
      value: stats.totalParents,
      color: "from-pink-500 to-pink-700",
      icon: <UserCircle className="h-6 w-6 text-pink-100" />,
      route: "/admin/users/parents",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Super Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Welcome, <span className="font-semibold">{user?.displayName || "Super Admin"}</span>
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-700"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 mb-6">
            {cards.map((card) => (
              <button
                key={card.title}
                onClick={() => card.route && navigate(card.route)}
                className={`bg-gradient-to-br ${card.color} text-white rounded-2xl shadow p-6 hover:shadow-xl hover:-translate-y-1 transition transform focus:outline-none focus:ring-4 focus:ring-opacity-50`}
              >
                <div className="flex justify-between items-center">
                  <div className="text-left">
                    <h2 className="text-sm font-medium opacity-80">{card.title}</h2>
                    {card.value > 0 && (
                      <p className="text-3xl font-bold mt-2">
                        <AnimatedNumber value={card.value} />
                      </p>
                    )}
                  </div>
                  <div className="bg-white/10 p-3 rounded-xl">{card.icon}</div>
                </div>
              </button>
            ))}
          </div>

          {lastUpdated && (
            <div className="text-center text-gray-500 text-lg border-t border-gray-200 pt-4">
              Last updated:{" "}
              <span className="font-medium text-gray-600">
                {lastUpdated.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
