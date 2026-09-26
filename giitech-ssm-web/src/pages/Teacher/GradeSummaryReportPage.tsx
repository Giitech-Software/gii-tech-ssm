import React, { useEffect, useRef, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { exportToCSV, exportToPDF } from "../Admin/reports/utils/reportExports";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Download, FileText, BarChart3, ImageDown } from "lucide-react";
import html2canvas from "html2canvas";
import toast from "react-hot-toast";

interface GradeRecord {
  id: string;
  studentName: string;
  className: string;
  subject: string;
  grade: number;
}

const GradeSummaryReportPage: React.FC = () => {
  const { user } = useAuth();
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<"student" | "class">("student");
  const chartRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!user?.uid) return;
      try {
        const snapshot = await getDocs(query(collection(db, "grades"), where("teacherId", "==", user?.uid)));
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as GradeRecord[];
        setGrades(data);
      } catch (error) {
        console.error("Error fetching grades:", error);
        toast.error("Failed to load grade data");
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [user]);

  const aggregateData = () => {
    const map = new Map<string, { total: number; count: number }>();
    grades.forEach((g) => {
      const key = groupBy === "student" ? g.studentName : g.className;
      if (!map.has(key)) map.set(key, { total: 0, count: 0 });
      const entry = map.get(key)!;
      entry.total += g.grade;
      entry.count++;
    });

    return Array.from(map.entries()).map(([name, { total, count }]) => ({
      name,
      average: parseFloat((total / count).toFixed(2)),
    }));
  };

  const chartData = aggregateData();

  const handleExport = (type: "csv" | "pdf") => {
    if (!grades.length) {
      toast.error("No data available for export");
      return;
    }
    const fileName = `Grade_Summary_${groupBy}_${new Date().toISOString().split("T")[0]}`;
    if (type === "csv") exportToCSV(grades, fileName);
    else exportToPDF(grades, fileName);
    toast.success(`Exported ${type.toUpperCase()} successfully`);
  };

  const handleChartDownload = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `Grade_Summary_Chart_${groupBy}.png`;
      link.click();
      toast.success("Chart exported as image!");
    } catch (err) {
      console.error("Failed to export chart:", err);
      toast.error("Error exporting chart image");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
          <BarChart3 className="text-primary" /> Grade Summary Report
        </h1>
        <p className="text-slate-600 mt-2">
          Visualize and export student or class grade summaries.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <label className="font-medium text-slate-700">Group by:</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as "student" | "class")}
            className="border border-slate-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:ring focus:ring-primary focus:outline-none"
          >
            <option value="student">Student</option>
            <option value="class">Class</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport("csv")}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
          >
            <Download size={18} /> Export CSV
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            <FileText size={18} /> Export PDF
          </button>
          <button
            onClick={handleChartDownload}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary transition"
          >
            <ImageDown size={18} /> Export Chart (PNG)
          </button>
        </div>
      </div>

      {/* Chart */}
      <div
        ref={chartRef}
        className="bg-white rounded-2xl shadow border border-slate-100 p-6"
      >
        {loading ? (
          <div className="text-center text-slate-500">Loading data...</div>
        ) : chartData.length === 0 ? (
          <div className="text-center text-slate-500">No grade data available.</div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="average" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default GradeSummaryReportPage;
