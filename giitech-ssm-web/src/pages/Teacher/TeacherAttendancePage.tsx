import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Label,
} from "recharts";
import {
  getAttendanceByClass,
  markAttendanceForClass,
  getStudentsByClass, // ✅ new helper (add this to AttendanceService or StudentService)
} from "../../services/AttendanceService";
import { fetchClasses } from "../../services/ClassService";
import { exportToCSV, exportToPDF } from "../Admin/reports/utils/reportExports";

export default function TeacherAttendancePage() {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [classOptions, setClassOptions] = useState<{ id: string; name?: string; classId?: string }[]>([]);

  useEffect(() => {
    fetchClasses()
      .then((classes) => setClassOptions(classes as { id: string; name?: string; classId?: string }[]))
      .catch((err) => {
        console.error("Failed to fetch classes:", err);
        setError("Failed to load classes.");
      });
  }, []);

  const loadAttendance = async () => {
    if (!selectedClass) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const data = await getAttendanceByClass(selectedClass);
      setAttendanceData(data || []);
    } catch (err: any) {
      console.error("Failed to fetch attendance:", err);
      setError("Failed to fetch attendance data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) loadAttendance();
  }, [selectedClass]);

  const handleExportCSV = () => {
    exportToCSV(attendanceData, `Attendance_${selectedClass}`);
  };

  const handleExportPDF = () => {
    exportToPDF(attendanceData, `Attendance_${selectedClass}`);
  };

  // ✅ Start marking mode
  const handleStartMarking = async () => {
    setMarking(true);
    setMessage(null);

    try {
      setLoading(true);
      const students = await getStudentsByClass(selectedClass); // fetch from backend
      const today = new Date().toISOString().split("T")[0];
      setAttendanceData(
        students.map((s: any) => ({
          studentId: s.studentId,
          studentName: s.studentName,
          date: today,
          status: "Pending",
        }))
      );
    } catch (err) {
      console.error(err);
      setError("Failed to load students for this class.");
      setMarking(false);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Change single student’s status
  const handleStatusChange = (index: number, status: string) => {
    const updated = [...attendanceData];
    updated[index].status = status;
    setAttendanceData(updated);
  };

  // ✅ Quick Mark All
  const handleMarkAll = (status: "Present" | "Absent") => {
    const updated = attendanceData.map((s) => ({
      ...s,
      status,
    }));
    setAttendanceData(updated);
  };

  // ✅ Submit attendance
  const handleSubmitAttendance = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    const records = attendanceData.filter(
      (record) => record.studentId && (record.status === "Present" || record.status === "Absent")
    );
    if (records.length !== attendanceData.length) {
      setError("Mark every student as present or absent before submitting.");
      setLoading(false);
      return;
    }
    try {
      await markAttendanceForClass(selectedClass, records);
      setMarking(false);
      await loadAttendance();
      setMessage("✅ Attendance submitted successfully!");
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to submit attendance.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Attendance summary
  const attendanceSummary = Object.values(
    attendanceData.reduce((acc: any, record) => {
      const { studentName, status } = record;
      if (!acc[studentName])
        acc[studentName] = { studentName, present: 0, total: 0 };
      acc[studentName].total += 1;
      if (status === "Present") acc[studentName].present += 1;
      return acc;
    }, {})
  ).map((item: any) => ({
    name: item.studentName,
    attendance: ((item.present / item.total) * 100).toFixed(1),
  }));

  // ✅ Pie data
  const totalPresent = attendanceData.filter((r) => r.status === "Present").length;
  const totalAbsent = attendanceData.filter((r) => r.status === "Absent").length;
  const totalRecords = totalPresent + totalAbsent;
  const overallPercent = totalRecords
    ? ((totalPresent / totalRecords) * 100).toFixed(1)
    : "0";

  const pieData = [
    { name: "Present", value: totalPresent },
    { name: "Absent", value: totalAbsent },
  ];
  const COLORS = ["#22c55e", "#ef4444"];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">
        Teacher Attendance Management 🧾
      </h1>

      {/* Class Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="border rounded-md p-2 w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Select a Class</option>
          {classOptions.map((cls) => (
            <option key={cls.id} value={cls.classId || cls.id}>
              {cls.name || cls.classId || cls.id}
            </option>
          ))}
        </select>

        <button
          onClick={loadAttendance}
          disabled={!selectedClass || loading}
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition disabled:opacity-50"
        >
          {loading ? "Loading..." : "View Attendance"}
        </button>

        <button
          onClick={handleStartMarking}
          disabled={!selectedClass}
          className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
        >
          Mark Attendance
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      {message && (
        <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">
          {message}
        </div>
      )}

      {/* Marking UI */}
      {marking && (
        <div className="bg-white shadow rounded-lg p-4 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">
              Mark Attendance for {selectedClass}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => handleMarkAll("Present")}
                className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700"
              >
                Mark All Present
              </button>
              <button
                onClick={() => handleMarkAll("Absent")}
                className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          <table className="min-w-full border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="p-2 border">Student Name</th>
                <th className="p-2 border text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {attendanceData.map((student, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="p-2 border">{student.studentName}</td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => handleStatusChange(index, "Present")}
                      className={`px-3 py-1 rounded-md mr-2 ${
                        student.status === "Present"
                          ? "bg-green-600 text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      Present
                    </button>
                    <button
                      onClick={() => handleStatusChange(index, "Absent")}
                      className={`px-3 py-1 rounded-md ${
                        student.status === "Absent"
                          ? "bg-red-600 text-white"
                          : "bg-gray-200"
                      }`}
                    >
                      Absent
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-4 gap-3">
            <button
              onClick={() => setMarking(false)}
              className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitAttendance}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Attendance"}
            </button>
          </div>
        </div>
      )}

      {/* Data Table + Charts */}
      {!marking && attendanceData.length > 0 && (
        <>
          {/* Table */}
          <div className="bg-white shadow rounded-lg p-4 overflow-x-auto">
            <table className="min-w-full border border-gray-200">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="p-2 border">Student Name</th>
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-2 border">{item.studentName}</td>
                    <td className="p-2 border">{item.date}</td>
                    <td
                      className={`p-2 border font-semibold ${
                        item.status === "Present"
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    >
                      {item.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={handleExportCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Export CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Export PDF
              </button>
            </div>
          </div>

          {/* Charts */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">
                Attendance Percentage by Student
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceSummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(v: any) => `${v}%`} />
                  <Legend />
                  <Bar dataKey="attendance" fill="#3b82f6" name="Attendance %" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white shadow rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">
                Class Attendance Summary
              </h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={70}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                    <Label
                      value={`${overallPercent}% Present`}
                      position="center"
                      fill="#111827"
                      style={{ fontSize: "18px", fontWeight: "600" }}
                    />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
