import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { exportToCSV, exportToPDF } from "../Admin/reports/utils/reportExports";
import { getParentProfileByUserId } from "../../services/ParentService";
import {
  fetchPublishedReportsByStudentIds,
  type PublishedStudentReport,
} from "../../services/ReportPublicationService";

export default function ParentReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<PublishedStudentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    const loadReports = async () => {
      try {
        const parent = await getParentProfileByUserId(user.uid);
        setReports(await fetchPublishedReportsByStudentIds(parent?.studentIds || []));
      } catch (loadError) {
        console.error(loadError);
        setError("Unable to load released reports.");
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, [user]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900"><FileText size={24} /> Released Reports</h1>
          <p className="mt-1 text-sm text-slate-600">View term report snapshots released by the school.</p>
        </div>
        <div className="flex gap-2">
          <button disabled={!reports.length} onClick={() => exportToCSV(reports, "Released_Student_Reports")} className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"><Download size={16} /> CSV</button>
          <button disabled={!reports.length} onClick={() => exportToPDF(reports, "Released_Student_Reports")} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-50"><Download size={16} /> PDF</button>
        </div>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading ? <p className="py-10 text-center text-sm text-slate-500">Loading reports...</p> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {reports.map((report) => (
            <article key={report.id} className="border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
                <div><h2 className="font-semibold text-slate-900">{report.studentName}</h2><p className="text-xs text-slate-500">{report.studentId} | {report.className}</p></div>
                <div className="text-right"><p className="text-sm font-medium">{report.term}</p><p className="text-xs text-slate-500">{report.academicYear}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3 py-3 text-sm">
                <div><p className="text-xs uppercase text-slate-500">Average</p><p className="text-xl font-bold text-primary">{report.averageGrade.toFixed(2)}%</p></div>
                <div><p className="text-xs uppercase text-slate-500">Attendance</p><p className="text-xl font-bold text-slate-900">{report.attendance.present}/{report.attendance.total}</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Subject</th><th className="px-3 py-2">Mark</th><th className="px-3 py-2">Grade</th></tr></thead><tbody className="divide-y">{report.subjects.map((subject) => <tr key={subject.name}><td className="px-3 py-2">{subject.name}</td><td className="px-3 py-2">{subject.mark}</td><td className="px-3 py-2">{subject.grade}</td></tr>)}</tbody></table>
              </div>
            </article>
          ))}
          {!reports.length && <p className="border bg-white px-4 py-10 text-center text-sm text-slate-500 xl:col-span-2">No released reports are available yet.</p>}
        </div>
      )}
    </div>
  );
}
