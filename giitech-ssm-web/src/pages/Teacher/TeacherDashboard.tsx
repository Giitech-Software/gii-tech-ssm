import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  ClipboardList,
  FileText,
  BarChart3,
  Users,
  BookOpen,
  LogOut,
  Layers,
  Clock,
  Award,
  Activity,
} from "lucide-react";
import { db } from "../../firebaseConfig";
import { collection, onSnapshot, query, where } from "firebase/firestore";

// 🔹 Small reusable component for stat cards
const StatCard = ({ icon, title, value, gradient }: any) => (
  <div
    className={`bg-gradient-to-br ${gradient} text-white rounded-2xl shadow-md p-6 flex flex-col justify-between`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    <p className="text-3xl font-bold mt-3">{value}</p>
  </div>
);

// 🔹 Reusable component for navigation cards
const NavCard = ({ icon, title, desc, onClick }: any) => (
  <div
    onClick={onClick}
    className="cursor-pointer bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all p-6 border border-gray-100 group"
  >
    <div className="flex items-center gap-3 mb-3">
      <div className="bg-gray-100 p-3 rounded-xl group-hover:bg-indigo-50 transition">
        {icon}
      </div>
      <h2 className="font-semibold text-lg text-gray-800 group-hover:text-indigo-700">
        {title}
      </h2>
    </div>
    <p className="text-gray-600 text-sm">{desc}</p>
  </div>
);

export default function TeacherDashboard() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalAssignments: 0,
    activeAssignments: 0,
    pendingSubmissions: 0,
    averageGrade: 0,
  });

  // ✅ Listen for assignments and submissions
  useEffect(() => {
    if (!user) return;

    const assignmentsQuery = query(
      collection(db, "assignments"),
      where("teacherId", "==", user.uid)
    );

    const unsubAssignments = onSnapshot(assignmentsQuery, (snapshot) => {
      const assignments = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ✅ Compute Active Assignments (dueDate > now)
      const activeAssignments = assignments.filter((a: any) => {
        const due =
          typeof a.dueDate?.toDate === "function"
            ? a.dueDate.toDate()
            : new Date(a.dueDate);
        return due > new Date();
      }).length;

      // ✅ Update assignment stats immediately
      setStats((prev) => ({
        ...prev,
        totalAssignments: assignments.length,
        activeAssignments,
      }));

      // 🔹 Listen to submissions for these assignments
      const unsubSubmissions = onSnapshot(collection(db, "submissions"), (subSnap) => {
        const submissions = subSnap.docs
          .map((doc) => doc.data())
          .filter((s: any) => assignments.some((a) => a.id === s.assignmentId));

        const pendingSubmissions = submissions.filter(
          (s: any) => s.status !== "graded"
        ).length;

        const gradedSubmissions = submissions.filter(
          (s: any) => s.status === "graded"
        );

        const averageGrade =
          gradedSubmissions.length > 0
            ? gradedSubmissions.reduce(
                (acc: number, s: any) => acc + (s.grade || 0),
                0
              ) / gradedSubmissions.length
            : 0;

        setStats((prev) => ({
          ...prev,
          pendingSubmissions,
          averageGrade: Number(averageGrade.toFixed(1)),
        }));
      });

      return () => unsubSubmissions();
    });

    return () => unsubAssignments();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // 🔹 Dashboard menu items
  const menuItems = [
    {
      title: "Manage Assignments",
      desc: "Create, edit, and track your assignments.",
      icon: <ClipboardList className="text-indigo-600" size={24} />,
      path: "/teacher/assignments",
    },
    {
      title: "View Submissions",
      desc: "Review and grade student submissions.",
      icon: <FileText className="text-green-600" size={24} />,
      path: "/teacher/submissions",
    },
    {
      title: "Enter Grades",
      desc: "Record and manage student grades.",
      icon: <BookOpen className="text-amber-600" size={24} />,
      path: "/teacher/grades",
    },
    {
      title: "Grade Summary Reports",
      desc: "View analytics and export grade reports.",
      icon: <BarChart3 className="text-blue-600" size={24} />,
      path: "/teacher/grade-summary",
    },
    {
      title: "Student Overview",
      desc: "View students by class or stream.",
      icon: <Users className="text-purple-600" size={24} />,
      path: "/teacher/students",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-indigo-700">Teacher Dashboard 📚</h1>
          <p className="text-gray-600 mt-1">
            Manage your teaching activities efficiently.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
        >
          <LogOut size={18} /> Logout
        </button>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-10">
        <StatCard
          icon={<Layers size={28} />}
          title="Total Assignments"
          value={stats.totalAssignments}
          gradient="from-indigo-500 to-indigo-600"
        />
        <StatCard
          icon={<Activity size={28} />}
          title="Active Assignments"
          value={stats.activeAssignments}
          gradient="from-green-500 to-emerald-600"
        />
        <StatCard
          icon={<Clock size={28} />}
          title="Pending Submissions"
          value={stats.pendingSubmissions}
          gradient="from-yellow-500 to-orange-500"
        />
        <StatCard
          icon={<Award size={28} />}
          title="Average Grade"
          value={stats.averageGrade ? `${stats.averageGrade}%` : "—"}
          gradient="from-blue-500 to-indigo-600"
        />
      </div>

      {/* Navigation Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item, idx) => (
          <NavCard
            key={idx}
            icon={item.icon}
            title={item.title}
            desc={item.desc}
            onClick={() => navigate(item.path)}
          />
        ))}
      </div>
    </div>
  );
}
