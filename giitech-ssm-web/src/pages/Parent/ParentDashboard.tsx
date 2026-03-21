// src/pages/Parent/ParentDashboard.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../firebaseConfig";
import { useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  Users,
  Award,
  CalendarCheck,
  FileText,
  Bell,
  MessageCircle,
  LogOut,
  BarChart3,
} from "lucide-react";

export default function ParentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [parentData, setParentData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchParentData = async () => {
      setLoading(true);
      try {
        // Fetch parent info
        const parentRef = doc(db, "parents", user.uid);
        const parentSnap = await getDoc(parentRef);

        if (parentSnap.exists()) {
          const parentInfo = parentSnap.data();
          setParentData(parentInfo);

          const studentIds: string[] = parentInfo.studentIds || [];

          if (studentIds.length > 0) {
            // Fetch linked students
            const studentQuery = query(
              collection(db, "students"),
              where("__name__", "in", studentIds)
            );
            const studentSnaps = await getDocs(studentQuery);
            const studentList = studentSnaps.docs.map((d) => ({
              id: d.id,
              ...d.data(),
            }));
            setStudents(studentList);

            // Fetch grades
            const gradeQuery = query(
              collection(db, "grades"),
              where("studentId", "in", studentIds)
            );
            const gradeSnaps = await getDocs(gradeQuery);
            setGrades(gradeSnaps.docs.map((d) => ({ id: d.id, ...d.data() })));

            // Fetch attendance
            const attendanceQuery = query(
              collection(db, "attendance"),
              where("studentId", "in", studentIds)
            );
            const attendanceSnaps = await getDocs(attendanceQuery);
            setAttendance(
              attendanceSnaps.docs.map((d) => ({ id: d.id, ...d.data() }))
            );
          }
        }
      } catch (error) {
        console.error("Error fetching parent dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchParentData();
  }, [user]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-600 animate-pulse">
        Loading your dashboard...
      </div>
    );

  if (!parentData)
    return (
      <div className="p-6 text-red-600 text-center">
        No parent record found. Please contact the administrator.
      </div>
    );

  // Summaries
  const totalStudents = students.length;
  const totalGrades = grades.length;
  const totalAttendance = attendance.length;
  const presentCount = attendance.filter((a) => a.status === "Present").length;
  const attendanceRate =
    totalAttendance > 0
      ? Math.round((presentCount / totalAttendance) * 100)
      : 0;

  // Dashboard Stats
  const stats = [
    {
      label: "Children Linked",
      value: totalStudents,
      icon: Users,
      color: "from-blue-500 to-cyan-400",
    },
    {
      label: "Grades Recorded",
      value: totalGrades,
      icon: Award,
      color: "from-green-500 to-emerald-400",
    },
    {
      label: "Attendance Rate",
      value: `${attendanceRate}%`,
      icon: CalendarCheck,
      color: "from-purple-500 to-pink-400",
    },
  ];

  // Quick Navigation
  const quickLinks = [
    {
      title: "Performance Reports",
      icon: BarChart3,
      color: "bg-indigo-100 text-indigo-600",
      path: "/parent/performance",
    },
    {
      title: "Attendance Overview",
      icon: CalendarCheck,
      color: "bg-green-100 text-green-600",
      path: "/parent/attendance",
    },
    {
      title: "Messages",
      icon: MessageCircle,
      color: "bg-sky-100 text-sky-600",
      path: "/parent/messages",
    },
    {
      title: "General Reports",
      icon: FileText,
      color: "bg-violet-100 text-violet-600",
      path: "/parent/reports",
    },
    {
      title: "Notifications",
      icon: Bell,
      color: "bg-yellow-100 text-yellow-600",
      path: "/parent/notifications",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, {parentData.displayName || "Parent"} 👋
          </h1>
          <p className="text-gray-600 mt-1">
            Email: {parentData?.email || user?.email || "N/A"}
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`rounded-2xl shadow hover:shadow-xl transition transform hover:-translate-y-1 bg-gradient-to-r ${stat.color} text-white p-6`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-medium opacity-90">{stat.label}</h2>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
        {quickLinks.map((link, i) => (
          <div
            key={i}
            onClick={() => navigate(link.path)}
            className="cursor-pointer flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow hover:shadow-md transition border border-gray-100 hover:-translate-y-1"
          >
            <div className={`${link.color} p-3 rounded-xl mb-3`}>
              <link.icon size={26} />
            </div>
            <h2 className="font-medium text-gray-700 text-center">
              {link.title}
            </h2>
          </div>
        ))}
      </div>

      {/* Linked Students */}
      <div className="space-y-8">
        <Section title="Linked Students">
          {students.length > 0 ? (
            <ul className="list-disc ml-5">
              {students.map((stu) => (
                <li key={stu.id}>
                  <span className="font-semibold">{stu.displayName}</span> —{" "}
                  <span className="text-gray-500">
                    {stu.className || "No class assigned"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="No linked students yet." />
          )}
        </Section>

        <Section title="Recent Grades">
          {grades.length > 0 ? (
            <ul className="list-disc ml-5">
              {grades.slice(0, 5).map((g) => (
                <li key={g.id}>
                  {g.studentName || g.studentId}:{" "}
                  <span className="font-semibold">{g.subject}</span> — {g.score}
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="No grades available yet." />
          )}
        </Section>

        <Section title="Recent Attendance">
          {attendance.length > 0 ? (
            <ul className="list-disc ml-5">
              {attendance.slice(0, 5).map((a) => (
                <li key={a.id}>
                  {a.studentName || a.studentId}: {a.date} —{" "}
                  <span
                    className={`capitalize font-medium ${
                      a.status === "Present" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="No attendance records found." />
          )}
        </Section>
      </div>
    </div>
  );
}

/* 🔹 Helper Components */
const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section>
    <h2 className="text-xl font-semibold text-gray-800 mb-3">{title}</h2>
    <div className="bg-white shadow rounded-xl p-5">{children}</div>
  </section>
);

const Empty = ({ text }: { text: string }) => (
  <p className="text-gray-500 italic">{text}</p>
);
