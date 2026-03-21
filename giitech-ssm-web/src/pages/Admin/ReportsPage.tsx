// src/pages/Admin/ReportsPage.tsx
import React from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  BarChart3,
  ClipboardList,
  FileSpreadsheet,
} from "lucide-react";

const reports = [
  {
    title: "Student Report",
    description: "View and manage detailed student reports and profiles.",
    icon: <FileText className="text-blue-600" size={36} />,
    path: "/admin/reports/student",
    color: "from-blue-50 to-blue-100",
  },
  {
    title: "Performance Report",
    description:
      "Analyze student academic performance and subject averages.",
    icon: <BarChart3 className="text-green-600" size={36} />,
    path: "/admin/reports/performance",
    color: "from-green-50 to-green-100",
  },
  {
    title: "Attendance Report",
    description: "Track attendance patterns and absentee summaries.",
    icon: <ClipboardList className="text-orange-600" size={36} />,
    path: "/admin/reports/attendance",
    color: "from-orange-50 to-orange-100",
  },
  {
    title: "Student Report Card",
    description: "Generate and view student report cards by term or class.",
    icon: <FileSpreadsheet className="text-purple-600" size={36} />,
    path: "/admin/reports/report-card",
    color: "from-purple-50 to-purple-100",
  },
];

const ReportsPage: React.FC = () => {
  return (
    <div className="p-6 min-h-screen bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800 mb-2">Reports</h1>
      <p className="text-gray-600 mb-8">
        Access and manage all academic and administrative reports from one
        place.
      </p>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {reports.map((report) => (
          <Link
            key={report.title}
            to={report.path}
            className={`p-6 rounded-2xl shadow-md bg-gradient-to-br ${report.color} hover:shadow-lg hover:-translate-y-1 transition transform`}
          >
            <div className="flex flex-col items-start space-y-3">
              <div className="p-3 bg-white rounded-full shadow-sm">
                {report.icon}
              </div>
              <h2 className="text-lg font-semibold text-gray-800">
                {report.title}
              </h2>
              <p className="text-gray-600 text-sm leading-relaxed">
                {report.description}
              </p>
              <span className="mt-3 text-blue-600 font-medium hover:underline">
                View Report →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default ReportsPage;
