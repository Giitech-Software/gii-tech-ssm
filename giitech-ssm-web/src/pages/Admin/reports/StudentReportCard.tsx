import React, { useState, useEffect } from "react";
import { fetchStudents } from "../../../services/StudentService";
import { fetchReportCardData } from "../../../services/ReportCardService";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const StudentReportCard: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any | null>(null);

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
      const data = await fetchReportCardData(selectedStudent);

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

      if (Array.isArray(data.subjects) && data.subjects.length > 0) {
        autoTable(doc, {
          startY: 55,
          head: [["Subject", "Mark", "Grade", "Remark"]],
          body: data.subjects.map((s: any) => [
            s.name || "-",
            s.mark?.toString() ?? "-",
            s.grade || "-",
            s.remark || "-",
          ]),
        });
      } else {
        doc.text("No subjects found.", 14, 60);
      }

      const yPos = (doc as any).lastAutoTable?.finalY
        ? (doc as any).lastAutoTable.finalY + 10
        : 70;

      doc.text(`Average: ${(data.average ?? 0).toFixed(2)}%`, 14, yPos);
      doc.text(
        `Attendance: ${data.attendance?.present ?? 0}/${
          data.attendance?.total ?? 0
        }`,
        14,
        yPos + 8
      );

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
      const data = await fetchReportCardData(selectedStudent);
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
              <td>${s.mark}</td>
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
          </div>
          <table>
            <thead>
              <tr><th>Subject</th><th>Mark</th><th>Grade</th><th>Remark</th></tr>
            </thead>
            <tbody>${subjectsRows}</tbody>
          </table>
          <div class="summary">
            <p><strong>Average:</strong> ${(data.average ?? 0).toFixed(2)}%</p>
            <p><strong>Attendance:</strong> ${data.attendance?.present ?? 0}/${data.attendance?.total ?? 0}</p>
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
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
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
            <option key={s.studentId} value={s.studentId}>
              {s.name}
            </option>
          ))}
        </select>

        <button
          onClick={generatePDF}
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
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
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          {loading ? "Printing..." : "Print"}
        </button>
      </div>

      {/* Inline Preview */}
      {reportData && (
        <div className="bg-gray-50 p-4 rounded border mt-4">
          <h3 className="font-semibold mb-2 text-lg">
            Preview: {reportData.studentName}
          </h3>
          <p className="text-sm text-gray-600">
            Class: {reportData.className} | Term: {reportData.termName}
          </p>

          <table className="mt-3 w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Subject</th>
                <th className="border p-2">Mark</th>
                <th className="border p-2">Grade</th>
                <th className="border p-2">Remark</th>
              </tr>
            </thead>
            <tbody>
              {reportData.subjects?.map((s: any, i: number) => (
                <tr key={i}>
                  <td className="border p-2">{s.name}</td>
                  <td className="border p-2">{s.mark}</td>
                  <td className="border p-2">{s.grade}</td>
                  <td className="border p-2">{s.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 text-sm text-gray-700">
            <p>Average: {reportData.average?.toFixed(2)}%</p>
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
