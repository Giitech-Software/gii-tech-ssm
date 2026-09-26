import React, { useEffect, useState } from "react";
import { fetchClasses } from "../../../services/ClassService";
import { fetchAttendanceSummary } from "../../../services/AttendanceService";
import { exportToCSV, exportToPDF } from "./utils/reportExports";

const AttendanceReport: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClasses().then(setClasses);
  }, []);

  const loadSummary = async () => {
    if (!selectedClass) return alert("Select class first");
    setLoading(true);
    try {
      const data = await fetchAttendanceSummary(selectedClass);
      setSummary(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-slate-800">Attendance Report</h2>

      <div className="flex gap-3 mb-4">
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select Class</option>
          {classes.map((cls) => (
            <option key={cls.classId} value={cls.classId}>
              {cls.name}
            </option>
          ))}
        </select>
        <button
          onClick={loadSummary}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Generate Summary
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : summary.length === 0 ? (
        <p>No data available.</p>
      ) : (
        <>
          <table className="min-w-full border text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 border">Student</th>
                <th className="p-2 border">Days Present</th>
                <th className="p-2 border">Total Days</th>
                <th className="p-2 border">Attendance %</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s, i) => (
                <tr key={i}>
                  <td className="p-2 border">{s.studentName}</td>
                  <td className="p-2 border">{s.present}</td>
                  <td className="p-2 border">{s.total}</td>
                  <td className="p-2 border">{((s.present / s.total) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => exportToCSV(summary, "Attendance_Report")}
              className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
            >
              Export CSV
            </button>
            <button
              onClick={() => exportToPDF(summary, "Attendance_Report")}
              className="bg-red-600 text-white px-3 py-2 rounded hover:bg-red-700"
            >
              Export PDF
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AttendanceReport;


