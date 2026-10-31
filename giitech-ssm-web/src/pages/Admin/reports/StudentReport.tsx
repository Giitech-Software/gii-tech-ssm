// src/pages/Admin/reports/StudentReport.tsx
import React, { useEffect, useState } from "react";
import { fetchStudents } from "../../../services/StudentService";
import { getDepartments } from "../../../services/departmentService";
import { fetchClasses } from "../../../services/ClassService";
import { fetchStreams } from "../../../services/StreamService";
import { exportToCSV, exportToPDF } from "./utils/reportExports";

const StudentReport: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);

  const [selectedDept, setSelectedDept] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStream, setSelectedStream] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [stds, depts, cls, strs] = await Promise.all([
          fetchStudents(),
          getDepartments(),
          fetchClasses(),
          fetchStreams(),
        ]);
        setStudents(stds);
        setDepartments(depts);
        setClasses(cls);
        setStreams(strs);
        setFiltered(stds);
      } catch (error) {
        console.error("Error loading student report:", error);
        setError("Unable to load student report data. Please refresh and try again.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Apply filters and search
  useEffect(() => {
    let result = students;
    if (selectedDept) result = result.filter((s) => s.departmentId === selectedDept);
    if (selectedClass) result = result.filter((s) => s.classId === selectedClass);
    if (selectedStream) result = result.filter((s) => s.streamId === selectedStream);
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (s) =>
          (s.name || s.displayName || s.studentName)?.toLowerCase().includes(query) ||
          s.studentId?.toLowerCase().includes(query)
      );
    }
    setFiltered(result);
  }, [students, selectedDept, selectedClass, selectedStream, search]);

  const classId = (value: any) => String(value?.classId || value?.id || "");
  const className = (value: any) => String(value?.name || value?.className || value?.classId || value?.id || "");
  const availableClasses = Array.from(new Map([
    ...classes.map((item) => [classId(item), item] as const),
    ...students.filter((student) => !selectedDept || student.departmentId === selectedDept).map((student) => [String(student.classId || ""), { classId: String(student.classId || ""), name: String(student.className || student.classId || "") }] as const),
  ].filter(([id]) => Boolean(id))).values()).filter((item) => !selectedDept || item.departmentId === selectedDept || students.some((student) => student.classId === classId(item) && student.departmentId === selectedDept));

  if (loading)
    return <p className="text-slate-500 animate-pulse p-4">Loading student data...</p>;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-slate-700">Student Report</h2>

      {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={selectedDept}
          onChange={(e) => setSelectedDept(e.target.value)}
          className="border p-2 rounded w-48"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.departmentId} value={d.departmentId}>
              {d.name}
            </option>
          ))}
        </select>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="border p-2 rounded w-48"
        >
          <option value="">All Classes</option>
          {availableClasses.map((c) => (
              <option key={classId(c)} value={classId(c)}>
                {className(c)}
              </option>
            ))}
        </select>

        <select
          value={selectedStream}
          onChange={(e) => setSelectedStream(e.target.value)}
          className="border p-2 rounded w-48"
        >
          <option value="">All Streams</option>
          {streams
            .filter((s) => !selectedClass || s.classId === selectedClass)
            .map((s) => (
              <option key={s.streamId} value={s.streamId}>
                {s.name}
              </option>
            ))}
        </select>

        <input
          type="text"
          placeholder="Search student..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border p-2 rounded flex-grow max-w-sm"
        />
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => exportToCSV(filtered, "Student_Report")}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Export CSV
        </button>
        <button
          onClick={() => exportToPDF(filtered, "Student_Report")}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Export PDF
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white shadow-md rounded">
        <table className="min-w-full border">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="p-2 border text-left">Student ID</th>
              <th className="p-2 border text-left">Name</th>
              <th className="p-2 border text-left">Gender</th>
              <th className="p-2 border text-left">Department</th>
              <th className="p-2 border text-left">Class</th>
              <th className="p-2 border text-left">Stream</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-500">
                  No students found.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="border-b hover:bg-slate-50">
                  <td className="p-2 border text-slate-500">{s.studentId}</td>
                  <td className="p-2 border">{s.name || s.displayName || s.studentName || "-"}</td>
                  <td className="p-2 border">{s.gender || "—"}</td>
                  <td className="p-2 border">
                    {departments.find((d) => d.departmentId === s.departmentId)?.name || "-"}
                  </td>
                  <td className="p-2 border">
                    {className(classes.find((c) => classId(c) === s.classId) || { classId: s.classId }) || "-"}
                  </td>
                  <td className="p-2 border">
                    {streams.find((st) => st.streamId === s.streamId)?.name || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentReport;
