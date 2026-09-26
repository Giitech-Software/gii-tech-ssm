import React, { useState, useEffect } from "react";
import { fetchStudents } from "../../../services/StudentService";
import { fetchReportCardData } from "../../../services/ReportCardService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const currentAcademicYear = () => {
  const year = new Date().getFullYear();
  return `${year}/${year + 1}`;
};

const StudentReportCard: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);
  const [academicYear, setAcademicYear] = useState(currentAcademicYear());
  const [term, setTerm] = useState("Term 1");

  useEffect(() => {
    const load = async () => {
      try {
        const studentList = await fetchStudents();
        setStudents(studentList);
      } catch (error) {
        console.error("Error fetching students:", error);
      }
    };
    load();
  }, []);

  // 🔹 Generate PDF
  const generatePDF = async () => {
    if (!selectedStudent) return alert("Please select a student first");
    setLoading(true);
    try {
      const data = await fetchReportCardData(selectedStudent, { academicYear, term });

      if (!data) {
        alert("No report data found for this student.");
        return;
      }
      setReportData(data);

      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text("Student Report Card", 14, 20);

      doc.setFontSize(12);
      doc.text(`Name: ${data.studentName || "N/A"}`, 14, 30);
      doc.text(`Class: ${data.className || "N/A"}`, 14, 38);
      doc.text(`Term: ${data.termName || "N/A"}`, 14, 46);
      doc.text(`Academic Year: ${data.academicYear || "N/A"}`, 14, 54);
      doc.text(`Position: ${data.rank ? `${data.rank} of ${data.rankedStudents}` : "N/A"}`, 110, 30);
      doc.text(`GPA: ${(data.gpa ?? 0).toFixed(2)}`, 110, 38);
      doc.text(`Stream: ${data.positions?.stream ? `${data.positions.stream.position} of ${data.positions.stream.total}` : "N/A"}`, 110, 46);
      doc.text(`Department: ${data.positions?.department ? `${data.positions.department.position} of ${data.positions.department.total}` : "N/A"}`, 110, 54);

      if (Array.isArray(data.subjects) && data.subjects.length > 0) {
        autoTable(doc, {
          startY: 63,
          head: [["Subject", "Class", "Exam", "Final", "Grade", "Remark"]],
          body: data.subjects.map((s: any) => [
            s.name || "-",
            s.classScore?.toString() ?? "-",
            s.examScore?.toString() ?? s.mark?.toString() ?? "-",
            s.finalScore?.toString() ?? s.mark?.toString() ?? "-",
            s.grade || "-",
            s.remark || "-",
          ]),
        });
      } else {
        doc.text("No subjects found.", 14, 68);
      }

      const yPos = (doc as any).lastAutoTable?.finalY
        ? (doc as any).lastAutoTable.finalY + 10
        : 70;

      doc.text(`Average: ${(data.average ?? 0).toFixed(2)}%`, 14, yPos);
      doc.text(`GPA: ${(data.gpa ?? 0).toFixed(2)}`, 14, yPos + 8);
      doc.text(
        `Attendance: ${data.attendance?.present ?? 0}/${
          data.attendance?.total ?? 0
        }`,
        14,
        yPos + 16
      );
      doc.text(`Interest: ${data.interests || "N/A"}`, 14, yPos + 24);
      doc.text(`Conduct: ${data.conductRemark || "N/A"}`, 14, yPos + 32);
      doc.text(`Attendance remark: ${data.attendanceRemark || "N/A"}`, 14, yPos + 40);
      doc.text(`Next steps: ${data.nextSteps || "N/A"}`, 14, yPos + 48);

      doc.save(`${data.studentName || "student"}_ReportCard.pdf`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate report card PDF.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Print directly (HTML layout)
  const handlePrint = async () => {
    if (!selectedStudent) return alert("Please select a student first");

    setLoading(true);
    try {
      const data = await fetchReportCardData(selectedStudent, { academicYear, term });
      if (!data) return alert("No report card data found for this student.");

      setReportData(data);

      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        alert("Popup blocked. Please allow popups for this site.");
        return;
      }

      const subjectsRows = data.subjects
        .map(
          (s: any) => `
            <tr>
              <td>${s.name}</td>
              <td>${s.classScore ?? "-"}</td><td>${s.examScore ?? s.mark}</td><td>${s.finalScore ?? s.mark}</td>
              <td>${s.grade}</td>
              <td>${s.remark}</td>
            </tr>`
        )
        .join("");

      const html = `
        <html>
        <head>
          <title>${data.studentName} - Report Card</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
            h1 { text-align: center; margin-bottom: 20px; }
            .meta { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f3f3f3; }
            .summary { font-size: 14px; }
            .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #555; }
          </style>
        </head>
        <body>
          <h1>Student Report Card</h1>
          <div class="meta">
            <p><strong>Name:</strong> ${data.studentName}</p>
            <p><strong>Class:</strong> ${data.className}</p>
            <p><strong>Term:</strong> ${data.termName}</p>
            <p><strong>Academic Year:</strong> ${data.academicYear}</p>
          </div>
          <table>
            <thead>
              <tr><th>Subject</th><th>Class</th><th>Exam</th><th>Final</th><th>Grade</th><th>Remark</th></tr>
            </thead>
            <tbody>${subjectsRows}</tbody>
          </table>
          <div class="summary">
            <p><strong>Average:</strong> ${(data.average ?? 0).toFixed(2)}%</p>
            <p><strong>GPA / Points:</strong> ${(data.gpa ?? 0).toFixed(2)}</p>
            <p><strong>Positions:</strong> Class ${data.positions?.class ? `${data.positions.class.position}/${data.positions.class.total}` : "-"}; Stream ${data.positions?.stream ? `${data.positions.stream.position}/${data.positions.stream.total}` : "-"}; Department ${data.positions?.department ? `${data.positions.department.position}/${data.positions.department.total}` : "-"}</p>
            <p><strong>Attendance:</strong> ${data.attendance?.present ?? 0}/${data.attendance?.total ?? 0}</p>
            <p><strong>Interest:</strong> ${data.interests || "-"}</p><p><strong>Conduct:</strong> ${data.conductRemark || "-"}</p><p><strong>Attendance remark:</strong> ${data.attendanceRemark || "-"}</p><p><strong>Next steps:</strong> ${data.nextSteps || "-"}</p>
          </div>
          <div class="footer">
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    } catch (error) {
      console.error("Error printing report:", error);
      alert("Failed to print report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-slate-800">
        Student Report Card
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={selectedStudent}
          onChange={(e) => setSelectedStudent(e.target.value)}
          className="border p-2 rounded flex-grow"
        >
          <option value="">Select Student</option>
          {students.map((s) => (
            <option key={s.studentId || s.id} value={s.studentId || s.id}>
              {s.displayName || s.name || s.studentName || s.studentId || s.id}
            </option>
          ))}
        </select>

        <input
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          className="border p-2 rounded"
          placeholder="Academic year"
        />

        <select value={term} onChange={(e) => setTerm(e.target.value)} className="border p-2 rounded">
          <option value="">All terms</option>
          <option value="Term 1">Term 1</option>
          <option value="Term 2">Term 2</option>
          <option value="Term 3">Term 3</option>
        </select>

        <button
          onClick={generatePDF}
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${
            loading
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Generating..." : "Export PDF"}
        </button>

        <button
          onClick={handlePrint}
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${
            loading
              ? "bg-slate-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Printing..." : "Print"}
        </button>
      </div>

      {/* Inline Preview */}
      {reportData && (
        <div className="bg-slate-50 p-4 rounded border mt-4">
          <h3 className="font-semibold mb-2 text-lg">
            Preview: {reportData.studentName}
          </h3>
          <p className="text-sm text-slate-600">
            Class: {reportData.className} | Term: {reportData.termName} | Academic Year: {reportData.academicYear}
          </p>

          <table className="mt-3 w-full text-sm border">
            <thead className="bg-slate-100">
              <tr>
                <th className="border p-2">Subject</th>
                <th className="border p-2">Class</th><th className="border p-2">Exam</th><th className="border p-2">Final</th>
                <th className="border p-2">Grade</th>
                <th className="border p-2">Remark</th>
              </tr>
            </thead>
            <tbody>
              {reportData.subjects?.map((s: any, i: number) => (
                <tr key={i}>
                  <td className="border p-2">{s.name}</td>
                  <td className="border p-2">{s.classScore ?? "-"}</td><td className="border p-2">{s.examScore ?? s.mark}</td><td className="border p-2">{s.finalScore ?? s.mark}</td>
                  <td className="border p-2">{s.grade}</td>
                  <td className="border p-2">{s.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 text-sm text-slate-700">
            <p>Average: {reportData.average?.toFixed(2)}%</p>
            <p>GPA / Points: {reportData.gpa?.toFixed(2)}</p>
            <p>Class position: {reportData.rank ? `${reportData.rank} of ${reportData.rankedStudents}` : "Not ranked"}</p>
            <p>Stream position: {reportData.positions?.stream ? `${reportData.positions.stream.position} of ${reportData.positions.stream.total}` : "Not ranked"}</p>
            <p>Department position: {reportData.positions?.department ? `${reportData.positions.department.position} of ${reportData.positions.department.total}` : "Not ranked"}</p>
            <p>Overall position: {reportData.positions?.overall ? `${reportData.positions.overall.position} of ${reportData.positions.overall.total}` : "Not ranked"}</p>
            <p>Interest: {reportData.interests || "Not provided"}</p><p>Conduct: {reportData.conductRemark || "Not provided"}</p><p>Attendance remark: {reportData.attendanceRemark || "Not provided"}</p><p>Next steps: {reportData.nextSteps || "Not provided"}</p>
            <p>
              Attendance: {reportData.attendance.present}/
              {reportData.attendance.total}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentReportCard;
