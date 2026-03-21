//src/pages/Parent/ParentReportsPage.tsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "../../firebaseConfig";
import { exportToCSV, exportToPDF } from "../Admin/reports/utils/reportExports";
import { FileText, Download } from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
} from "recharts";

// ✅ Local Tailwind-based UI elements
const Button = ({ onClick, children, variant = "primary" }: any) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-all duration-200 ${
      variant === "outline"
        ? "border border-gray-300 text-gray-700 hover:bg-gray-100"
        : "bg-indigo-600 text-white hover:bg-indigo-700"
    }`}
  >
    {children}
  </button>
);

const Card = ({ children }: any) => (
  <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300">
    {children}
  </div>
);

const CardContent = ({ children }: any) => (
  <div className="p-5">{children}</div>
);

const ParentReportsPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      const user = auth.currentUser;
      if (!user) return;
      try {
        const q = query(
          collection(db, "studentReports"),
          where("parentEmail", "==", user.email)
        );
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setReports(fetched);
      } catch (err) {
        console.error("Error loading reports:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const handleExportCSV = () => exportToCSV(reports, "Student_Reports");
  const handleExportPDF = () => exportToPDF(reports, "Student_Reports");

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <FileText className="text-indigo-500" />
          Student Reports
        </h1>
        <div className="flex gap-3">
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button onClick={handleExportPDF}>
            <Download className="w-4 h-4" /> PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 text-center mt-10">Loading reports...</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-500 text-center mt-10">
          No reports available yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardContent>
                <h2 className="text-xl font-semibold text-indigo-700 mb-2">
                  {report.studentName}
                </h2>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Class:</strong> {report.class}
                </p>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Term:</strong> {report.term}
                </p>
                <p className="text-sm text-gray-600 mb-3">
                  <strong>Average Grade:</strong> {report.averageGrade}%
                </p>

                {report.subjects && Array.isArray(report.subjects) && (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={report.subjects}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="score" fill="#6366f1" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParentReportsPage;
