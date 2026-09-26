// src/pages/Student/StudentGradesPage.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { exportToCSV, exportToPDF } from "../Admin/reports/utils/reportExports";
import {
  fetchGradesByStudentId,
  fetchStudentProfileByUserId,
} from "../../services/AcademicRecordService";

interface GradeData {
  id: string;
  assignmentTitle: string;
  className: string;
  score: number;
  total: number;
  feedback?: string;
  teacherName?: string;
}

export default function StudentGradesPage() {
  const { user } = useAuth(); // ✅ use 'user', not 'currentUser'
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!user) return;

      try {
        const student = await fetchStudentProfileByUserId(user.uid);
        setGrades(student ? (await fetchGradesByStudentId(student.studentId)) as GradeData[] : []);
      } catch (error) {
        console.error("Error loading student grades:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [user]);

  const averageScore =
    grades.length > 0
      ? (
          grades.reduce((sum, g) => sum + ((g.score || 0) / (g.total || 100)) * 100, 0) /
          grades.length
        ).toFixed(2)
      : "0";

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <h1 className="text-3xl font-bold text-slate-800 mb-6">My grades</h1>

      {loading ? (
        <div className="text-slate-500 text-center mt-10">Loading your grades...</div>
      ) : grades.length === 0 ? (
        <p className="text-slate-500">No grades found yet.</p>
      ) : (
        <>
          {/* Summary + Export */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
            <h2 className="text-lg font-semibold text-slate-700">
              Overall Average:{" "}
              <span className="text-blue-600 font-bold">{averageScore}%</span>
            </h2>

            <div className="flex gap-2">
              <button
                onClick={() => exportToCSV(grades, "My_Grades_Report")}
                className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm transition"
              >
                Export CSV
              </button>
              <button
                onClick={() => exportToPDF(grades, "My_Grades_Report")}
                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm transition"
              >
                Export PDF
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto bg-white shadow-md rounded-xl border border-slate-200">
            <table className="min-w-full border-collapse">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-2 border text-left">Assignment</th>
                  <th className="px-4 py-2 border text-left">Class</th>
                  <th className="px-4 py-2 border text-center">Score</th>
                  <th className="px-4 py-2 border text-center">Total</th>
                  <th className="px-4 py-2 border text-left">Feedback</th>
                  <th className="px-4 py-2 border text-left">Teacher</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((grade) => (
                  <tr
                    key={grade.id}
                    className="hover:bg-slate-50 transition border-b last:border-none"
                  >
                    <td className="px-4 py-2 border">{grade.assignmentTitle || "—"}</td>
                    <td className="px-4 py-2 border">{grade.className || "—"}</td>
                    <td className="px-4 py-2 border text-center font-medium text-blue-700">
                      {grade.score ?? "—"}
                    </td>
                    <td className="px-4 py-2 border text-center">{grade.total ?? "—"}</td>
                    <td className="px-4 py-2 border text-slate-700">
                      {grade.feedback || "—"}
                    </td>
                    <td className="px-4 py-2 border text-slate-700">
                      {grade.teacherName || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
