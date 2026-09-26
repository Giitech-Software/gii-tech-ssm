import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getParentProfileByUserId } from "../../services/ParentService";
import {
  fetchGradesByStudentIds,
  fetchStudentProfilesByIds,
} from "../../services/AcademicRecordService";
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
  displayName: string;
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
        const parentData = await getParentProfileByUserId(user.uid);

        if (parentData) {
          const studentIds = parentData.studentIds || [];

          // Fetch linked students
          if (studentIds.length > 0) {
            const studentList = await fetchStudentProfilesByIds(studentIds) as Student[];
            setStudents(studentList);

            const gradeList = await fetchGradesByStudentIds(studentIds) as Grade[];
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
      <div className="flex justify-center items-center h-screen text-slate-500">
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
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            Child Performance Reports 📈
          </h1>
          <p className="text-slate-600 mt-1">
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
              className="bg-white rounded-2xl shadow p-5 border border-slate-100 hover:shadow-md transition"
            >
              <h3 className="text-lg font-semibold text-primary">
                {s.displayName}
              </h3>
              <p className="text-slate-600 text-sm mt-1">
                Class: {s.className || "—"} | Stream: {s.stream || "—"}
              </p>
              <p className="text-slate-500 text-xs mt-2">
                Total Subjects:{" "}
                {grades.filter((g) => g.studentId === s.id).length}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chart Section */}
      <div className="bg-white shadow rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 className="text-primary" /> Performance Overview
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
          <p className="text-slate-500 italic text-center py-10">
            No grade data available to display.
          </p>
        )}
      </div>

      {/* Detailed Grade Table */}
      <div className="bg-white shadow rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">
          Detailed Grade Records
        </h2>

        {grades.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left text-slate-700">Student</th>
                  <th className="px-4 py-2 text-left text-slate-700">Subject</th>
                  <th className="px-4 py-2 text-left text-slate-700">Score</th>
                  <th className="px-4 py-2 text-left text-slate-700">Date</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g) => (
                  <tr
                    key={g.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2">
                      {g.studentName ||
                        students.find((s) => s.id === g.studentId)?.displayName ||
                        "—"}
                    </td>
                    <td className="px-4 py-2">{g.subject || "N/A"}</td>
                    <td className="px-4 py-2 font-semibold text-primary">
                      {g.score ?? "N/A"}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {g.date || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 italic">No grade records found.</p>
        )}
      </div>
    </div>
  );
}
