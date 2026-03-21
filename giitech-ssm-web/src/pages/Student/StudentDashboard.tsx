import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../firebaseConfig";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  BookOpen,
  ClipboardList,
  Award,
  CalendarCheck,
  FileText,
  LogOut,
} from "lucide-react";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [studentData, setStudentData] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // ✅ 1. Fetch student record by userId
        const studentQuery = query(
          collection(db, "students"),
          where("userId", "==", user.uid)
        );
        const studentSnap = await getDocs(studentQuery);

        if (!studentSnap.empty) {
          const studentDoc = studentSnap.docs[0];
          const studentInfo = studentDoc.data();
          setStudentData(studentInfo);

          const classId = studentInfo.classId;

          // ✅ 2. Fetch class by classId field
          if (classId) {
            const classQuery = query(
              collection(db, "classes"),
              where("classId", "==", classId)
            );
            const classSnap = await getDocs(classQuery);
            const classList = classSnap.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            }));
            setClasses(classList);

            // ✅ 3. Fetch assignments for this class
            const assignmentQuery = query(
              collection(db, "assignments"),
              where("classId", "==", classId)
            );
            const assignmentSnap = await getDocs(assignmentQuery);
            setAssignments(
              assignmentSnap.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }))
            );
          }

          // ✅ 4. Fetch grades by studentId
          const gradeQuery = query(
            collection(db, "grades"),
            where("studentId", "==", studentInfo.studentId)
          );
          const gradeSnap = await getDocs(gradeQuery);
          setGrades(gradeSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));

          // ✅ 5. Fetch attendance by studentId
          const attendanceQuery = query(
            collection(db, "attendance"),
            where("studentId", "==", studentInfo.studentId)
          );
          const attendanceSnap = await getDocs(attendanceQuery);
          setAttendance(
            attendanceSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          );
        } else {
          console.warn("⚠️ No student record found for user:", user.uid);
        }
      } catch (error) {
        console.error("Error loading student dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        Loading your dashboard...
      </div>
    );

  if (!studentData)
    return <div className="p-6 text-red-500">No student data found.</div>;

  const stats = [
    {
      label: "Classes",
      value: classes.length,
      icon: BookOpen,
      color: "from-blue-500 to-blue-400",
    },
    {
      label: "Assignments",
      value: assignments.length,
      icon: ClipboardList,
      color: "from-amber-500 to-amber-400",
    },
    {
      label: "Grades",
      value: grades.length,
      icon: Award,
      color: "from-green-500 to-green-400",
    },
    {
      label: "Attendance",
      value: attendance.length,
      icon: CalendarCheck,
      color: "from-purple-500 to-purple-400",
    },
  ];

  const quickLinks = [
    {
      title: "My Assignments",
      icon: ClipboardList,
      color: "bg-indigo-100 text-indigo-600",
      path: "/student/assignments",
    },
    {
      title: "My Submissions",
      icon: FileText,
      color: "bg-green-100 text-green-600",
      path: "/student/submissions",
    },
    {
      title: "My Grades",
      icon: Award,
      color: "bg-yellow-100 text-yellow-600",
      path: "/student/grades",
    },
    {
      title: "My Attendance",
      icon: CalendarCheck,
      color: "bg-blue-100 text-blue-600",
      path: "/student/attendance",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome, {studentData.displayName || "Student"} 🎓
          </h1>
          <p className="text-gray-600 mt-2">
            ID: {studentData.studentId || "N/A"} | Email: {studentData.email}
          </p>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
        >
          <LogOut size={18} /> Logout
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((item, i) => (
          <div
            key={i}
            className={`rounded-2xl shadow hover:shadow-xl transition transform hover:-translate-y-1 bg-gradient-to-r ${item.color} text-white p-6`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-medium opacity-90">{item.label}</h2>
                <p className="text-3xl font-bold mt-1">{item.value}</p>
              </div>
              <div className="bg-white/20 p-3 rounded-xl">
                <item.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {quickLinks.map((link, i) => (
          <div
            key={i}
            onClick={() => navigate(link.path)}
            className="cursor-pointer flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow hover:shadow-md transition border border-gray-100"
          >
            <div className={`${link.color} p-3 rounded-xl mb-3`}>
              <link.icon size={26} />
            </div>
            <h2 className="font-medium text-gray-700">{link.title}</h2>
          </div>
        ))}
      </div>

      {/* Detailed Sections */}
      <div className="space-y-8">
        <Section title="Your Class">
          {classes.length ? (
            <ul className="list-disc ml-5">
              {classes.map((cls) => (
                <li key={cls.id}>
                  {cls.name || "Unnamed Class"}{" "}
                  <span className="text-gray-500 text-sm">
                    ({cls.classId})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="No class assigned yet." />
          )}
        </Section>

        <Section title="Assignments">
          {assignments.length ? (
            <ul className="list-disc ml-5">
              {assignments.map((a) => (
                <li key={a.id}>{a.title || "Untitled Assignment"}</li>
              ))}
            </ul>
          ) : (
            <Empty text="No assignments yet." />
          )}
        </Section>

        <Section title="Grades">
          {grades.length ? (
            <ul className="list-disc ml-5">
              {grades.map((g) => (
                <li key={g.id}>
                  {g.subject || "Subject"}:{" "}
                  <span className="font-bold">{g.score}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="No grades yet." />
          )}
        </Section>

        <Section title="Attendance">
          {attendance.length ? (
            <ul className="list-disc ml-5">
              {attendance.map((a) => (
                <li key={a.id}>
                  {a.date}:{" "}
                  <span
                    className={`capitalize font-medium ${
                      a.status === "Present"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {a.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty text="No attendance yet." />
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
    <div className="bg-white shadow rounded-xl p-4">{children}</div>
  </section>
);

const Empty = ({ text }: { text: string }) => (
  <p className="text-gray-500 italic">{text}</p>
);
