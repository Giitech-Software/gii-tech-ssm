import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";
import { saveSubmissionGrade } from "../../services/GradeService";
import {
  ClipboardCheck,
  Star,
  User,
  FileText,
  Loader2,
  BarChart3,
} from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  className?: string;
  classId?: string;
  subject?: string;
  academicYear?: string;
  term?: string;
  termId?: string;
}

interface Submission {
  id: string;
  studentName: string;
  studentId: string;
  assignmentId: string;
  fileUrl?: string;
  submissionUrl?: string;
  grade?: string;
  feedback?: string;
  submittedAt?: string;
}

const TeacherGradesPage: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [grading, setGrading] = useState<string | null>(null);

  // ✅ Load teacher's assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const q = query(
          collection(db, "assignments"),
          where("teacherId", "==", user?.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Assignment[];
        setAssignments(data);
      } catch (error) {
        console.error("Error loading assignments:", error);
        toast.error("Failed to load assignments");
      }
    };
    if (user?.uid) fetchAssignments();
  }, [user]);

  // ✅ Load submissions for selected assignment
  useEffect(() => {
    const fetchSubmissions = async () => {
      if (!selectedAssignment) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, "submissions"),
          where("assignmentId", "==", selectedAssignment),
          orderBy("submittedAt", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
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
  }, [selectedAssignment]);

  // ✅ Handle grade & feedback save
  const handleGradeSubmit = async (
    submissionId: string,
    grade: string,
    feedback: string
  ) => {
    setGrading(submissionId);
    try {
      const assignment = assignments.find((item) => item.id === selectedAssignment);
      const submission = submissions.find((item) => item.id === submissionId);
      if (!assignment || !submission || !user) throw new Error("Unable to resolve grading context.");
      const mark = Number(grade);
      await saveSubmissionGrade(assignment, submission, mark, feedback, user.uid);
      toast.success("Grade saved!");
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === submissionId ? { ...s, grade, feedback, status: "graded" } : s
        )
      );
    } catch (error) {
      console.error("Error saving grade:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save grade");
    } finally {
      setGrading(null);
    }
  };

  // ✅ Calculate quick summary
  const total = submissions.length;
  const graded = submissions.filter((s) => s.grade).length;
  const avgGrade =
    graded > 0
      ? (
          submissions.reduce((sum, s) => sum + (parseFloat(s.grade || "0") || 0), 0) /
          graded
        ).toFixed(1)
      : "—";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <ClipboardCheck className="text-indigo-600" /> Grade Submissions
        </h1>
        <p className="text-gray-600 mt-2">
          Enter grades and feedback for student submissions.
        </p>
      </div>

      {/* Assignment Filter */}
      <div className="bg-white shadow rounded-2xl p-6 mb-6 border border-gray-100">
        <label className="block text-gray-700 font-semibold mb-2">
          Select Assignment:
        </label>
        <select
          value={selectedAssignment}
          onChange={(e) => setSelectedAssignment(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 w-full"
        >
          <option value="">-- Choose Assignment --</option>
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title} {a.className && `(${a.className})`}
            </option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      {selectedAssignment && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 text-white p-5 rounded-2xl shadow">
            <BarChart3 size={24} />
            <p className="mt-2 text-sm">Total Submissions</p>
            <h3 className="text-2xl font-semibold">{total}</h3>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-700 text-white p-5 rounded-2xl shadow">
            <Star size={24} />
            <p className="mt-2 text-sm">Graded</p>
            <h3 className="text-2xl font-semibold">{graded}</h3>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white p-5 rounded-2xl shadow">
            <ClipboardCheck size={24} />
            <p className="mt-2 text-sm">Average Grade</p>
            <h3 className="text-2xl font-semibold">{avgGrade}</h3>
          </div>
        </div>
      )}

      {/* Submissions Table */}
      <div className="bg-white rounded-2xl shadow border border-gray-100">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
            <FileText className="text-blue-500" /> Student Submissions
          </h2>
        </div>

        {!selectedAssignment ? (
          <div className="p-6 text-center text-gray-500">
            Please select an assignment to view submissions.
          </div>
        ) : loading ? (
          <div className="p-6 flex justify-center items-center text-gray-500 gap-2">
            <Loader2 className="animate-spin" /> Loading submissions...
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No submissions found for this assignment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-700">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3">Feedback</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b hover:bg-gray-50 transition duration-150"
                  >
                    <td className="px-4 py-3 flex items-center gap-2">
                      <User size={16} className="text-gray-500" />
                      {s.studentName || s.studentId}
                    </td>
                    <td className="px-4 py-3">
                      {s.submissionUrl || s.fileUrl ? (
                        <a
                          href={s.submissionUrl || s.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          View File
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        defaultValue={s.grade || ""}
                        id={`grade-${s.id}`}
                        placeholder="Grade"
                        className="border border-gray-300 rounded-lg px-2 py-1 w-20 text-center"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        defaultValue={s.feedback || ""}
                        id={`feedback-${s.id}`}
                        placeholder="Feedback"
                        className="border border-gray-300 rounded-lg px-2 py-1 w-40"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          handleGradeSubmit(
                            s.id,
                            (
                              document.getElementById(
                                `grade-${s.id}`
                              ) as HTMLInputElement
                            )?.value,
                            (
                              document.getElementById(
                                `feedback-${s.id}`
                              ) as HTMLInputElement
                            )?.value
                          )
                        }
                        disabled={grading === s.id}
                        className={`px-4 py-1 rounded-lg text-white ${
                          grading === s.id
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {grading === s.id ? "Saving..." : "Save"}
                      </button>
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

export default TeacherGradesPage;
