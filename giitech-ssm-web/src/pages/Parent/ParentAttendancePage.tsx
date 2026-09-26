import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { getParentProfileByUserId } from "../../services/ParentService";
import {
  fetchAttendanceByStudentIds,
  fetchStudentProfilesByIds,
} from "../../services/AcademicRecordService";
import { exportToCSV, exportToPDF } from "../Admin/reports/utils/reportExports";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { CalendarCheck2, FileDown, FileText } from "lucide-react";

interface Student {
  id: string;
  displayName: string;
  className?: string;
  stream?: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  date: string;
  status: "Present" | "Absent";
}

export default function ParentAttendancePage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAttendance = async () => {
      setLoading(true);
      try {
        // Find parent info
        const parentData = await getParentProfileByUserId(user.uid);

        if (parentData) {
          const studentIds = parentData.studentIds || [];

          // Fetch student details
          if (studentIds.length > 0) {
            const studentList = await fetchStudentProfilesByIds(studentIds) as Student[];
            setStudents(studentList);

            const attendanceList = await fetchAttendanceByStudentIds(studentIds);
            setAttendance(attendanceList);
          }
        }
      } catch (err) {
        console.error("Error fetching attendance:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [user]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-slate-500">
        Loading attendance data...
      </div>
    );

  // Calculate attendance percentage per student
  const summary = students.map((s) => {
    const records = attendance.filter((a) => a.studentId === s.id);
    const total = records.length;
    const present = records.filter((a) => a.status === "Present").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    return {
      name: s.displayName,
      className: s.className,
      stream: s.stream,
      percentage,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <CalendarCheck2 className="text-primary" /> Child Attendance
          </h1>
          <p className="text-slate-600 mt-1">
            Track attendance performance and download detailed records.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => exportToCSV(attendance, "AttendanceRecords")}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
          >
            <FileDown size={18} /> CSV
          </button>
          <button
            onClick={() => exportToPDF(attendance, "AttendanceRecords")}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      {/* Attendance Summary Cards */}
      {summary.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          {summary.map((s, idx) => (
            <div
              key={idx}
              className="bg-white rounded-2xl shadow p-5 border border-slate-100 hover:shadow-md transition"
            >
              <h3 className="text-lg font-semibold text-primary">
                {s.name}
              </h3>
              <p className="text-slate-600 text-sm mt-1">
                Class: {s.className || "—"} | Stream: {s.stream || "—"}
              </p>
              <p
                className={`mt-3 font-semibold ${
                  s.percentage >= 90
                    ? "text-green-600"
                    : s.percentage >= 70
                    ? "text-yellow-600"
                    : "text-red-600"
                }`}
              >
                Attendance: {s.percentage}%
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      <div className="bg-white shadow rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">
          Attendance Overview
        </h2>

        {summary.length ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={summary}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="percentage" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 italic text-center py-10">
            No attendance data available to display.
          </p>
        )}
      </div>

      {/* Detailed Attendance Table */}
      <div className="bg-white shadow rounded-2xl p-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">
          Attendance Records
        </h2>

        {attendance.length ? (
          <div className="overflow-x-auto">
            <table className="w-full border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left text-slate-700">Student</th>
                  <th className="px-4 py-2 text-left text-slate-700">Date</th>
                  <th className="px-4 py-2 text-left text-slate-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a) => (
                  <tr
                    key={a.id}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2">
                      {students.find((s) => s.id === a.studentId)?.displayName || "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(a.date).toLocaleDateString()}
                    </td>
                    <td
                      className={`px-4 py-2 font-semibold ${
                        a.status === "Present"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {a.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-500 italic">No attendance records found.</p>
        )}
      </div>
    </div>
  );
}
