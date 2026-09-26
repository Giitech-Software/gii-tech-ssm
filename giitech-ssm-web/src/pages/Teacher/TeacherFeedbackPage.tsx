// src/pages/Teachers/TeacherFeedbackPage.tsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  orderBy,
  query,
} from "firebase/firestore";
import {
  FileText,
  MessageSquare,
  CheckCircle,
  XCircle,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";

interface Submission {
  id: string;
  studentId: string;
  assignmentTitle: string;
  fileUrl: string;
  status: string;
  feedback?: string;
  submittedAt?: any;
}

const TeacherFeedbackPage: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Fetch all submissions
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const q = query(collection(db, "submissions"), orderBy("submittedAt", "desc"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Submission[];
        setSubmissions(data);
      } catch (error) {
        console.error("Error loading submissions:", error);
        toast.error("Failed to load submissions");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  // Update feedback and status
  const handleFeedbackSave = async (id: string, feedback: string) => {
    setUpdating(id);
    try {
      const docRef = doc(db, "submissions", id);
      await updateDoc(docRef, {
        feedback,
        status: feedback.trim() ? "graded" : "submitted",
      });
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, feedback, status: feedback ? "graded" : "submitted" } : s
        )
      );
      toast.success("Feedback saved");
    } catch (error) {
      console.error("Error saving feedback:", error);
      toast.error("Failed to save feedback");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="text-primary" /> Review Student Submissions
        </h1>
        <p className="text-slate-600 mt-2">
          Grade and provide feedback on uploaded assignments.
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow border border-slate-100">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <MessageSquare className="text-blue-500" /> Submissions List
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-slate-500 text-center">Loading submissions...</div>
        ) : submissions.length === 0 ? (
          <div className="p-6 text-slate-500 text-center">No submissions found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Student ID</th>
                  <th className="px-4 py-3">Assignment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Feedback</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b hover:bg-slate-50 transition-colors duration-150"
                  >
                    <td className="px-4 py-3 font-medium">{s.studentId}</td>
                    <td className="px-4 py-3">{s.assignmentTitle || "—"}</td>
                    <td className="px-4 py-3">
                      {s.status === "graded" ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle size={16} /> Graded
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-600">
                          <XCircle size={16} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 w-64">
                      <textarea
                        defaultValue={s.feedback || ""}
                        onBlur={(e) => handleFeedbackSave(s.id, e.target.value)}
                        placeholder="Write feedback..."
                        className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-primary0 text-slate-700"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={s.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-medium"
                      >
                        View File
                      </a>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {updating === s.id ? (
                        <span className="text-slate-500 text-sm">Saving...</span>
                      ) : (
                        <button
                          onClick={() =>
                            handleFeedbackSave(
                              s.id,
                              (document.querySelector(
                                `textarea[value='${s.feedback || ""}']`
                              ) as HTMLTextAreaElement)?.value || ""
                            )
                          }
                          className="px-3 py-1 bg-primary text-white rounded-md hover:bg-primary transition flex items-center gap-1 mx-auto"
                        >
                          <Send size={14} /> Save
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherFeedbackPage;
