// src/pages/Admin/Reports/PerformanceReport.tsx
import React, { useEffect, useState } from "react";
import { fetchStudents } from "../../../services/StudentService";
import { fetchClasses } from "../../../services/ClassService";
import { fetchExams } from "../../../services/ExamService";
import { fetchPerformanceData } from "../../../services/PerformanceService";
import { exportToCSV, exportToPDF } from "./utils/reportExports";

const PerformanceReport: React.FC = () => {
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedExam, setSelectedExam] = useState("");
  const [performance, setPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load dropdown data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [classData, studentData, examData] = await Promise.all([
          fetchClasses(),
          fetchStudents(),
          fetchExams(),
        ]);
        setClasses(classData);
        setStudents(studentData);
        setExams(examData);
      } catch (err) {
        console.error("Error loading performance report data:", err);
        alert("Failed to load dropdown data. Please refresh.");
      }
    };
    loadData();
  }, []);

  // Load performance data
  const loadReport = async () => {
    if (!selectedClass || !selectedExam) {
      alert("Please select both a class and an exam.");
      return;
    }

    setLoading(true);
    try {
      const data = await fetchPerformanceData(
        selectedClass,
        selectedExam,
        selectedStudent || null
      );
      setPerformance(data);
    } catch (err) {
      console.error("Error fetching performance data:", err);
      alert("Failed to load performance data.");
    } finally {
      setLoading(false);
    }
  };

  // Filter students to selected class only
  const filteredStudents = students.filter(
    (s) => s.classId === selectedClass
  );

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-slate-800">
        Performance Report
      </h2>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
        {/* Class */}
        <select
          value={selectedClass}
          onChange={(e) => {
            setSelectedClass(e.target.value);
            setSelectedStudent(""); // reset student filter
          }}
          className="border p-2 rounded"
        >
          <option value="">Select Class</option>
          {classes.map((cls) => (
            <option key={cls.classId} value={cls.classId}>
              {cls.name}
            </option>
          ))}
        </select>

        {/* Student */}
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="border p-2 rounded"
          disabled={!selectedClass}
        >
          <option value="">All Students</option>
          {filteredStudents.map((s) => (
            <option key={s.studentId} value={s.studentId}>
              {s.name}
            </option>
          ))}
        </select>

        {/* Exam */}
        <select
          value={selectedExam}
          onChange={(e) => setSelectedExam(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">Select Exam</option>
          {exams.map((ex) => (
            <option key={ex.examId} value={ex.examId}>
              {ex.name}
            </option>
          ))}
        </select>

        <button
          onClick={loadReport}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Generate Report
        </button>
      </div>

      {/* Data */}
      {loading ? (
        <p>Loading performance data...</p>
      ) : performance.length === 0 ? (
        <p className="text-slate-500">No data found for the selected filters.</p>
      ) : (
        <>
          <table className="min-w-full border text-sm mt-2">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="p-2 border">Student</th>
                <th className="p-2 border">Subject</th>
                <th className="p-2 border">Mark</th>
                <th className="p-2 border">Average</th>
              </tr>
            </thead>
            <tbody>
              {performance.map((row, i) => (
                <tr key={i}>
                  <td className="p-2 border">{row.studentName}</td>
                  <td className="p-2 border">{row.subject}</td>
                  <td className="p-2 border text-center">{row.mark}</td>
                  <td className="p-2 border text-center">{row.average}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => exportToCSV(performance, "Performance_Report")}
              className="bg-green-600 text-white px-3 py-2 rounded hover:bg-green-700"
            >
              Export CSV
            </button>
            <button
              onClick={() => exportToPDF(performance, "Performance_Report")}
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

export default PerformanceReport;
