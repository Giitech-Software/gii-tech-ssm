import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { exportToCSV, exportToPDF } from "../Admin/reports/utils/reportExports";
import {
  fetchAttendanceByStudentId,
  fetchStudentProfileByUserId,
} from "../../services/AcademicRecordService";

interface AttendanceRecord {
  id: string;
  date: string;
  status: "Present" | "Absent";
  className?: string;
  teacherName?: string;
}

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!user) return;

      try {
        const student = await fetchStudentProfileByUserId(user.uid);
        setAttendance(student ? await fetchAttendanceByStudentId(student.studentId) : []);
      } catch (error) {
        console.error("Error fetching attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [user]);

  // 🧮 Calculate summary
  const totalDays = attendance.length;
  const daysPresent = attendance.filter((r) => r.status === "Present").length;
  const attendancePercentage =
    totalDays > 0 ? ((daysPresent / totalDays) * 100).toFixed(1) : "0";

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">
        My Attendance 📅
      </h1>

      {loading ? (
        <p>Loading your attendance...</p>
      ) : attendance.length === 0 ? (
        <p className="text-slate-500">No attendance records found.</p>
      ) : (
        <>
          {/* Summary Header */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-700">
                Attendance Summary
              </h2>
              <p className="text-slate-600">
                Present: <span className="font-semibold text-green-600">{daysPresent}</span> /{" "}
                {totalDays} days (
                <span className="text-blue-600 font-semibold">
                  {attendancePercentage}%
                </span>
                )
              </p>
            </div>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => exportToCSV(attendance, "My_Attendance_Report")}
                className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
              >
                Export CSV
              </button>
              <button
                onClick={() => exportToPDF(attendance, "My_Attendance_Report")}
                className="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
              >
                Export PDF
              </button>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="overflow-x-auto bg-white shadow rounded-lg">
            <table className="min-w-full border border-slate-200 text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-2 border">Date</th>
                  <th className="px-4 py-2 border">Status</th>
                  <th className="px-4 py-2 border">Class</th>
                  <th className="px-4 py-2 border">Teacher</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 border">{record.date}</td>
                    <td
                      className={`px-4 py-2 border font-medium ${
                        record.status === "Present"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {record.status}
                    </td>
                    <td className="px-4 py-2 border">
                      {record.className || "—"}
                    </td>
                    <td className="px-4 py-2 border">
                      {record.teacherName || "—"}
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
