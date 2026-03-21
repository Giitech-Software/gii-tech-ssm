import { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../contexts/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { exportToCSV, exportToPDF } from "../Admin/reports/utils/reportExports";
import { BarChart3, FileDown, FileText } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface Student {
  id: string;
  name: string;
  className?: string;
  stream?: string;
}

interface Grade {
  id: string;
  studentId: string;
  studentName?: string;
  subject: string;
  score: number;
  date?: string;
}

export default function ParentPerformancePage() {
  const { user } = useAuth();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchPerformance = async () => {
      setLoading(true);
      try {
        // Get parent info
        const parentRef = collection(db, "parents");
        const parentQuery = query(parentRef, where("__name__", "==", user.uid));
        const parentSnap = await getDocs(parentQuery);

        if (!parentSnap.empty) {
          const parentData = parentSnap.docs[0].data();
          const studentIds = parentData.studentIds || [];

          // Fetch linked students
          if (studentIds.length > 0) {
            const studentQuery = query(
              collection(db, "students"),
              where("__name__", "in", studentIds)
            );
            const studentSnaps = await getDocs(studentQuery);
            const studentList = studentSnaps.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Student[];
            setStudents(studentList);

            // Fetch grades for linked students
            const gradeQuery = query(
              collection(db, "grades"),
              where("studentId", "in", studentIds)
            );
            const gradeSnaps = await getDocs(gradeQuery);
            const gradeList = gradeSnaps.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
            })) as Grade[];
            setGrades(gradeList);
          }
        }
      } catch (error) {
        console.error("Error loading performance data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPerformance();
  }, [user]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        Loading performance data...
      </div>
    );

  // Group grades by subject for chart
  const chartData = grades.map((grade) => ({
    studentName: grade.studentName || grade.studentId,
    subject: grade.subject || "Unknown",
    score: grade.score || 0,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Child Performance Reports 📈
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor and export your child’s academic progress.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => exportToCSV(grades, "StudentPerformance")}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
          >
            <FileDown size={18} /> CSV
          </button>
          <button
            onClick={() => exportToPDF(grades, "StudentPerformance")}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      {/* Student Summary Cards */}
      {students.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {students.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl shadow p-5 border border-gray-100 hover:shadow-md transition"
            >
              <h3 className="text-lg font-semibold text-indigo-700">
                {s.name}
              </h3>
              <p className="text-gray-600 text-sm mt-1">
                Class: {s.className || "—"} | Stream: {s.stream || "—"}
              </p>
              <p className="text-gray-500 text-xs mt-2">
                Total Subjects:{" "}
                {grades.filter((g) => g.studentId === s.id).length}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chart Section */}
      <div className="bg-white shadow rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <BarChart3 className="text-indigo-600" /> Performance Overview
        </h2>
        {chartData.length ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="subject" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="score" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 italic text-center py-10">
            No grade data available to display.
          </p>
        )}
      </div>

      {/* Detailed Grade Table */}
      <div className="bg-white shadow rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Detailed Grade Records
        </h2>

        {grades.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700">Student</th>
                  <th className="px-4 py-2 text-left text-gray-700">Subject</th>
                  <th className="px-4 py-2 text-left text-gray-700">Score</th>
                  <th className="px-4 py-2 text-left text-gray-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr
                    key={g.id}
                    className="border-t border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2">
                      {g.studentName ||
                        students.find((s) => s.id === g.studentId)?.name ||
                        "—"}
                    </td>
                    <td className="px-4 py-2">{g.subject || "N/A"}</td>
                    <td className="px-4 py-2 font-semibold text-indigo-600">
                      {g.score ?? "N/A"}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {g.date || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 italic">No grade records found.</p>
        )}
      </div>
    </div>
  );
}
